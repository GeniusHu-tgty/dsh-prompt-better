/**
 * 读取「当前会话在模型选择器里选中的模型」。
 *
 * 为什么需要它（源码依据 @deepseek-ai/dsh-client-ui-model-selection）：
 *   右侧模型座位由该插件注册客户端服务 `ctx.modelDirectories`，
 *   每个会话一份目录：`models.directoryFor(sessionId).store.getSnapshot().current`
 *   就是用户当前看到的 provider/model/reasoningEffort。
 *   它的上游是 Host 的 `modelSelection` 会话投影：selectModel 写 pending，
 *   投影帧再回灌 current —— 所以这是**会话级**、与右侧显示完全一致。
 *
 * 对照：Host 的 `agentDefaultModel.currentSelection()` 读的是 profile 里
 * agent-default-model 条目的**静态默认**（provider/model），与当前选择无关。
 */
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'

/** 一次模型选择。 */
export interface ModelSelection {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** 目录 store 的最小结构（不引入对方包的类型，避免构建期硬依赖）。 */
interface DirectoryStoreLike {
  getSnapshot?: () => { readonly current?: unknown } | undefined
}

/** 服务形态（可选依赖，缺失时返回 undefined）。 */
interface ModelDirectoriesLike {
  directoryFor?: (sessionId: SessionId) => { readonly store?: DirectoryStoreLike } | undefined
}

/** 插件上半可用的 Context 形态（只需要 get）。 */
interface ContextLike {
  get?: (name: string) => unknown
}

/**
 * 读取会话当前的模型选择。
 * @param ctx - client 插件上下文（用 ctx.get 做**可选**依赖查找）。
 * @param sessionId - 目标会话。
 * @returns 选择；服务缺失 / 会话未绑定 / 目录未加载时返回 undefined（由 Host 回退）。
 */
export function readSessionModel(ctx: unknown, sessionId: SessionId): ModelSelection | undefined {
  try {
    const models = (ctx as ContextLike).get?.('modelDirectories') as ModelDirectoriesLike | undefined
    const snapshot = models?.directoryFor?.(sessionId)?.store?.getSnapshot?.()
    const current = snapshot?.current
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    const candidate = current as { provider?: unknown; model?: unknown; reasoningEffort?: unknown }
    if (typeof candidate.provider !== 'string' || candidate.provider === '') return undefined
    if (typeof candidate.model !== 'string' || candidate.model === '') return undefined
    return {
      provider: candidate.provider,
      model: candidate.model,
      ...(typeof candidate.reasoningEffort === 'string' && candidate.reasoningEffort !== ''
        ? { reasoningEffort: candidate.reasoningEffort }
        : {}),
    }
  } catch {
    // 服务缺失、会话无 binding、目录未加载 —— 一律交给 Host 的默认回退。
    return undefined
  }
}
