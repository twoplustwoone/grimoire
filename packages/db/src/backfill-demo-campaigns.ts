import 'dotenv/config'
import { prisma } from './index.js'
import { createDemoCampaign } from './demo-campaign.js'

const SKIP_EMAILS = new Set([
  'player@grimoire.dev',
  'test@grimoire.dev',
  'gm2@grimoire.dev',
  'gm3@grimoire.dev',
  'gm4@grimoire.dev',
  'smoke@grimoire.dev',
])

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const all = await prisma.user.findMany({
    where: {
      memberships: {
        none: {
          role: 'GM',
          campaign: { is: { isDemo: true } },
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const candidates = all.filter((u) => !SKIP_EMAILS.has(u.email))
  const skipped = all.filter((u) => SKIP_EMAILS.has(u.email))

  if (skipped.length > 0) {
    console.log(`Skipping ${skipped.length} test account(s):`)
    for (const u of skipped) console.log(`  - ${u.email}`)
    console.log('')
  }

  console.log(`Found ${candidates.length} user(s) without a demo campaign:`)
  for (const u of candidates) {
    console.log(`  - ${u.email} (${u.id}) — created ${u.createdAt.toISOString()}`)
  }

  if (dryRun) {
    console.log('\n--dry-run set; no changes made.')
    return
  }

  if (candidates.length === 0) {
    console.log('Nothing to backfill.')
    return
  }

  console.log(`\nBackfilling ${candidates.length} user(s)...`)
  let ok = 0
  let failed = 0
  for (const u of candidates) {
    try {
      const campaign = await createDemoCampaign(prisma, u.id)
      console.log(`  ✓ ${u.email} → campaign ${campaign.id}`)
      ok++
    } catch (e) {
      console.error(`  ✗ ${u.email}:`, e)
      failed++
    }
  }
  console.log(`\nDone. ${ok} succeeded, ${failed} failed.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
