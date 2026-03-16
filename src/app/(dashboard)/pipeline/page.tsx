import { PipelineBoard } from '@/components/pipeline/board'

export const metadata = { title: 'Pipeline' }

export default function PipelinePage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">
        Drag a deal between columns to change its stage. Changes are written
        straight through and broadcast to everyone else watching.
      </p>
      <PipelineBoard />
    </div>
  )
}
