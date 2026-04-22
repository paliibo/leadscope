import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Delta } from '@/components/ui/delta'
import { Progress } from '@/components/ui/progress'
import { Segmented } from '@/components/ui/segmented'
import { Sparkline } from '@/components/ui/sparkline'
import { StagePill } from '@/components/ui/stage-pill'

describe('Delta', () => {
  it('renders a signed percentage', () => {
    render(<Delta change={12.34} />)
    expect(screen.getByText(/\+12\.3%/)).toBeInTheDocument()
  })

  it('says there is no baseline instead of inventing one', () => {
    render(<Delta change={null} />)
    expect(screen.getByText('No baseline')).toBeInTheDocument()
  })

  it('colours a rise green and a fall red', () => {
    const { container, rerender } = render(<Delta change={20} />)
    expect(container.firstElementChild?.className).toContain('text-positive')

    rerender(<Delta change={-20} />)
    expect(container.firstElementChild?.className).toContain('text-negative')
  })

  it('inverts the colouring for metrics where down is good', () => {
    const { container } = render(<Delta change={-20} inverted />)
    expect(container.firstElementChild?.className).toContain('text-positive')
  })

  it('treats a sub-half-percent move as flat', () => {
    const { container } = render(<Delta change={0.2} />)
    expect(container.firstElementChild?.className).toContain('text-ink-subtle')
  })
})

describe('Segmented', () => {
  const options = [
    { value: '7', label: '7d' },
    { value: '30', label: '30d' },
  ] as const

  it('exposes itself as a radio group', () => {
    render(<Segmented name="Range" options={options} value="7" onChange={() => {}} />)
    expect(screen.getByRole('radiogroup', { name: 'Range' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '7d' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '30d' })).not.toBeChecked()
  })

  it('reports the selected value', async () => {
    const onChange = vi.fn()
    render(<Segmented name="Range" options={options} value="7" onChange={onChange} />)

    await userEvent.click(screen.getByRole('radio', { name: '30d' }))
    expect(onChange).toHaveBeenCalledWith('30')
  })
})

describe('Progress', () => {
  it('reports its value to assistive technology', () => {
    render(<Progress value={0.42} label="Quota" />)
    const bar = screen.getByRole('progressbar', { name: 'Quota' })
    expect(bar).toHaveAttribute('aria-valuenow', '42')
  })

  it('clamps an over-target value to 100', () => {
    render(<Progress value={1.8} label="Quota" />)
    expect(screen.getByRole('progressbar', { name: 'Quota' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
  })
})

describe('Sparkline', () => {
  it('draws a path for a real series', () => {
    const { container } = render(<Sparkline values={[1, 5, 2, 8]} />)
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0)
  })

  it('renders nothing drawable for a series too short to plot', () => {
    const { container } = render(<Sparkline values={[3]} />)
    expect(container.querySelector('path')).toBeNull()
  })

  it('does not divide by zero on a flat series', () => {
    const { container } = render(<Sparkline values={[4, 4, 4]} />)
    const d = container.querySelector('path')?.getAttribute('d') ?? ''
    expect(d).not.toContain('NaN')
  })
})

describe('StagePill', () => {
  it('renders the human label for a stage', () => {
    render(<StagePill stage="negotiation" />)
    expect(screen.getByText('Negotiation')).toBeInTheDocument()
  })
})
