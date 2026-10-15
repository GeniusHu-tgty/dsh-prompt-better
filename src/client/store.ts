/**
 * 会话维度状态机。
 *
 * 关键机制：
 *   1. backup: { before, after } —— 同时保存原文与增强结果，用于分歧比对与恢复
 *   2. hasEnhanced —— 当前草稿是否就是增强结果（决定按钮显示"恢复原文"还是"增强提示词"）
 *   3. 分歧检测（divergence）—— 草稿与 after 不等时清空 hasEnhanced + backup。
 *      这是修复「增强后删掉再粘贴新内容，按钮仍显示恢复」的关键。
 *   4. 抑制计数（suppress）—— 我方写入草稿（应用结果/恢复原文）时不触发分歧检测。
 */
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'

/** 一次增强的快照：原文 + 增强结果。 */
export interface EnhanceBackup {
  /** 增强前的原文（恢复用；草稿含引用 chip 时为剥掉 chip 标签的纯文本）。 */
  readonly before: string
  /** 增强后实际落到草稿里的文本（分歧比对用）。 */
  readonly after: string
  /** 增强时草稿是否含引用 chip（决定恢复走区间替换还是全量写入）。 */
  readonly hadChips?: boolean
}

/** 会话状态。 */
export interface EnhanceState {
  /** 请求进行中（显示转圈，可取消）。 */
  readonly enhancing: boolean
  /** 当前草稿就是增强结果（显示"恢复原文"）。 */
  readonly hasEnhanced: boolean
  /** 增强快照；分歧或恢复后清空。 */
  backup?: EnhanceBackup
  errorMessage?: string
  /** 请求中止器。 */
  abort?: AbortController
  /**
   * 我方即将写入的草稿值（值比对抑制）。
   *
   * 用"期望值比对"替代"计数"：值比对是幂等的 —— 即使写完草稿值恰好未变，
   * 也不会残留吞掉下一次真实编辑（计数方案会有残留漏判）。
   */
  expectedDraft?: string
  /** 最近一次已知草稿。 */
  lastDraft: string
}

/** 初始状态。 */
export const INITIAL: EnhanceState = { enhancing: false, hasEnhanced: false, lastDraft: '' }

type Listener = (state: EnhanceState) => void

const states = new Map<string, EnhanceState>()
const listeners = new Map<string, Set<Listener>>()

/** 读取会话状态。 */
export function getState(sessionId: SessionId | undefined): EnhanceState {
  return sessionId === undefined ? INITIAL : states.get(sessionId) ?? INITIAL
}

/** 订阅会话状态变化。 */
export function subscribe(sessionId: SessionId, listener: Listener): () => void {
  let set = listeners.get(sessionId)
  if (set === undefined) {
    set = new Set()
    listeners.set(sessionId, set)
  }
  set.add(listener)
  return () => { set.delete(listener) }
}

/** 局部更新（引用不变时跳过通知）。 */
export function patch(sessionId: SessionId, partial: Partial<EnhanceState>): void {
  const current = states.get(sessionId) ?? INITIAL
  const next = { ...current, ...partial }
  const keys = Object.keys(next) as Array<keyof EnhanceState>
  if (keys.every(k => current[k] === next[k])) return
  states.set(sessionId, next)
  listeners.get(sessionId)?.forEach(l => l(next))
}

/** 清空会话状态（会话销毁 / 草稿清空时）。 */
export function clearSession(sessionId: SessionId): void {
  states.delete(sessionId)
  listeners.get(sessionId)?.forEach(l => l(INITIAL))
}

/**
 * 声明"我方即将写入这个草稿值"（值比对抑制，幂等）。
 * 在下一次草稿变化通知到达时，若值相等则视为我方写入、跳过分歧判定。
 *
 * @param sessionId - 会话标识。
 * @param draft - 即将写入的草稿值。
 */
export function suppressNextDraft(sessionId: SessionId, draft: string): void {
  patch(sessionId, { expectedDraft: draft })
}

/**
 * 草稿变化通知（含值比对抑制）。
 *
 * @returns 本次变化是否被抑制（我方写入）。
 */
export function notifyDraftChanged(sessionId: SessionId, draft: string): boolean {
  const state = getState(sessionId)
  // 我方写入：值命中期望 → 消费期望并跳过。
  if (state.expectedDraft !== undefined && state.expectedDraft === draft) {
    patch(sessionId, { expectedDraft: undefined, lastDraft: draft })
    return true
  }
  onContentDiverged(sessionId, draft)
  return false
}

/**
 * 分歧判定核心。
 *
 * 草稿变化时调用：
 *   - 草稿 === 增强结果  → 确保 hasEnhanced = true（用户改回原样）
 *   - 草稿 !== 增强结果  → 清空 hasEnhanced + backup（用户改动过，增强态失效）
 *
 * @param sessionId - 会话标识。
 * @param draft - 当前草稿（含空白）。
 */
export function onContentDiverged(sessionId: SessionId, draft: string): void {
  const state = getState(sessionId)
  // 记录已知草稿（抑制护栏用）。
  if (state.lastDraft !== draft) patch(sessionId, { lastDraft: draft })
  // 无备份（从未增强 / 已清）直接返回，不做任何事。
  if (state.backup === undefined) return
  const normalized = draft.replace(/\u200B/g, '').trim()
  const isStillEnhanced = normalized === state.backup.after.trim()
  if (isStillEnhanced) {
    if (!state.hasEnhanced) patch(sessionId, { hasEnhanced: true })
    return
  }
  // 分歧：增强结果已被改动/删除 → 恢复成初始（只保留 suppress）。
  patch(sessionId, {
    hasEnhanced: false,
    backup: undefined,
    errorMessage: undefined,
  })
}

/** 竞速：signal abort 立即拒绝，不等网络。 */
export class EnhanceAbortedError extends Error {
  constructor() {
    super('prompt-better-aborted-by-user')
    this.name = 'AbortError'
  }
}

/** 竞速：外部取消立即拒绝。 */
export function raceWithAbortSignal<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (signal === undefined) return promise
  if (signal.aborted) return Promise.reject(new EnhanceAbortedError())
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => { cleanup(); reject(new EnhanceAbortedError()) }
    const cleanup = (): void => { signal.removeEventListener('abort', onAbort) }
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      value => { cleanup(); resolve(value) },
      error => { cleanup(); reject(error) },
    )
  })
}