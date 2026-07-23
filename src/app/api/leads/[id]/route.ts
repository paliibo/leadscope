import { recordActivity } from '@/db/queries/activities'
import { getLead, updateLead } from '@/db/queries/leads'
import { fail, handler, ok, parseBody } from '@/lib/api/respond'
import { requireSession } from '@/lib/auth'
import { bus } from '@/lib/events/bus'
import { updateLeadSchema } from '@/lib/validation/leads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

export const GET = handler(async (_request: Request, context: RouteContext) => {
  await requireSession()
  const { id } = await context.params

  const lead = await getLead(id)
  if (!lead) return fail(404, 'not_found', 'Lead not found')
  return ok(lead)
})

export const PATCH = handler(async (request: Request, context: RouteContext) => {
  const session = await requireSession()
  const { id } = await context.params

  const before = await getLead(id)
  if (!before) return fail(404, 'not_found', 'Lead not found')

  const input = await parseBody(request, updateLeadSchema)
  const after = await updateLead(id, input)
  if (!after) return fail(404, 'not_found', 'Lead not found')

  // A stage move is the one edit worth writing to the activity log and pushing
  // to every connected client — the board and the ticker both react to it.
  if (input.stage && input.stage !== before.stage) {
    const summary =
      input.stage === 'won'
        ? `${after.accountName} signed`
        : input.stage === 'lost'
          ? `${after.accountName} closed lost`
          : `Moved ${after.name} to ${input.stage}`

    await recordActivity({
      id: crypto.randomUUID(),
      leadId: id,
      repId: session.repId,
      type:
        input.stage === 'won'
          ? 'deal_won'
          : input.stage === 'lost'
            ? 'deal_lost'
            : 'stage_changed',
      summary,
      fromStage: before.stage,
      toStage: input.stage,
      valueCents: after.valueCents,
      createdAt: new Date(),
    })

    const payload = {
      actor: {
        repId: session.repId,
        name: session.name,
        avatarUrl: session.avatarUrl,
      },
      subject: {
        leadId: after.id,
        leadName: after.name,
        accountName: after.accountName,
        valueCents: after.valueCents,
      },
      summary,
    }

    if (input.stage === 'won' || input.stage === 'lost') {
      bus.publish({
        type: input.stage === 'won' ? 'deal.won' : 'deal.lost',
        ...payload,
      })
    } else {
      bus.publish({
        type: 'lead.stage_changed',
        fromStage: before.stage,
        toStage: input.stage,
        ...payload,
      })
    }
  }

  return ok(after)
})
