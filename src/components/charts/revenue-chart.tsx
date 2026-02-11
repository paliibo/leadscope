'use client'

import { useTheme } from 'next-themes'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'

import { formatCompactMoney } from '@/lib/money'

import { areaGradient, registerCharts, token } from './chart-setup'

import type { ChartOptions, Chart as ChartJSInstance } from 'chart.js'

registerCharts()

export interface RevenuePoint {
  date: string
  value: number
  forecast?: boolean
  lower?: number
  upper?: number
}

/**
 * Closed-won revenue over time, with the forecast tail drawn as a dashed
 * continuation of the same line rather than a separate series — so the eye reads
 * it as "where this is heading", not as a second, unrelated metric.
 */
export function RevenueChart({
  points,
  height = 300,
}: {
  points: readonly RevenuePoint[]
  height?: number
}) {
  const { resolvedTheme } = useTheme()
  const chartRef = useRef<ChartJSInstance<'line'>>(null)
  const [, forceRepaint] = useState(0)

  // Colours come from CSS variables, so the canvas has to be repainted when the
  // theme flips — Chart.js caches the resolved strings.
  useEffect(() => {
    forceRepaint((n) => n + 1)
    chartRef.current?.update()
  }, [resolvedTheme])

  const { data, options } = useMemo(() => {
    const brand = token('brand')
    const violet = token('violet')
    const line = token('line')
    const ink = token('ink-muted')

    const actual = points.map((point) => (point.forecast ? null : point.value))
    const projected = points.map((point, index) => {
      if (point.forecast) return point.value
      // Repeat the last real value so the dashed run starts flush with the solid one.
      return points[index + 1]?.forecast ? point.value : null
    })

    return {
      data: {
        labels: points.map((point) => point.date),
        datasets: [
          {
            label: 'Closed won',
            data: actual,
            borderColor: brand,
            borderWidth: 2.5,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBackgroundColor: token('surface'),
            pointHoverBorderColor: brand,
            fill: 'start',
            backgroundColor: (context: { chart: ChartJSInstance }) =>
              areaGradient(
                context.chart.ctx,
                context.chart.height,
                brand,
              ),
            spanGaps: false,
          },
          {
            label: 'Forecast',
            data: projected,
            borderColor: violet,
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: false,
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: token('surface'),
            borderColor: line,
            borderWidth: 1,
            titleColor: ink,
            bodyColor: token('ink'),
            padding: 12,
            cornerRadius: 12,
            displayColors: false,
            callbacks: {
              label: (context) =>
                context.parsed.y === null
                  ? ''
                  : `${context.dataset.label}: ${formatCompactMoney(context.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: token('ink-subtle'),
              maxRotation: 0,
              autoSkipPadding: 24,
              font: { size: 11 },
            },
          },
          y: {
            grid: { color: line },
            border: { display: false },
            ticks: {
              color: token('ink-subtle'),
              font: { size: 11 },
              callback: (value) => formatCompactMoney(Number(value)),
              maxTicksLimit: 5,
            },
            beginAtZero: true,
          },
        },
      } satisfies ChartOptions<'line'>,
    }
    // resolvedTheme is a dependency because every colour above is read from it.
  }, [points, resolvedTheme])

  return (
    <div style={{ height }}>
      <Line ref={chartRef} data={data} options={options} />
    </div>
  )
}
