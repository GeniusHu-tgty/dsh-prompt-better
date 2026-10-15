/**
 * 跨半通信：fetch 插件自有端点。
 * 端点由 host 半注册（webServer.register，exact path），与 src/index.ts 的 ENHANCE_PATH 字面量对齐。
 */
import type { ModelSelection } from './model.ts'

/** 端点路径（与 host 半字面量一致）。 */
export const ENHANCE_PATH = '/plugins/dsh-prompt-better/enhance'

/** 增强结果（与 host 判别联合对齐）。 */
export type EnhanceResult =
  | { ok: true; text: string }
  | { ok: false; code: string; error: string }

/** 用户主动取消标记。 */
export class EnhanceAbortedError extends Error {
  constructor() {
    super('prompt-better-aborted-by-user')
    this.name = 'AbortError'
  }
}

/** 竞速：signal abort 立即拒绝，不等网络。 */
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

/**
 * 发起一次增强请求。
 * @param text - 待改写的纯文本（已剥离引用 chip 标签）。
 * @param signal - 取消信号。
 * @param selection - 当前会话选中的模型（右侧座位）；缺省时 Host 走默认回退。
 */
export async function requestEnhance(
  text: string,
  signal?: AbortSignal,
  selection?: ModelSelection,
): Promise<EnhanceResult> {
  const response = await fetch(ENHANCE_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selection === undefined ? { text } : { text, selection }),
    ...(signal !== undefined ? { signal } : {}),
  })
  const payload = (await response.json()) as EnhanceResult
  if (typeof payload !== 'object' || payload === null || typeof (payload as { ok?: unknown }).ok !== 'boolean') {
    return { ok: false, code: 'bad_response', error: 'unexpected response from enhance endpoint' }
  }
  return payload
}
