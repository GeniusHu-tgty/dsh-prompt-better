/** 双语文案（对齐 ui-goal/ui-commands 的 locale 注册模式）。 */
export const zh = {
  title: '增强提示词',
  enhancing: '增强中...',
  revert: '恢复原文',
  failed: '增强提示词失败',
  empty: '请先输入内容再增强',
  busyConflict: '草稿已变化，未覆盖；请重试',
} as const

export const en = {
  title: 'Enhance prompt',
  enhancing: 'Enhancing...',
  revert: 'Revert to original',
  failed: 'Failed to enhance prompt',
  empty: 'Type something first to enhance',
  busyConflict: 'Draft changed meanwhile; not overwritten. Try again.',
} as const

export type EnhanceKey = keyof typeof zh
