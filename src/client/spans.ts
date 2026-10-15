/**
 * 草稿区间计算 —— 「保留非文本块」在 DSH 的等价实现。
 *
 * 背景（源码依据：@deepseek-ai/dsh-client-ui-conversation 的 $composerLayout / compose）：
 *   - clipboard 投影（= InputState.draft）：引用 chip 渲染成它的可见标签文本（如 `@src/a.ts`）
 *   - detect 投影（= span 坐标）：引用 chip 固定占 1 个 U+FFFC 字符
 *   - InputState.occurrences[] 里每个 chip 带 offset/length，都是 **clipboard** 坐标
 *
 * 关键：`inputActions.insertText(text, span)` 按 detect 坐标做【区间替换】
 * （$replaceDetectSpanWithText → selection.insertText），**区间之外的节点原样保留**。
 * 所以只替换「纯文本区间」就能让 chip 节点存活 —— 附件不会丢。
 *
 * 反例：`setDraft(text)` 会 root.clear() 整棵文档树再按纯文本重建，
 * 内联的引用 chip 节点必被摧毁（这就是附件消失的根因）。
 */

/** 一个引用 chip 在 clipboard 投影里的占位（InputState.occurrences 的元素）。 */
export interface OccurrenceLike {
  /** chip 标签文本在 clipboard 投影里的起始偏移。 */
  readonly offset: number
  /** chip 标签文本的长度。 */
  readonly length: number
}

/** detect 坐标区间 [start, end)。 */
export interface Span {
  readonly start: number
  readonly end: number
}

/** chip 在 detect 投影里恒占 1 个字符（U+FFFC）。 */
const CHIP_DETECT_LENGTH = 1

/** 按 offset 升序排列（不改动入参）。 */
function sortedByOffset(occurrences: readonly OccurrenceLike[]): OccurrenceLike[] {
  return [...occurrences].sort((a, b) => a.offset - b.offset)
}

/** 把 clipboard 坐标的 chip 列表换算成 detect 坐标区间。 */
export function chipRanges(occurrences: readonly OccurrenceLike[]): Span[] {
  const ranges: Span[] = []
  let shift = 0
  for (const occ of sortedByOffset(occurrences)) {
    const length = Math.max(0, occ.length)
    const start = occ.offset - shift
    ranges.push({ start, end: start + CHIP_DETECT_LENGTH })
    shift += length - CHIP_DETECT_LENGTH
  }
  return ranges
}

/** detect 投影总长度 = clipboard 长度 − Σ(chip 标签长度 − 1)。 */
export function detectLength(draft: string, occurrences: readonly OccurrenceLike[]): number {
  let extra = 0
  for (const occ of occurrences) extra += Math.max(0, Math.max(0, occ.length) - CHIP_DETECT_LENGTH)
  return Math.max(0, draft.length - extra)
}

/**
 * 纯文本区间（chip 区间的补集）。
 * 这些区间可以安全地被 insertText 替换，chip 节点不受影响。
 */
export function textSpans(draft: string, occurrences: readonly OccurrenceLike[]): Span[] {
  const ranges = chipRanges(occurrences)
  const total = detectLength(draft, occurrences)
  const spans: Span[] = []
  let cursor = 0
  for (const range of ranges) {
    const start = Math.min(Math.max(range.start, cursor), total)
    if (start > cursor) spans.push({ start: cursor, end: start })
    cursor = Math.max(cursor, Math.min(range.end, total))
  }
  if (cursor < total) spans.push({ start: cursor, end: total })
  return spans.filter(span => span.end > span.start)
}

/**
 * 送给模型的纯文本：剥掉 chip 标签，各文本片段用单个空格连接
 * （只取类型为 text 的块，非文本块不进入请求）。
 */
export function plainText(draft: string, occurrences: readonly OccurrenceLike[]): string {
  const parts: string[] = []
  let cursor = 0
  for (const occ of sortedByOffset(occurrences)) {
    parts.push(draft.slice(cursor, Math.max(cursor, occ.offset)))
    cursor = Math.max(cursor, occ.offset + Math.max(0, occ.length))
  }
  parts.push(draft.slice(cursor))
  return parts.map(part => part.trim()).filter(part => part !== '').join(' ')
}
