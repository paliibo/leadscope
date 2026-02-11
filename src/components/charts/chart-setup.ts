import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'

/**
 * Chart.js is tree-shakeable: nothing renders unless the pieces are registered.
 * Registering once from a shared module keeps every chart on the same set and
 * avoids paying for controllers this app never draws.
 */
let registered = false

export function registerCharts() {
  if (registered) return
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Filler,
    Tooltip,
    Legend,
  )
  registered = true
}

/** Read a design token off the document so charts follow the active theme. */
export function token(name: string, alpha = 1): string {
  if (typeof window === 'undefined') return `rgba(81, 112, 255, ${alpha})`
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--ls-${name}`)
    .trim()
  return value ? `rgba(${value.split(/\s+/).join(', ')}, ${alpha})` : `rgba(0,0,0,${alpha})`
}

/** Vertical fade used under every area series. */
export function areaGradient(
  ctx: CanvasRenderingContext2D,
  height: number,
  colour: string,
): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, 0, 0, height || 320)
  gradient.addColorStop(0, colour.replace(/[\d.]+\)$/, '0.28)'))
  gradient.addColorStop(1, colour.replace(/[\d.]+\)$/, '0)'))
  return gradient
}
