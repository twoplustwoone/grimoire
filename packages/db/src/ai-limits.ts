import { prisma } from '@grimoire/db'

// Per-user monthly caps on AI features. Raise a number, ship a commit —
// don't build a feature-flag system around this. New AI features should
// reuse the AIUsage table with a new `feature` string and a new limit.
export const RECAP_FEATURE = 'RECAP' as const
export const RECAP_MONTHLY_LIMIT = 5

export interface AIUsageSnapshot {
  feature: string
  count: number
  limit: number
  monthKey: string
  resetsOn: string
}

// Month buckets are UTC. Simpler than per-user timezones, and the worst-case
// drift (a user in Auckland burns a recap at 11 PM local on the last of the
// month) is negligible next to a 5/month ceiling.
export function currentMonthKey(now: Date = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function nextMonthStartISO(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString()
}

export async function getRecapUsage(userId: string): Promise<AIUsageSnapshot> {
  const monthKey = currentMonthKey()
  const row = await prisma.aIUsage.findUnique({
    where: { userId_feature_monthKey: { userId, feature: RECAP_FEATURE, monthKey } },
    select: { count: true },
  })
  return {
    feature: RECAP_FEATURE,
    count: row?.count ?? 0,
    limit: RECAP_MONTHLY_LIMIT,
    monthKey,
    resetsOn: nextMonthStartISO(),
  }
}

// Upsert + increment in one statement. The unique constraint on
// (userId, feature, monthKey) plus `increment` makes two concurrent recaps
// land on a single row; exact-at-cap enforcement under a thundering herd is
// not the goal here (spec explicitly allows the occasional count-to-6).
export async function incrementRecapUsage(userId: string): Promise<AIUsageSnapshot> {
  const monthKey = currentMonthKey()
  const row = await prisma.aIUsage.upsert({
    where: { userId_feature_monthKey: { userId, feature: RECAP_FEATURE, monthKey } },
    create: { userId, feature: RECAP_FEATURE, monthKey, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  })
  return {
    feature: RECAP_FEATURE,
    count: row.count,
    limit: RECAP_MONTHLY_LIMIT,
    monthKey,
    resetsOn: nextMonthStartISO(),
  }
}
