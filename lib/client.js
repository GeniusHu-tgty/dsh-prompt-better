window.__ModuleLoader__.load({
	id: "dsh-prompt-better",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// tsc-out/client/index.js
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_jsx_runtime2 = require("react/jsx-runtime");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_react2 = require("react");

// tsc-out/client/Spinner.js
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
function syncSpinner(element) {
  if (element === null)
    return;
  for (const animation of element.getAnimations?.({ subtree: true }) ?? [])
    animation.startTime = 0;
}
function Spinner({ size = 16 }) {
  const ref = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    syncSpinner(ref.current);
  }, []);
  return (0, import_jsx_runtime.jsx)("svg", { ref, className: "pb-spinner", "data-state": "ongoing", width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: (0, import_jsx_runtime.jsxs)("g", { className: "pb-spinner-motion", style: { transformOrigin: "12px 12px" }, children: [(0, import_jsx_runtime.jsx)("circle", { className: "pb-spinner-track", cx: "12", cy: "12", r: "9.5" }), (0, import_jsx_runtime.jsx)("circle", { className: "pb-spinner-arc", cx: "12", cy: "12", r: "9.5" })] }) });
}

// tsc-out/client/styles.js
var CSS = `
/* ---- \u52A0\u8F7D\u8F6C\u5708\uFF08\u5B98\u65B9 StateDot ongoing \u540C\u6B3E\uFF09 ---- */
@keyframes pb-spin { to { transform: rotate(360deg); } }
@keyframes pb-dash {
  0%   { stroke-dasharray: 12 150; stroke-dashoffset: 0; }
  50%  { stroke-dasharray: 24 150; stroke-dashoffset: -6; }
  to   { stroke-dasharray: 12 150; stroke-dashoffset: 0; }
}
.pb-spinner { flex: none; display: block; color: inherit; }
.pb-spinner-motion { transform-origin: center; animation: pb-spin 1.5s linear infinite; }
.pb-spinner-track,
.pb-spinner-arc { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.pb-spinner-track { opacity: .25; }
.pb-spinner-arc { stroke-dasharray: 12 150; animation: pb-dash 1.5s ease-in-out infinite; }

/* ---- \u6309\u94AE\uFF08\u4E09\u6001\u4E00\u952E\uFF09 ---- */
.pb-button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: none;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-primary, currentColor);
  cursor: pointer;
  padding: 0;
  /* \u8FC7\u6E21\u624B\u611F */
  transition: background-color .15s ease, opacity .15s ease, transform .08s ease;
}
.pb-button:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover-solid, rgba(127, 127, 127, .16));
}
.pb-button:active:not(:disabled) { transform: scale(.94); }
.pb-button:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #4F7CFF);
  outline-offset: 1px;
}
.pb-button[data-phase='enhancing'] { opacity: .75; cursor: pointer; }

/* ---- \u52A8\u753B\u6C38\u4E0D\u964D\u7EA7 ----
 * \u65CB\u8F6C\u52A8\u753B\u523B\u610F\u4E0D\u53D7 prefers-reduced-motion \u5F71\u54CD\u3002
 * \u539F\u56E0\uFF1AWindows \u7684"\u7A97\u53E3\u52A8\u753B\u6548\u679C"\u5173\u95ED\u65F6\uFF08MinAnimate=0\uFF09\uFF0CChromium \u4F1A\u628A
 * prefers-reduced-motion \u62A5\u6210 reduce\uFF0C\u82E5\u5728\u6B64\u964D\u7EA7\uFF0C\u7EDD\u5927\u591A\u6570\u4E2D\u6587\u7528\u6237\u770B\u5230\u7684\u8F6C\u5708\u90FD\u662F\u9759\u6B62\u7684
 * \u2014\u2014 \u90A3\u4F1A\u8BA9\u300C\u52A0\u8F7D\u4E2D\u300D\u8FD9\u4E2A\u6700\u91CD\u8981\u7684\u72B6\u6001\u63D0\u793A\u5B8C\u5168\u5931\u6548\u3002
 */
`;
var STYLE_ID = "dsh-prompt-better-styles";
function injectStyles() {
  if (typeof document === "undefined")
    return () => {
    };
  const existing = document.getElementById(STYLE_ID);
  if (existing !== null) {
    existing.textContent = CSS;
    return () => {
    };
  }
  const tag = document.createElement("style");
  tag.id = STYLE_ID;
  tag.setAttribute("data-plugin", "dsh-prompt-better");
  tag.textContent = CSS;
  document.head.appendChild(tag);
  return () => {
    tag.remove();
  };
}

// tsc-out/client/locales.js
var zh = {
  title: "\u589E\u5F3A\u63D0\u793A\u8BCD",
  enhancing: "\u589E\u5F3A\u4E2D...",
  revert: "\u6062\u590D\u539F\u6587",
  failed: "\u589E\u5F3A\u63D0\u793A\u8BCD\u5931\u8D25",
  empty: "\u8BF7\u5148\u8F93\u5165\u5185\u5BB9\u518D\u589E\u5F3A",
  busyConflict: "\u8349\u7A3F\u5DF2\u53D8\u5316\uFF0C\u672A\u8986\u76D6\uFF1B\u8BF7\u91CD\u8BD5"
};
var en = {
  title: "Enhance prompt",
  enhancing: "Enhancing...",
  revert: "Revert to original",
  failed: "Failed to enhance prompt",
  empty: "Type something first to enhance",
  busyConflict: "Draft changed meanwhile; not overwritten. Try again."
};

// tsc-out/client/service.js
var ENHANCE_PATH = "/plugins/dsh-prompt-better/enhance";
var EnhanceAbortedError = class extends Error {
  constructor() {
    super("prompt-better-aborted-by-user");
    this.name = "AbortError";
  }
};
function raceWithAbortSignal(promise, signal) {
  if (signal === void 0)
    return promise;
  if (signal.aborted)
    return Promise.reject(new EnhanceAbortedError());
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(new EnhanceAbortedError());
    };
    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then((value) => {
      cleanup();
      resolve(value);
    }, (error) => {
      cleanup();
      reject(error);
    });
  });
}
async function requestEnhance(text, signal, selection) {
  const response = await fetch(ENHANCE_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(selection === void 0 ? { text } : { text, selection }),
    ...signal !== void 0 ? { signal } : {}
  });
  const payload = await response.json();
  if (typeof payload !== "object" || payload === null || typeof payload.ok !== "boolean") {
    return { ok: false, code: "bad_response", error: "unexpected response from enhance endpoint" };
  }
  return payload;
}

// tsc-out/client/model.js
function readSessionModel(ctx, sessionId) {
  try {
    const models = ctx.get?.("modelDirectories");
    const snapshot = models?.directoryFor?.(sessionId)?.store?.getSnapshot?.();
    const current = snapshot?.current;
    if (current === null || current === void 0 || typeof current !== "object")
      return void 0;
    const candidate = current;
    if (typeof candidate.provider !== "string" || candidate.provider === "")
      return void 0;
    if (typeof candidate.model !== "string" || candidate.model === "")
      return void 0;
    return {
      provider: candidate.provider,
      model: candidate.model,
      ...typeof candidate.reasoningEffort === "string" && candidate.reasoningEffort !== "" ? { reasoningEffort: candidate.reasoningEffort } : {}
    };
  } catch {
    return void 0;
  }
}

// tsc-out/client/store.js
var INITIAL = { enhancing: false, hasEnhanced: false, lastDraft: "" };
var states = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Map();
function getState(sessionId) {
  return sessionId === void 0 ? INITIAL : states.get(sessionId) ?? INITIAL;
}
function subscribe(sessionId, listener) {
  let set = listeners.get(sessionId);
  if (set === void 0) {
    set = /* @__PURE__ */ new Set();
    listeners.set(sessionId, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}
function patch(sessionId, partial) {
  const current = states.get(sessionId) ?? INITIAL;
  const next = { ...current, ...partial };
  const keys = Object.keys(next);
  if (keys.every((k) => current[k] === next[k]))
    return;
  states.set(sessionId, next);
  listeners.get(sessionId)?.forEach((l) => l(next));
}
function notifyDraftChanged(sessionId, draft) {
  const state = getState(sessionId);
  if (state.expectedDraft !== void 0 && state.expectedDraft === draft) {
    patch(sessionId, { expectedDraft: void 0, lastDraft: draft });
    return true;
  }
  onContentDiverged(sessionId, draft);
  return false;
}
function onContentDiverged(sessionId, draft) {
  const state = getState(sessionId);
  if (state.lastDraft !== draft)
    patch(sessionId, { lastDraft: draft });
  if (state.backup === void 0)
    return;
  const normalized = draft.replace(/\u200B/g, "").trim();
  const isStillEnhanced = normalized === state.backup.after.trim();
  if (isStillEnhanced) {
    if (!state.hasEnhanced)
      patch(sessionId, { hasEnhanced: true });
    return;
  }
  patch(sessionId, {
    hasEnhanced: false,
    backup: void 0,
    errorMessage: void 0
  });
}

// tsc-out/client/spans.js
var CHIP_DETECT_LENGTH = 1;
function sortedByOffset(occurrences) {
  return [...occurrences].sort((a, b) => a.offset - b.offset);
}
function chipRanges(occurrences) {
  const ranges = [];
  let shift = 0;
  for (const occ of sortedByOffset(occurrences)) {
    const length = Math.max(0, occ.length);
    const start = occ.offset - shift;
    ranges.push({ start, end: start + CHIP_DETECT_LENGTH });
    shift += length - CHIP_DETECT_LENGTH;
  }
  return ranges;
}
function detectLength(draft, occurrences) {
  let extra = 0;
  for (const occ of occurrences)
    extra += Math.max(0, Math.max(0, occ.length) - CHIP_DETECT_LENGTH);
  return Math.max(0, draft.length - extra);
}
function textSpans(draft, occurrences) {
  const ranges = chipRanges(occurrences);
  const total = detectLength(draft, occurrences);
  const spans = [];
  let cursor = 0;
  for (const range of ranges) {
    const start = Math.min(Math.max(range.start, cursor), total);
    if (start > cursor)
      spans.push({ start: cursor, end: start });
    cursor = Math.max(cursor, Math.min(range.end, total));
  }
  if (cursor < total)
    spans.push({ start: cursor, end: total });
  return spans.filter((span) => span.end > span.start);
}
function plainText(draft, occurrences) {
  const parts = [];
  let cursor = 0;
  for (const occ of sortedByOffset(occurrences)) {
    parts.push(draft.slice(cursor, Math.max(cursor, occ.offset)));
    cursor = Math.max(cursor, occ.offset + Math.max(0, occ.length));
  }
  parts.push(draft.slice(cursor));
  return parts.map((part) => part.trim()).filter((part) => part !== "").join(" ");
}

// tsc-out/client/index.js
var name = "dsh-prompt-better";
var inject = ["slots", "locale"];
var dictionaries = { zh, en };
var revCache = /* @__PURE__ */ new Map();
var draftCache = /* @__PURE__ */ new Map();
var occCache = /* @__PURE__ */ new Map();
function apply(ctx) {
  const c = ctx;
  c.effect(() => c.locale.register("enhancePrompt", dictionaries), "prompt-better: dictionaries");
  c.effect(() => injectStyles(), "prompt-better: styles");
  c.slots.inject("conversation.input.right", () => c.slots.register({
    name: "conversation.input.right",
    id: "prompt-better",
    order: 20,
    locale: "enhancePrompt",
    // readModel 闭包捕获 client ctx：按需读取本会话在模型选择器里选中的模型
    // （可选依赖；服务缺失时返回 undefined，由 Host 端回退）。
    inject: (sessionId) => ({ sessionId, readModel: () => readSessionModel(c, sessionId) })
  }, EnhanceButton));
}
function EnhanceButton(props) {
  const { sessionId, readModel, useInput, inputActions, t } = props;
  const input = useInput((s) => s);
  const state = (0, import_react2.useSyncExternalStore)((cb) => subscribe(sessionId, cb), () => getState(sessionId), () => getState(sessionId));
  const draft = input.draft;
  (0, import_react2.useEffect)(() => {
    const suppressed = notifyDraftChanged(sessionId, draft);
    if (!suppressed) {
      const current = getState(sessionId);
      if (current.enhancing && current.abort !== void 0 && !current.abort.signal.aborted) {
        current.abort.abort();
        patch(sessionId, { enhancing: false, abort: void 0 });
      }
    }
  }, [sessionId, draft]);
  revCache.set(sessionId, input.draftRev);
  draftCache.set(sessionId, input.draft);
  occCache.set(sessionId, input.occurrences ?? []);
  const showingCancel = state.enhancing;
  const showingRevert = !state.enhancing && state.hasEnhanced;
  if (!state.enhancing && input.draft.trim() === "")
    return null;
  const label = state.errorMessage !== void 0 && state.errorMessage !== "" ? state.errorMessage : state.enhancing ? t("enhancing") : showingRevert ? t("revert") : t("title");
  const onClick = showingCancel ? () => handleCancel(sessionId) : showingRevert ? () => {
    void handleRevert(sessionId, inputActions);
  } : () => {
    void triggerEnhance(sessionId, inputActions, t, readModel);
  };
  const phase = state.enhancing ? "enhancing" : showingRevert ? "revert" : "idle";
  return (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Tooltip, { label, side: "top", delayMs: 500, children: (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "pb-button", "data-enhance-button": "", "data-phase": phase, "aria-label": label, "aria-busy": state.enhancing || void 0, onClick, children: state.enhancing ? (0, import_jsx_runtime2.jsx)(Spinner, { size: 16 }) : showingRevert ? (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.IconRefreshOutlineMedium, { size: 16 }) : (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.IconSparkleMedium, { size: 16 }) }) });
}
async function waitForRev(sessionId, previous) {
  const deadline = Date.now() + 600;
  while (Date.now() < deadline) {
    const current = revCache.get(sessionId);
    if (current !== void 0 && current !== previous)
      return current;
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  return void 0;
}
async function writeAcrossSpans(sessionId, spans, text, inputActions) {
  if (spans.length === 0)
    return false;
  let rev = revCache.get(sessionId);
  if (rev === void 0)
    return false;
  for (let index = spans.length - 1; index >= 0; index -= 1) {
    const span = spans[index];
    const payload = index === spans.length - 1 ? text : "";
    if (!inputActions.insertText(payload, { start: span.start, end: span.end, draftRev: rev }))
      return false;
    const next = await waitForRev(sessionId, rev);
    if (index > 0) {
      if (next === void 0)
        return false;
      rev = next;
    }
  }
  return true;
}
async function readSettledDraft(sessionId, fallback) {
  const deadline = Date.now() + 300;
  while (Date.now() < deadline) {
    const current = draftCache.get(sessionId);
    if (current !== void 0)
      return current;
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  return fallback;
}
async function triggerEnhance(sessionId, inputActions, t, readModel) {
  const draft = draftCache.get(sessionId) ?? "";
  const occurrences = occCache.get(sessionId) ?? [];
  const text = plainText(draft, occurrences);
  if (text === "")
    return;
  const current = getState(sessionId);
  current.abort?.abort();
  const controller = new AbortController();
  patch(sessionId, { enhancing: true, errorMessage: void 0, abort: controller });
  const isCurrent = () => getState(sessionId).abort === controller;
  try {
    const selection = readModel();
    const result = await raceWithAbortSignal(requestEnhance(text, controller.signal, selection), controller.signal);
    if (controller.signal.aborted || !isCurrent())
      return;
    if (!result.ok) {
      patch(sessionId, { enhancing: false, errorMessage: result.error, abort: void 0 });
      return;
    }
    if (result.text === text) {
      patch(sessionId, { enhancing: false, abort: void 0 });
      return;
    }
    let wrote;
    if (occurrences.length === 0) {
      inputActions.setDraft(result.text);
      wrote = true;
    } else {
      wrote = await writeAcrossSpans(sessionId, textSpans(draft, occurrences), result.text, inputActions);
      if (!wrote) {
        patch(sessionId, { enhancing: false, abort: void 0 });
        return;
      }
    }
    const settled = await readSettledDraft(sessionId, wrote && occurrences.length > 0 ? draft : result.text);
    patch(sessionId, {
      enhancing: false,
      hasEnhanced: true,
      backup: { before: text, after: settled, hadChips: occurrences.length > 0 },
      abort: void 0
    });
  } catch (error) {
    if (!isCurrent())
      return;
    if (controller.signal.aborted || error instanceof EnhanceAbortedError || error instanceof Error && error.name === "AbortError") {
      patch(sessionId, { enhancing: false, abort: void 0 });
      return;
    }
    patch(sessionId, {
      enhancing: false,
      abort: void 0,
      errorMessage: error instanceof Error ? error.message : t("failed")
    });
  }
}
function handleCancel(sessionId) {
  const state = getState(sessionId);
  if (!state.enhancing)
    return;
  state.abort?.abort();
  revCache.delete(sessionId);
  patch(sessionId, { enhancing: false, abort: void 0 });
}
async function handleRevert(sessionId, inputActions) {
  const state = getState(sessionId);
  const backup = state.backup;
  if (backup === void 0)
    return;
  if (backup.hadChips === true) {
    const occurrences = occCache.get(sessionId) ?? [];
    const draft = draftCache.get(sessionId) ?? "";
    const ok = await writeAcrossSpans(sessionId, textSpans(draft, occurrences), backup.before, inputActions);
    if (!ok)
      return;
  } else {
    inputActions.setDraft(backup.before);
  }
  patch(sessionId, { hasEnhanced: false, backup: void 0, errorMessage: void 0 });
}

		return module.exports;
	},
});
//# sourceMappingURL=client.js.map