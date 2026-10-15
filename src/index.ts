/**
 * dsh-prompt-better — Host 面。
 *
 * 增强提示词：把用户输入交给一个一次性（one-shot）scoped agent 做纯文本改写。
 * 设计要点：
 *   - 单轮、无工具、独立 system prompt、跑完即弃（agent dispose）
 *   - 输出净化（剥引号）+ 空结果判失败
 *   - 错误分级：empty_input / timeout / aborted / llm_error / internal
 *
 * 跨半通信：插件自有 HTTP 端点（DSH 第三方插件标准做法）
 *   POST /plugins/dsh-prompt-better/enhance   { text } -> { ok, text } | { ok:false, code, error }
 */
import type { Context } from '@deepseek-ai/cordis'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createUserMessage, ReasoningEffortId } from '@deepseek-ai/dsh-llm'
// 类型边：webServer 的 Context merge（插件自有路由）。
import type {} from '@deepseek-ai/dsh-host-webserver'
// 类型边：agentDefaultModel 的 Context merge（默认模型解析）。
import type {} from '@deepseek-ai/dsh-agent-default-model'

import { SYSTEM_PROMPT, renderUserPrompt, stripWrappingQuotes } from './prompts.ts'

/** 插件配置（可选；在 profile 的 cordis.yml / patch 里配置项直接作为 config 传入 apply）。 */
export interface Config {
  /** 显式钉住 provider（可选；一般不用，交给会话座位）。 */
  provider?: string
  /** 显式钉住模型 id（可选；设置后不再跟随会话座位）。 */
  model?: string
  /** 是否跟随「当前会话在模型选择器里选中的模型」（默认 true）。 */
  followSessionModel?: boolean
  /** 单次增强超时 ms。 */
  timeoutMs: number
}

// 注意：不要导出 Config。
// cordis 的 fiber._resolveConfig 会读取 plugin.Config 并调用 Config["~standard"].validate(config)；
// 一个普通对象没有 "~standard" 属性 → TypeError 崩溃（host fiber 无法激活）。
// 不导出 Config 时 cordis 跳过校验，config 原样传入 apply，默认值在 apply 内兜底。

/** 增强结果。 */
export type EnhanceResult =
  | { ok: true; text: string }
  | { ok: false; code: 'empty_input' | 'timeout' | 'aborted' | 'llm_error' | 'internal' | 'bad_request'; error: string }

/** 端点路径（与 client 半 literal 对齐——两侧各自引用字面量，避免构建漂移）。 */
export const ENHANCE_PATH = '/plugins/dsh-prompt-better/enhance'

/** 一次性会话 id 计数。 */
let oneShotSeq = 0

/** 请求体读取上限（防滥用）。 */
const MAX_BODY_BYTES = 64 * 1024

/** 一个可释放句柄（agents.create 返回 AgentHandle）。 */
interface DisposableHandle { agent?: Agent; dispose?: () => Promise<void> | void }

/** 从 create 返回值取句柄。 */
function asHandle(value: unknown): DisposableHandle | undefined {
  if (value === null || typeof value !== 'object') return undefined
  return value as DisposableHandle
}

/** 插件插件体（cordis 函数式插件）。 */
export const name = 'dsh-prompt-better'

/** 需要的服务：agent 注册表 + web 路由 + 默认模型。 */
export const inject = ['agents', 'webServer', 'agentDefaultModel'] as const

/** cordis 插件入口。 */
export function apply(ctx: Context, config: Partial<Config> = {}): void {
  const pinnedModel = resolvePin(config)
  const followSessionModel = config.followSessionModel !== false
  const timeoutMs = typeof config.timeoutMs === 'number' && config.timeoutMs > 0 ? config.timeoutMs : 120_000

  // 插件自有端点：POST /plugins/dsh-prompt-better/enhance
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ENHANCE_PATH,
    handler: async (req, res) => {
      const write = (status: number, payload: EnhanceResult): void => {
        res.statusCode = status
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify(payload))
      }
      try {
        if (req.method !== 'POST') {
          write(405, { ok: false, code: 'bad_request', error: 'POST required' })
          return
        }
        const raw = await readBody(req)
        if (raw === undefined) {
          write(413, { ok: false, code: 'bad_request', error: 'request body too large' })
          return
        }
        let parsed: { text?: unknown; selection?: unknown }
        try {
          parsed = JSON.parse(raw) as { text?: unknown; selection?: unknown }
        } catch {
          write(400, { ok: false, code: 'bad_request', error: 'invalid JSON body' })
          return
        }
        const result = await enhance(ctx, {
          text: typeof parsed.text === 'string' ? parsed.text : '',
          pinned: pinnedModel,
          followSessionModel,
          selection: readSelection(parsed.selection),
          timeoutMs,
        })
        write(result.ok ? 200 : 200, result)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        ctx.logger?.error?.('[prompt-better] route failure: ' + message)
        write(500, { ok: false, code: 'internal', error: message })
      }
    },
  }), 'dsh-prompt-better: enhance route')
}

/** 读取请求体（带上限）。 */
function readBody(req: { on: (e: string, cb: (chunk?: unknown) => void) => void }): Promise<string | undefined> {
  return new Promise((resolve) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
      size += buf.length
      if (size > MAX_BODY_BYTES) { resolve(undefined); return }
      chunks.push(buf)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', () => resolve(''))
  })
}

/** 一次模型选择（client 随请求带来；结构与 Host 的 modelSelection 投影一致）。 */
export interface ModelSelection {
  provider: string
  model: string
  reasoningEffort?: string
}

/** 插件配置里显式钉住的模型。 */
interface Pin {
  provider?: string
  model: string
}

/** 从插件配置解析显式钉住的模型（未配置则 undefined）。 */
function resolvePin(config: Partial<Config>): Pin | undefined {
  if (typeof config.model !== 'string' || config.model.trim() === '') return undefined
  const provider = typeof config.provider === 'string' && config.provider.trim() !== '' ? config.provider : undefined
  return provider === undefined ? { model: config.model.trim() } : { provider, model: config.model.trim() }
}

/** 校验 client 带来的会话模型选择（非法一律丢弃，交给下层回退）。 */
function readSelection(value: unknown): ModelSelection | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const candidate = value as { provider?: unknown; model?: unknown; reasoningEffort?: unknown }
  if (typeof candidate.provider !== 'string' || candidate.provider.trim() === '') return undefined
  if (typeof candidate.model !== 'string' || candidate.model.trim() === '') return undefined
  return {
    provider: candidate.provider.trim(),
    model: candidate.model.trim(),
    ...(typeof candidate.reasoningEffort === 'string' && candidate.reasoningEffort.trim() !== ''
      ? { reasoningEffort: candidate.reasoningEffort.trim() }
      : {}),
  }
}

/** 一次性 agent 的模型选项。 */
interface AgentModelOptions {
  provider?: string
  model?: string
  reasoningEffort?: ReturnType<typeof ReasoningEffortId>
}

/**
 * 解析一次性 agent 的模型选项 —— **默认跟随右侧模型座位**。
 *
 * 优先级：
 *   1. 插件配置显式钉住（provider/model）—— 仅当部署方主动配置时生效；
 *   2. 客户端带来的**当前会话选择**（右键模型选择器里选中的那个）—— 默认行为；
 *   3. Host 默认模型（agentDefaultModel.currentSelection()，读 profile 静态配置）—— 兜底。
 *
 * @param ctx - 插件上下文。
 * @param input - 本次请求的模型意图。
 * @returns AgentOptions（provider/model 齐备，或空对象让上层报错）。
 */
function resolveAgentOptions(
  ctx: Context,
  input: { pinned?: Pin; followSessionModel: boolean; selection?: ModelSelection },
): AgentModelOptions {
  if (input.pinned !== undefined) {
    return {
      ...(input.pinned.provider !== undefined ? { provider: input.pinned.provider } : {}),
      model: input.pinned.model,
    }
  }
  if (input.followSessionModel && input.selection !== undefined) {
    return {
      provider: input.selection.provider,
      model: input.selection.model,
      ...(input.selection.reasoningEffort !== undefined && input.selection.reasoningEffort !== ''
        ? { reasoningEffort: ReasoningEffortId(input.selection.reasoningEffort) }
        : {}),
    }
  }
  try {
    const fallback = ctx.agentDefaultModel?.currentSelection?.()
    if (fallback !== undefined && typeof fallback.provider === 'string' && typeof fallback.model === 'string') {
      return { provider: fallback.provider, model: fallback.model }
    }
  } catch { /* 服务缺失时留空，由请求层报错 */ }
  return {}
}

/** 一次性改写：创建 scoped agent → followup → 收 committed assistant 文本 → dispose。 */
async function enhance(
  ctx: Context,
  input: { text: string; pinned?: Pin; followSessionModel: boolean; selection?: ModelSelection; timeoutMs: number },
): Promise<EnhanceResult> {
  if (input.text.trim() === '') return { ok: false, code: 'empty_input', error: 'Empty input' }

  let handle: DisposableHandle | undefined
  try {
    // 模型解析：显式配置 > Host 默认模型（agentDefaultModel 服务）。
    // 一次性 agent 没有会话级模型选择，必须显式给出 provider/model，否则请求阶段报错。
    const agentOptions = resolveAgentOptions(ctx, input)
    const created = await ctx.agents.create({
      sessionId: SessionId('prompt-better-' + Date.now().toString(36) + '-' + (++oneShotSeq).toString(36)),
      // cwd 必须给：systemPrompt 的 {{cwd}} 变量取 session.header.cwd，
      // 缺值会让任何含 {{cwd}} 的 section 在装配时抛错（profile 的 persona 常含 {{cwd}}）。
      meta: { origin: 'subagent', delegationDepth: 1, cwd: process.cwd() },
      agentOptions,
      setup: (agentCtx) => {
        // 一次性纯文本改写：拒绝一切工具调用（permission-gate 钩子）。
        agentCtx.on('tools/pre-execute' as never, (async () => ({
          kind: 'deny',
          reason: 'prompt-better: one-shot text rewrite, tools disabled',
        })) as never)
        // 独立 persona：complete section 取代整个默认 system prompt。
        agentCtx.systemPrompt.section({
          name: 'prompt-better-role',
          order: -100,
          complete: true,
          text: SYSTEM_PROMPT,
        })
      },
    })
    handle = asHandle(created)
    const agent = (handle?.agent ?? created) as Agent
    return await runOneShot(ctx, agent, renderUserPrompt(input.text), input.timeoutMs)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ctx.logger?.error?.('[prompt-better] one-shot failed: ' + message)
    return { ok: false, code: 'internal', error: message }
  } finally {
    try { await handle?.dispose?.() } catch { /* 回收失败不掩盖业务结果 */ }
  }
}

/** followup + 监听 session 事件直到 assistant/message 文本 + turn/end 收敛。 */
function runOneShot(ctx: Context, agent: Agent, userPrompt: string, timeoutMs: number): Promise<EnhanceResult> {
  return new Promise<EnhanceResult>((resolve) => {
    let settled = false
    let collected = ''
    let timer: ReturnType<typeof setTimeout> | undefined
    const disposers: Array<() => void> = []

    const finish = (result: EnhanceResult): void => {
      if (settled) return
      settled = true
      if (timer !== undefined) clearTimeout(timer)
      for (const d of disposers) { try { d() } catch { /* noop */ } }
      resolve(result)
    }

    const session = agent.session

    timer = setTimeout(() => {
      finish({ ok: false, code: 'timeout', error: 'enhance timed out after ' + timeoutMs + 'ms' })
    }, timeoutMs)

    // committed assistant 文本（ACP 同款：只取 assistant/message 的 text 块；turn/end 收敛）。
    disposers.push(ctx.on('session/event' as never, ((sess: unknown, event: {
      type: string
      data: { message?: { content: Array<{ type: string; text?: string }> }; reason?: { kind: string; error?: { message?: string } } }
    }) => {
      if (sess !== session || settled) return
      if (event.type === 'assistant/message') {
        for (const block of event.data.message?.content ?? []) {
          if (block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) collected += block.text
        }
      } else if (event.type === 'turn/end') {
        const reason = event.data.reason
        if (reason?.kind === 'error') {
          finish({ ok: false, code: 'llm_error', error: 'turn failed: ' + (reason.error?.message ?? 'unknown') })
        } else if (reason?.kind === 'aborted') {
          finish({ ok: false, code: 'aborted', error: 'Turn aborted' })
        } else {
          const cleaned = stripWrappingQuotes(collected)
          if (cleaned.trim() === '') finish({ ok: false, code: 'llm_error', error: 'Enhanced result is empty' })
          else finish({ ok: true, text: cleaned })
        }
      }
    }) as never))

    agent.followup(createUserMessage({
      content: [{ type: 'text', text: userPrompt }],
      source: { kind: 'user' },
    }))
  })
}