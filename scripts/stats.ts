/**
 * Prints a quick health summary of whatever is currently in the database.
 * Handy after reseeding to confirm the demo data still looks like a real book
 * of business rather than uniform noise.
 *
 *   pnpm db:stats
 */
import { client } from '../src/db'

const rows = async (sql: string) => (await client.execute(sql)).rows

function table(title: string, data: unknown[]) {
  console.log(`\n${title}`)
  console.table(data)
}

async function main() {
  table(
    'Pipeline by stage',
    await rows(
      `select stage, count(*) as leads, round(sum(value_cents)/100000.0) as value_k
       from leads group by stage order by leads desc`,
    ),
  )
  table(
    'Closed-won by month',
    await rows(
      `select strftime('%Y-%m', closed_at/1000, 'unixepoch') as month,
              count(*) as deals, round(sum(value_cents)/100000.0) as value_k
       from leads where stage = 'won' group by month order by month desc limit 12`,
    ),
  )
  table(
    'Channel performance',
    await rows(
      `select source, count(*) as leads,
              round(100.0*sum(stage='won')/nullif(sum(stage in ('won','lost')),0),1) as win_pct
       from leads group by source order by leads desc`,
    ),
  )
  table(
    'Top reps by revenue',
    await rows(
      `select r.name, count(*) as wins, round(sum(l.value_cents)/100000.0) as value_k
       from leads l join reps r on r.id = l.owner_id
       where l.stage = 'won' group by r.id order by value_k desc limit 8`,
    ),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => client.close())
