'use client'

import { useTheme } from 'next-themes'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'

import { movingAverage } from '@/lib/analytics/series'
import { formatCompactMoney } from '@/lib/money'

import { areaGradient, registerCharts, token } from './chart-setup'

import type { ChartOptions, Chart as ChartJSInstance } from 'chart.js'

registerCharts()

export interface RevenuePoint {
  date: string
  value: number
  forecast?: boolean
}

/**
 * Closed-won revenue over time.
 *
 * Three layers, deliberately: the raw per-period values as a faint area so the
 * actual volatility is visible, a moving average as the primary line so the
 * shape is readable, and the projection as a dashed continuation of that line
 * rather than a separate series — so the eye reads it as "where this is
 * heading" instead of a second, unrelated metric.
 */
export function RevenueChart({
  points,
  smoothing = 7,
  height = 300,
}: {
  points: readonly RevenuePoint[]
  smoothing?: number
  height?: number
}) {
  const { resolvedTheme } = useTheme()
  const chartRef = useRef<ChartJSInstance<'line'>>(null)
  const [, repaint] = useState(0)

  // Chart.js caches resolved colour strings, so a theme flip needs an explicit
  // rebuild — the tokens below are read from CSS custom properties.
  useEffect(() => {
    repaint((n) => n + 1)
    chartRef.current?.update()
  }, [resolvedTheme])

  const { data, options } = useMemo(() => {
    const brand = token('brand')
    const violet = token('violet')
    const line = token('line')

    const historical = points.filter((point) => !point.forecast)
    const smoothed = movingAverage(
      historical.map((point) => point.value),
      smoothing,
    )

    const raw = points.map((point) => (point.forecast ? null : point.value))

    const trend = points.map((point, index) =>
      point.forecast ? null : (smoothed[index] ?? null),
    )

    const projection = points.map((point, index) => {
      if (point.forecast) return point.value
      // Repeat the join value so the dashed run starts flush with the solid one.
      return points[index + 1]?.forecast ? (smoothed[index] ?? point.value) : null
    })

    return {
      data: {
        labels: points.map((point) => point.date),
        datasets: [
          {
            label: 'Actual',
            data: raw,
            borderColor: token('brand', 0.28),
            borderWidth: 1,
            tension: 0.2,
            pointRadius: 0,
            pointHoverRadius: 3,
            fill: 'start',
            backgroundColor: (context: { chart: ChartJSInstance }) =>
              areaGradient(context.chart.ctx, context.chart.height, brand),
          },
          {
            label: `${smoothing}-period average`,
            data: trend,
            borderColor: brand,
            borderWidth: 2.5,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBackgroundColor: token('surface'),
            pointHoverBorderColor: brand,
            fill: false,
          },
          {
            label: 'Projection',
            data: projection,
            borderColor: violet,
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
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
            titleColor: token('ink-muted'),
            bodyColor: token('ink'),
            padding: 12,
            cornerRadius: 12,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            callbacks: {
              label: (context) =>
                context.parsed.y === null
                  ? ''
                  : ` ${context.dataset.label}: ${formatCompactMoney(context.parsed.y)}`,
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
              autoSkipPadding: 28,
              font: { size: 11 },
            },
          },
          y: {
            grid: { color: line },
            border: { display: false },
            beginAtZero: true,
            ticks: {
              color: token('ink-subtle'),
              font: { size: 11 },
              maxTicksLimit: 5,
              callback: (value) => formatCompactMoney(Number(value)),
            },
          },
        },
      } satisfies ChartOptions<'line'>,
    }
    // resolvedTheme is a real dependency: every colour above is read from it.
  }, [points, smoothing, resolvedTheme])

  return (
    <div style={{ height }}>
      <Line ref={chartRef} data={data} options={options} />
    </div>
  )
}
