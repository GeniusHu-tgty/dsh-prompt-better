// tsc-out/index.js
import { SessionId } from "@deepseek-ai/dsh-session";
import { createUserMessage, ReasoningEffortId } from "@deepseek-ai/dsh-llm";

// tsc-out/prompts.js
var SYSTEM_PROMPT = `You are a Prompt Engineering Expert specializing in improving user prompts for a development code assistant. When given a prompt, analyze and enhance it to create a more effective version while maintaining its core purpose. The requests are being made to an AI assistant that specializes in writing code.

	TASK: When given a prompt, analyze and enhance it to create a more effective version while maintaining its core purpose. The requests are being made to an AI assistant that specializes in writing code.

	ANALYSIS PROCESS:

	Evaluate the original prompt:
	Identify the main objective
	Note any ambiguities or gaps
	Assess the clarity of instructions
	Check for missing context
	Apply these prompt engineering principles:
	Write clear, specific instructions
	Include necessary context
	Set explicit parameters and constraints
	Structure the output format
	Add relevant examples
	Match tone and complexity to the use case
	Remove redundant information
	Create the enhanced version:
	Maintain the original goal
	Incorporate identified improvements
	Ensure clarity and completeness
	Be realistic in the features to add
	Do NOT request guides/how-tos unless the user asks
	Do NOT ask for code snippets
	Do NOT suggest specific technologies unless mentioned in the user's prompt
	Do NOT explain HOW to do things, focus on WHAT
	Do NOT answer questions - expand/rewrite them to be more detailed
	IMPORTANT CONSTRAINTS:
	1. Language matching is the highest priority - You MUST strictly respond in the exact same language as the user's input. If the user writes in Chinese, respond in Chinese; if the user writes in English, respond in English; if the user uses another language, respond in that same language. Do not mix languages unless the user's input itself mixes languages.
	2. Keep the enhanced prompt concise - maximum length should be around 800 characters
	FORMAT: Provide only the enhanced prompt with no additional commentary.

	Example:
	"A website for my dog"

	Enhanced prompt:
	"Design a personalized website dedicated to showcasing my dog. Include sections such as a photo gallery, a biography detailing the dog's breed, age, and personality traits, and a blog for sharing stories or updates about your dog's adventures. Add a contact form for visitors to reach out with questions or comments. Ensure the website is visually appealing and easy to navigate, with a responsive design that works well on both desktop and mobile devices."

	Example:
	"Convert this to a friendly tone, maintain technical details but reduce bullets in favor of narrative. Remove any jargon like 'the router service'. Use canvas"

	Enhanced prompt:
	"Transform the provided content into a friendly narrative format while preserving all technical details. Minimize bullet points in favor of flowing prose. Eliminate any technical jargon such as 'the router service'. Incorporate the concept of using canvas elements naturally within the narrative structure to enhance the technical explanation."
    `;
var USER_TEMPLATE = `You are a prompt enhancement assistant. Improve the user prompt while preserving its intent and language.

    USER INPUT:
    {input}
    
    TASK:
    Rewrite the user input into a clearer, more specific prompt for the target AI assistant.

    CRITICAL PRIORITY - LANGUAGE CONSISTENCY:
    1. You MUST detect the language of the user input above and write the enhanced prompt in that same language.
    2. If the user writes in Chinese, the enhanced prompt MUST be entirely in Chinese.
    3. If the user writes in English, the enhanced prompt MUST be entirely in English.
    4. If the user writes in any other language, the enhanced prompt MUST use that exact same language.
    5. If the user mixes languages, keep a natural matching mix. Do not translate the user's intent into a single language.
    6. These language rules are behavior instructions only; never include language analysis or language labels in the output.
    
    ENHANCEMENT REQUIREMENTS:
    1. Return only the enhanced prompt text; do not add explanations, prefaces, markdown fences, labels, or analysis.
    2. Do not include language labels or meta notes such as "User input is in Chinese" or "Response must be in Chinese".
    3. Preserve the user's original intent, topic, constraints, and target output type. Do not answer the request.
    4. Always make a substantive enhancement when possible: clarify the task, scope, constraints, and expected output.
    5. If the original prompt is already clear, lightly polish it instead of returning it unchanged.
    6. Keep the enhanced prompt complete and concise. Do not end with an unfinished list, dangling conjunction, or trailing colon.
    7. Do not add unrelated requirements, unsupported facts, or unnecessary sections.

    EXAMPLES:
    User input (Chinese): "\u8BF7\u5E2E\u6211\u89E3\u91CA\u8FD9\u6BB5\u4EE3\u7801\u7684\u529F\u80FD"
    Enhanced prompt: "\u8BF7\u89E3\u91CA\u8FD9\u6BB5\u4EE3\u7801\u7684\u4E3B\u8981\u529F\u80FD\u3001\u6267\u884C\u6D41\u7A0B\u548C\u5173\u952E\u903B\u8F91\uFF0C\u5E76\u6307\u51FA\u53EF\u80FD\u9700\u8981\u6CE8\u610F\u7684\u8FB9\u754C\u60C5\u51B5\u3002"

    User input (English): "Please explain what this code does"
    Enhanced prompt: "Explain what this code does, including its main purpose, key control flow, and any important edge cases."

    User input (Mixed): "\u8FD9\u6BB5\u4EE3\u7801\u6709 bug\uFF0Ccan you help me fix it?"
    Enhanced prompt: "\u8BF7\u5206\u6790\u8FD9\u6BB5\u4EE3\u7801\u4E2D\u7684 bug\uFF0Cexplain the root cause, and provide a minimal fix with necessary verification steps."

    BAD OUTPUT EXAMPLE:
    User input is in Chinese \u2192 Response must be in Chinese.
    \u8BF7\u89E3\u91CA\u8FD9\u6BB5\u4EE3\u7801\u7684\u4E3B\u8981\u529F\u80FD

    GOOD OUTPUT EXAMPLE:
    \u8BF7\u89E3\u91CA\u8FD9\u6BB5\u4EE3\u7801\u7684\u4E3B\u8981\u529F\u80FD\u3001\u6267\u884C\u6D41\u7A0B\u548C\u5173\u952E\u903B\u8F91\uFF0C\u5E76\u6307\u51FA\u53EF\u80FD\u9700\u8981\u6CE8\u610F\u7684\u8FB9\u754C\u60C5\u51B5\u3002
    `;
function renderUserPrompt(input) {
  return USER_TEMPLATE.replace("{input}", input);
}
function stripWrappingQuotes(text) {
  return text.trim().replace(/^["'“”‘’]|["'“”‘’]$/g, "");
}

// tsc-out/index.js
var ENHANCE_PATH = "/plugins/dsh-prompt-better/enhance";
var oneShotSeq = 0;
var MAX_BODY_BYTES = 64 * 1024;
function asHandle(value) {
  if (value === null || typeof value !== "object")
    return void 0;
  return value;
}
var name = "dsh-prompt-better";
var inject = ["agents", "webServer", "agentDefaultModel"];
function apply(ctx, config = {}) {
  const pinnedModel = resolvePin(config);
  const followSessionModel = config.followSessionModel !== false;
  const timeoutMs = typeof config.timeoutMs === "number" && config.timeoutMs > 0 ? config.timeoutMs : 12e4;
  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: ENHANCE_PATH,
    handler: async (req, res) => {
      const write = (status, payload) => {
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(payload));
      };
      try {
        if (req.method !== "POST") {
          write(405, { ok: false, code: "bad_request", error: "POST required" });
          return;
        }
        const raw = await readBody(req);
        if (raw === void 0) {
          write(413, { ok: false, code: "bad_request", error: "request body too large" });
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          write(400, { ok: false, code: "bad_request", error: "invalid JSON body" });
          return;
        }
        const result = await enhance(ctx, {
          text: typeof parsed.text === "string" ? parsed.text : "",
          pinned: pinnedModel,
          followSessionModel,
          selection: readSelection(parsed.selection),
          timeoutMs
        });
        write(result.ok ? 200 : 200, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.logger?.error?.("[prompt-better] route failure: " + message);
        write(500, { ok: false, code: "internal", error: message });
      }
    }
  }), "dsh-prompt-better: enhance route");
}
function readBody(req) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      size += buf.length;
      if (size > MAX_BODY_BYTES) {
        resolve(void 0);
        return;
      }
      chunks.push(buf);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", () => resolve(""));
  });
}
function resolvePin(config) {
  if (typeof config.model !== "string" || config.model.trim() === "")
    return void 0;
  const provider = typeof config.provider === "string" && config.provider.trim() !== "" ? config.provider : void 0;
  return provider === void 0 ? { model: config.model.trim() } : { provider, model: config.model.trim() };
}
function readSelection(value) {
  if (value === null || typeof value !== "object")
    return void 0;
  const candidate = value;
  if (typeof candidate.provider !== "string" || candidate.provider.trim() === "")
    return void 0;
  if (typeof candidate.model !== "string" || candidate.model.trim() === "")
    return void 0;
  return {
    provider: candidate.provider.trim(),
    model: candidate.model.trim(),
    ...typeof candidate.reasoningEffort === "string" && candidate.reasoningEffort.trim() !== "" ? { reasoningEffort: candidate.reasoningEffort.trim() } : {}
  };
}
function resolveAgentOptions(ctx, input) {
  if (input.pinned !== void 0) {
    return {
      ...input.pinned.provider !== void 0 ? { provider: input.pinned.provider } : {},
      model: input.pinned.model
    };
  }
  if (input.followSessionModel && input.selection !== void 0) {
    return {
      provider: input.selection.provider,
      model: input.selection.model,
      ...input.selection.reasoningEffort !== void 0 && input.selection.reasoningEffort !== "" ? { reasoningEffort: ReasoningEffortId(input.selection.reasoningEffort) } : {}
    };
  }
  try {
    const fallback = ctx.agentDefaultModel?.currentSelection?.();
    if (fallback !== void 0 && typeof fallback.provider === "string" && typeof fallback.model === "string") {
      return { provider: fallback.provider, model: fallback.model };
    }
  } catch {
  }
  return {};
}
async function enhance(ctx, input) {
  if (input.text.trim() === "")
    return { ok: false, code: "empty_input", error: "Empty input" };
  let handle;
  try {
    const agentOptions = resolveAgentOptions(ctx, input);
    const created = await ctx.agents.create({
      sessionId: SessionId("prompt-better-" + Date.now().toString(36) + "-" + (++oneShotSeq).toString(36)),
      // cwd 必须给：systemPrompt 的 {{cwd}} 变量取 session.header.cwd，
      // 缺值会让任何含 {{cwd}} 的 section 在装配时抛错（profile 的 persona 常含 {{cwd}}）。
      meta: { origin: "subagent", delegationDepth: 1, cwd: process.cwd() },
      agentOptions,
      setup: (agentCtx) => {
        agentCtx.on("tools/pre-execute", (async () => ({
          kind: "deny",
          reason: "prompt-better: one-shot text rewrite, tools disabled"
        })));
        agentCtx.systemPrompt.section({
          name: "prompt-better-role",
          order: -100,
          complete: true,
          text: SYSTEM_PROMPT
        });
      }
    });
    handle = asHandle(created);
    const agent = handle?.agent ?? created;
    return await runOneShot(ctx, agent, renderUserPrompt(input.text), input.timeoutMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.logger?.error?.("[prompt-better] one-shot failed: " + message);
    return { ok: false, code: "internal", error: message };
  } finally {
    try {
      await handle?.dispose?.();
    } catch {
    }
  }
}
function runOneShot(ctx, agent, userPrompt, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    let collected = "";
    let timer;
    const disposers = [];
    const finish = (result) => {
      if (settled)
        return;
      settled = true;
      if (timer !== void 0)
        clearTimeout(timer);
      for (const d of disposers) {
        try {
          d();
        } catch {
        }
      }
      resolve(result);
    };
    const session = agent.session;
    timer = setTimeout(() => {
      finish({ ok: false, code: "timeout", error: "enhance timed out after " + timeoutMs + "ms" });
    }, timeoutMs);
    disposers.push(ctx.on("session/event", ((sess, event) => {
      if (sess !== session || settled)
        return;
      if (event.type === "assistant/message") {
        for (const block of event.data.message?.content ?? []) {
          if (block.type === "text" && typeof block.text === "string" && block.text.length > 0)
            collected += block.text;
        }
      } else if (event.type === "turn/end") {
        const reason = event.data.reason;
        if (reason?.kind === "error") {
          finish({ ok: false, code: "llm_error", error: "turn failed: " + (reason.error?.message ?? "unknown") });
        } else if (reason?.kind === "aborted") {
          finish({ ok: false, code: "aborted", error: "Turn aborted" });
        } else {
          const cleaned = stripWrappingQuotes(collected);
          if (cleaned.trim() === "")
            finish({ ok: false, code: "llm_error", error: "Enhanced result is empty" });
          else
            finish({ ok: true, text: cleaned });
        }
      }
    })));
    agent.followup(createUserMessage({
      content: [{ type: "text", text: userPrompt }],
      source: { kind: "user" }
    }));
  });
}
export {
  ENHANCE_PATH,
  apply,
  inject,
  name
};
