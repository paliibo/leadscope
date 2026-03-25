'use client'

import { useTheme } from 'next-themes'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar } from 'react-chartjs-2'

import { registerCharts, token } from './chart-setup'

import type { ChartOptions, Chart as ChartJSInstance } from 'chart.js'

registerCharts()

export function BarChart({
  labels,
  values,
  height = 240,
  horizontal = false,
  formatValue = (value: number) => String(value),
}: {
  labels: readonly string[]
  values: readonly number[]
  height?: number
  horizontal?: boolean
  formatValue?: (value: number) => string
}) {
  const { resolvedTheme } = useTheme()
  const chartRef = useRef<ChartJSInstance<'bar'>>(null)
  const [, repaint] = useState(0)

  useEffect(() => {
    repaint((n) => n + 1)
    chartRef.current?.update()
  }, [resolvedTheme])

  const { data, options } = useMemo(() => {
    const line = token('line')
    const max = Math.max(...values, 1)


    return {
      data: {
        labels: [...labels],
        datasets: [
          {
            data: [...values],
            // Fade the bars by rank so the leader reads first without a legend.
            backgroundColor: values.map((value) =>
              token('brand', 0.35 + 0.5 * (value / max)),
            ),
            borderRadius: 6,
            borderSkipped: false as const,
            barPercentage: 0.72,
            categoryPercentage: 0.8,
          },
        ],
      },
      options: {
        indexAxis: horizontal ? ('y' as const) : ('x' as const),
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: token('surface'),
            borderColor: line,
            borderWidth: 1,
            titleColor: token('ink-muted'),
            bodyColor: token('ink'),
            padding: 10,
            cornerRadius: 10,
            displayColors: false,
            callbacks: {
              label: (context) => {
                const value = horizontal ? context.parsed.x : context.parsed.y
                return value === null ? '' : formatValue(value)
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: horizontal, color: line },
            border: { display: false },
            ...(horizontal ? { beginAtZero: true } : {}),
            ticks: {
              color: token('ink-subtle'),
              font: { size: 11 },
              // Only override the tick formatter on the value axis. Passing
              // `callback: undefined` on the category axis does not fall back to
              // the default — it replaces it, and the labels come out as indices.
              ...(horizontal ? { callback: (value: number | string) => formatValue(Number(value)) } : {}),
            },
          },
          y: {
            grid: { display: !horizontal, color: line },
            border: { display: false },
            ...(horizontal ? {} : { beginAtZero: true }),
            ticks: {
              color: token('ink-subtle'),
              font: { size: 11 },
              maxTicksLimit: 6,
              ...(horizontal ? {} : { callback: (value: number | string) => formatValue(Number(value)) }),
            },
          },
        },
      } satisfies ChartOptions<'bar'>,
    }
  }, [labels, values, horizontal, formatValue, resolvedTheme])

  return (
    <div style={{ height }}>
      <Bar ref={chartRef} data={data} options={options} />
    </div>
  )
}
