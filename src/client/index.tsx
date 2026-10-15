/**
 * dsh-prompt-better — Client 面。
 *
 * 注册 conversation.input.right slot（发送键左侧，官方零占用位）。
 * 契约严格对齐 ui-goal / ui-commands：
 *   register({ name, id, order, locale: NS, inject: (sessionId) => ({...}) }, Component)
 * 组件 props = inject 面 + 框架标准件（sessionId / useInput / inputActions）+ t（locale 命名空间）
 *
 * 跨半通信：fetch 插件自有端点（DSH 第三方插件的标准模式）。
 */
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
// 类型边：拉起 conversation 的 SlotMap 声明与 SessionStandardProps（useInput / inputActions）。
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// 类型边：locale 插件的 Context merge。
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import {
  IconSparkleMedium, IconRefreshOutlineMedium, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useEffect, useSyncExternalStore } from 'react'

import { Spinner } from './Spinner.tsx'
import { injectStyles } from './styles.ts'

import { zh, en, type EnhanceKey } from './locales.ts'
import { requestEnhance, raceWithAbortSignal, EnhanceAbortedError } from './service.ts'
import { readSessionModel, type ModelSelection } from './model.ts'
import { getState, notifyDraftChanged, patch, subscribe } from './store.ts'
import { plainText, textSpans, type OccurrenceLike, type Span } from './spans.ts'

/** cordis 稳定插件名。 */
export const name = 'dsh-prompt-better'

/** 需要的服务：slots 注册 + locale 字典。 */
export const inject = ['slots', 'locale'] as const

/** 本插件文案命名空间（LocaleNamespaceMap 合并）。 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    enhancePrompt: EnhanceKey
  }
}

/** 文案字典。 */
const dictionaries = { zh, en }

/** 会话 → 最近一次渲染的 draftRev（写入用；insertText 会校验它）。 */
const revCache = new Map<SessionId, number>()
/** 会话 → 最近一次渲染的草稿（clipboard 投影）。 */
const draftCache = new Map<SessionId, string>()
/** 会话 → 最近一次渲染的引用 chip 表。 */
const occCache = new Map<SessionId, readonly OccurrenceLike[]>()

/** 一次写入所需的 span（detect 坐标 + 该次校验用的 rev）。 */
interface RevSpan extends Span {
  readonly draftRev: number
}

/** Client 插件入口。 */
export function apply(ctx: unknown): void {
  const c = ctx as {
    effect(fn: () => void | (() => void), label: string): void
    locale: { register(ns: string, dict: unknown): void }
    slots: {
      inject(name: string, cb: () => () => void): void
      register(options: unknown, component: unknown): () => void
    }
  }

  c.effect(() => c.locale.register('enhancePrompt', dictionaries), 'prompt-better: dictionaries')
  // 注入插件样式（转圈动画 + 按钮过渡；卸载时清理）。
  c.effect(() => injectStyles(), 'prompt-better: styles')

  c.slots.inject('conversation.input.right', () => c.slots.register({
    name: 'conversation.input.right',
    id: 'prompt-better',
    order: 20,
    locale: 'enhancePrompt',
    // readModel 闭包捕获 client ctx：按需读取本会话在模型选择器里选中的模型
    // （可选依赖；服务缺失时返回 undefined，由 Host 端回退）。
    inject: (sessionId: SessionId) => ({ sessionId, readModel: () => readSessionModel(c, sessionId) }),
  }, EnhanceButton))
}

/** 输入机状态（本插件只读这些项；结构与框架 InputState 兼容）。 */
interface InputStateLike {
  readonly draft: string
  readonly draftRev: number
  /** 草稿附件 id（文件/图片等；独立于草稿文本）。 */
  readonly attachmentIds?: readonly string[]
  /** 引用 chip 表（offset/length 为 clipboard 坐标）。 */
  readonly occurrences?: readonly OccurrenceLike[]
}

/** inject 面 props。 */
interface EnhanceInjected {
  sessionId: SessionId
  /** 读取本会话当前选中的模型（右侧模型座位）。 */
  readModel: () => ModelSelection | undefined
}

/** 输入机写入面（框架 InputActions 的子集）。 */
interface InputActionsLike {
  setDraft(text: string): void
  /** 区间替换：只动 detect 坐标 [start,end)，区间外的节点（含 chip）保留。 */
  insertText(text: string, span: RevSpan): boolean
}

/** 三态按钮：增强 / 取消 / 恢复原文。 */
function EnhanceButton(
  props: EnhanceInjected & {
    // 框架标准件：SnapshotSelectorHook —— 必须传 selector 读取状态
    useInput: <T>(selector: (state: InputStateLike) => T) => T
    inputActions: InputActionsLike
  } & PropsLocale<'enhancePrompt'>,
): React.ReactNode {
  const { sessionId, readModel, useInput, inputActions, t } = props
  // 注意：框架的 useInput 是 SnapshotSelectorHook —— 必须传 selector（不传会让内部
  // useSyncExternalStoreWithSelector 拿到 undefined 选择器而崩溃：'l is not a function'）。
  const input = useInput(s => s)
  const state = useSyncExternalStore(
    cb => subscribe(sessionId, cb),
    () => getState(sessionId),
    () => getState(sessionId),
  )

  // 分歧检测：草稿变化时判定增强态是否还有效。
  const draft = input.draft
  useEffect(() => {
    const suppressed = notifyDraftChanged(sessionId, draft)
    // 非我方写入的草稿变化 = 外部动作（发送清空 / 用户改写）。
    // 此时进行中的增强已与目标草稿脱节 → 取消它，避免转圈状态残留。
    if (!suppressed) {
      const current = getState(sessionId)
      if (current.enhancing && current.abort !== undefined && !current.abort.signal.aborted) {
        current.abort.abort()
        patch(sessionId, { enhancing: false, abort: undefined })
      }
    }
  }, [sessionId, draft])

  // 渲染期刷新实时快照（触发与写入时都读这里）。
  revCache.set(sessionId, input.draftRev)
  draftCache.set(sessionId, input.draft)
  occCache.set(sessionId, input.occurrences ?? [])

  const showingCancel = state.enhancing
  const showingRevert = !state.enhancing && state.hasEnhanced
  // 空草稿且非加载中：不渲染（零占位）。
  if (!state.enhancing && input.draft.trim() === '') return null

  // 错误信息优先展示在 tooltip（errorMessage || 默认文案）。
  const label = state.errorMessage !== undefined && state.errorMessage !== ''
    ? state.errorMessage
    : state.enhancing ? t('enhancing') : showingRevert ? t('revert') : t('title')
  const onClick = showingCancel
    ? () => handleCancel(sessionId)
    : showingRevert
      ? () => { void handleRevert(sessionId, inputActions) }
      : () => { void triggerEnhance(sessionId, inputActions, t, readModel) }

  const phase = state.enhancing ? 'enhancing' : showingRevert ? 'revert' : 'idle'
  return (
    <Tooltip label={label} side="top" delayMs={500}>
      <button
        type="button"
        className="pb-button"
        data-enhance-button=""
        data-phase={phase}
        aria-label={label}
        aria-busy={state.enhancing || undefined}
        onClick={onClick}
      >
        {state.enhancing
          ? <Spinner size={16} />
          : showingRevert
            ? <IconRefreshOutlineMedium size={16} />
            : <IconSparkleMedium size={16} />}
      </button>
    </Tooltip>
  )
}

type Translate = (key: EnhanceKey) => string

/**
 * 等一次渲染带来的新 draftRev（每次编辑后 rev 自增）。
 * @returns 新 rev；超时返回 undefined。
 */
async function waitForRev(sessionId: SessionId, previous: number): Promise<number | undefined> {
  const deadline = Date.now() + 600
  while (Date.now() < deadline) {
    const current = revCache.get(sessionId)
    if (current !== undefined && current !== previous) return current
    await new Promise(resolve => setTimeout(resolve, 16))
  }
  return undefined
}

/**
 * 按区间写入（**保留 chip 节点**）。
 *
 * 结果布局（非文本块 → 然后是文本块）：
 * 文本放进最后一个文本区间，更早的文本区间清空。
 * 从后往前替换 —— 后面的编辑不会让前面的 detect 坐标失效。
 *
 * @returns 是否全部写入成功。
 */
async function writeAcrossSpans(
  sessionId: SessionId,
  spans: readonly Span[],
  text: string,
  inputActions: InputActionsLike,
): Promise<boolean> {
  if (spans.length === 0) return false
  let rev = revCache.get(sessionId)
  if (rev === undefined) return false
  for (let index = spans.length - 1; index >= 0; index -= 1) {
    const span = spans[index]
    const payload = index === spans.length - 1 ? text : ''
    if (!inputActions.insertText(payload, { start: span.start, end: span.end, draftRev: rev })) return false
    const next = await waitForRev(sessionId, rev)
    if (index > 0) {
      if (next === undefined) return false
      rev = next
    }
  }
  return true
}

/** 读一次编辑后的实际草稿（等一帧渲染，超时回退到本地推算）。 */
async function readSettledDraft(sessionId: SessionId, fallback: string): Promise<string> {
  const deadline = Date.now() + 300
  while (Date.now() < deadline) {
    const current = draftCache.get(sessionId)
    if (current !== undefined) return current
    await new Promise(resolve => setTimeout(resolve, 16))
  }
  return fallback
}

/** 触发增强。 */
async function triggerEnhance(
  sessionId: SessionId,
  inputActions: InputActionsLike,
  t: Translate,
  readModel: () => ModelSelection | undefined,
): Promise<void> {
  const draft = draftCache.get(sessionId) ?? ''
  const occurrences = occCache.get(sessionId) ?? []
  // 送给模型的文本：剥掉 chip 标签（chip 是附件引用，由节点自身表达，不进请求）。
  const text = plainText(draft, occurrences)
  if (text === '') return

  const current = getState(sessionId)
  current.abort?.abort()
  const controller = new AbortController()
  // 触发时只置 enhancing（backup 在成功后才写入）。
  patch(sessionId, { enhancing: true, errorMessage: undefined, abort: controller })
  const isCurrent = (): boolean => getState(sessionId).abort === controller

  try {
    // 模型跟随右侧座位：点击瞬间读取本会话在模型选择器里的当前选择（与界面显示一致）。
    const selection = readModel()
    const result = await raceWithAbortSignal(requestEnhance(text, controller.signal, selection), controller.signal)
    if (controller.signal.aborted || !isCurrent()) return
    if (!result.ok) {
      // 失败降级：草稿不动，只提示。
      patch(sessionId, { enhancing: false, errorMessage: result.error, abort: undefined })
      return
    }
    if (result.text === text) {
      patch(sessionId, { enhancing: false, abort: undefined })
      return
    }

    // 写入（chip 存在时走区间替换，chip 节点存活 → 附件不丢）。
    let wrote: boolean
    if (occurrences.length === 0) {
      // 无引用 chip：setDraft 是等价的（文档里没有需要保护的节点）。
      inputActions.setDraft(result.text)
      wrote = true
    } else {
      wrote = await writeAcrossSpans(sessionId, textSpans(draft, occurrences), result.text, inputActions)
      if (!wrote) {
        // 区间写入失败（布局在请求期间变了）→ 放弃写入，避免破坏草稿。
        patch(sessionId, { enhancing: false, abort: undefined })
        return
      }
    }

    // 读回实际草稿作为分歧基准（必须在写入之后、置 hasEnhanced 之前）。
    const settled = await readSettledDraft(sessionId, wrote && occurrences.length > 0 ? draft : result.text)
    patch(sessionId, {
      enhancing: false,
      hasEnhanced: true,
      backup: { before: text, after: settled, hadChips: occurrences.length > 0 },
      abort: undefined,
    })
  } catch (error) {
    if (!isCurrent()) return
    if (controller.signal.aborted || error instanceof EnhanceAbortedError || (error instanceof Error && error.name === 'AbortError')) {
      patch(sessionId, { enhancing: false, abort: undefined })
      return
    }
    patch(sessionId, {
      enhancing: false,
      abort: undefined,
      errorMessage: error instanceof Error ? error.message : t('failed'),
    })
  }
}

/** 取消进行中的增强。 */
function handleCancel(sessionId: SessionId): void {
  const state = getState(sessionId)
  if (!state.enhancing) return
  state.abort?.abort()
  revCache.delete(sessionId)
  patch(sessionId, { enhancing: false, abort: undefined })
}

/** 恢复原文。 */
async function handleRevert(sessionId: SessionId, inputActions: InputActionsLike): Promise<void> {
  const state = getState(sessionId)
  const backup = state.backup
  if (backup === undefined) return
  if (backup.hadChips === true) {
    // 有引用 chip：同样按区间回写原文，chip 保持不动。
    const occurrences = occCache.get(sessionId) ?? []
    const draft = draftCache.get(sessionId) ?? ''
    const ok = await writeAcrossSpans(sessionId, textSpans(draft, occurrences), backup.before, inputActions)
    if (!ok) return
  } else {
    inputActions.setDraft(backup.before)
  }
  patch(sessionId, { hasEnhanced: false, backup: undefined, errorMessage: undefined })
}
