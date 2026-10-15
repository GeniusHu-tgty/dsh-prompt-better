/**
 * 加载转圈（动画实现在 CSS 注入里 —— 与 DSH 官方 StateDot 的 ongoing 态同款）：
 *   - 外层 svg 固定视口，g 上挂 spin 旋转（1.5s linear 无限）
 *   - 两个 circle：track（底圈，opacity .25）+ arc（弧线，dasharray 伸缩 1.5s ease-in-out）
 *   - prefers-reduced-motion 时关闭动画（无障碍）
 */
import { useEffect, useRef } from 'react'

/** 把当前 spinner 的 CSS 动画对齐到文档时间零点（官方 syncSpinner 同款）。 */
function syncSpinner(element: SVGSVGElement | null): void {
  if (element === null) return
  for (const animation of element.getAnimations?.({ subtree: true }) ?? []) animation.startTime = 0
}

/** 旋转加载指示器（16px 默认，跟随 currentColor）。 */
export function Spinner({ size = 16 }: { size?: number }): React.ReactNode {
  const ref = useRef<SVGSVGElement>(null)
  // 动画在元素插入时才开始；不同时刻挂载的 loader 会跑出相位差 —— 统一 setStartTime(0) 让它们同步。
  useEffect(() => { syncSpinner(ref.current) }, [])
  return (
    <svg
      ref={ref}
      className="pb-spinner"
      data-state="ongoing"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <g className="pb-spinner-motion" style={{ transformOrigin: '12px 12px' }}>
        <circle className="pb-spinner-track" cx="12" cy="12" r="9.5" />
        <circle className="pb-spinner-arc" cx="12" cy="12" r="9.5" />
      </g>
    </svg>
  )
}