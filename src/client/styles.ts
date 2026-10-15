/**
 * 插件样式（一次性注入 <style data-plugin="dsh-prompt-better">）。
 * 动画数值取自 DSH 官方 StateDot 的 spin/dash keyframes：
 *   spin 1.5s linear 无限旋转 + arc 的 stroke-dasharray 伸缩 1.5s ease-in-out。
 * 交互反馈（hover/press）为按钮提供统一的过渡手感。
 */

/** 样式表内容。 */
const CSS = `
/* ---- 加载转圈（官方 StateDot ongoing 同款） ---- */
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

/* ---- 按钮（三态一键） ---- */
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
  /* 过渡手感 */
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

/* ---- 动画永不降级 ----
 * 旋转动画刻意不受 prefers-reduced-motion 影响。
 * 原因：Windows 的"窗口动画效果"关闭时（MinAnimate=0），Chromium 会把
 * prefers-reduced-motion 报成 reduce，若在此降级，绝大多数中文用户看到的转圈都是静止的
 * —— 那会让「加载中」这个最重要的状态提示完全失效。
 */
`

/** 样式标签 id（HMR 与卸载复用同一标签）。 */
const STYLE_ID = 'dsh-prompt-better-styles'

/**
 * 注入样式（幂等：已存在则复用）。
 * @returns 移除器（卸载时清理标签）。
 */
export function injectStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) {
    // 内容变更（HMR）时替换
    existing.textContent = CSS
    return () => { /* 已存在的标签由最早的所有者清理 */ }
  }
  const tag = document.createElement('style')
  tag.id = STYLE_ID
  tag.setAttribute('data-plugin', 'dsh-prompt-better')
  tag.textContent = CSS
  document.head.appendChild(tag)
  return () => { tag.remove() }
}