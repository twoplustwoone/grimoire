import 'dotenv/config'
import { hashPassword } from '@better-auth/utils/password'
import { prisma } from './index.js'
import { createDemoCampaign } from './demo-campaign.js'

async function ensurePlayerAccount(email: string, name: string, password: string) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name, emailVerified: true },
  })
  const hash = await hashPassword(password)
  await prisma.account.deleteMany({
    where: { userId: user.id, providerId: 'credential' },
  })
  await prisma.account.create({
    data: {
      id: `seed-account-${user.id}`,
      accountId: user.id,
      providerId: 'credential',
      userId: user.id,
      password: hash,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  return user
}

async function ensureAllPlayersReveal(
  campaignId: string,
  entityType: 'NPC' | 'LOCATION' | 'FACTION' | 'THREAD' | 'CLUE',
  entityId: string
) {
  const existing = await prisma.entityReveal.findFirst({
    where: { campaignId, entityType, entityId, userId: null },
  })
  if (existing) return existing
  return prisma.entityReveal.create({
    data: { campaignId, entityType, entityId, userId: null },
  })
}

async function ensurePlayerReveal(
  campaignId: string,
  userId: string,
  entityType: 'NPC' | 'LOCATION' | 'FACTION' | 'THREAD' | 'CLUE',
  entityId: string
) {
  return prisma.entityReveal.upsert({
    where: { entityType_entityId_userId: { entityType, entityId, userId } },
    update: {},
    create: { campaignId, entityType, entityId, userId },
  })
}

async function main() {
  console.log('🌱 Seeding Grimoire with Dragon Heist campaign...')

  const existing = await prisma.campaign.findFirst({
    where: { name: 'Waterdeep: Dragon Heist' },
  })
  if (existing) {
    await prisma.campaign.delete({ where: { id: existing.id } })
    console.log('🧹 Cleared existing seed campaign')
  }

  // Create user and account directly — no running server needed
  const passwordHash = await hashPassword('gm@grimoire.dev')

  let user = await prisma.user.upsert({
    where: { email: 'gm@grimoire.dev' },
    update: {},
    create: {
      email: 'gm@grimoire.dev',
      name: 'Seed GM',
      emailVerified: true,
    },
  })

  // Always recreate the account row to ensure the hash is current
  await prisma.account.deleteMany({
    where: { userId: user.id, providerId: 'credential' },
  })

  await prisma.account.create({
    data: {
      id: `seed-account-${user.id}`,
      accountId: user.id,
      providerId: 'credential',
      userId: user.id,
      password: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  console.log('✅ Created seed user')

  const campaign = await prisma.campaign.create({
    data: {
      name: 'Waterdeep: Dragon Heist',
      description: 'A gold heist in the City of Splendors. Someone has stolen the cache of 500,000 gold dragons meant for Waterdeep\'s city coffers.',
      settings: {
        system: 'D&D 5e',
        world: 'Forgotten Realms',
        city: 'Waterdeep',
        season: 'Summer',
      },
      memberships: {
        create: {
          userId: user.id,
          role: 'GM',
        },
      },
    },
    include: { memberships: true },
  })

  console.log(`✅ Created campaign: ${campaign.name}`)

  const [waterdeep, trollskull, xanatharGuild, yawningPortal, dockWard] = await Promise.all([
    prisma.location.create({ data: { campaignId: campaign.id, name: 'Waterdeep', description: 'The City of Splendors, a bustling metropolis on the Sword Coast.' } }),
    prisma.location.create({ data: { campaignId: campaign.id, name: 'Trollskull Manor', description: 'A formerly haunted tavern gifted to the party. Now their base of operations in the North Ward.' } }),
    prisma.location.create({ data: { campaignId: campaign.id, name: 'Xanathar Guild Hideout', description: 'A labyrinthine underground complex beneath Waterdeep, home to the beholder crime lord.' } }),
    prisma.location.create({ data: { campaignId: campaign.id, name: 'The Yawning Portal', description: 'A famous tavern built around the entrance to Undermountain. Run by Durnan, a retired adventurer.' } }),
    prisma.location.create({ data: { campaignId: campaign.id, name: 'Dock Ward', description: 'The rough-and-tumble waterfront district, home to sailors, fishmongers, and thieves.' } }),
  ])

  console.log('✅ Created locations')

  const [xanatharFaction, zhentarim, harpers] = await Promise.all([
    prisma.faction.create({ data: { campaignId: campaign.id, name: 'Xanathar Guild', description: 'A powerful thieves guild led by the paranoid beholder Xanathar.', agenda: 'Control Waterdeep\'s criminal underworld and recover the stolen gold.' } }),
    prisma.faction.create({ data: { campaignId: campaign.id, name: 'Zhentarim', description: 'A mercenary organization operating in the shadows of Waterdeep.', agenda: 'Expand influence in Waterdeep through business and intimidation.' } }),
    prisma.faction.create({ data: { campaignId: campaign.id, name: 'Harpers', description: 'A secret organization dedicated to preserving freedom and fighting tyranny.', agenda: 'Protect the innocent and ensure the gold returns to the city coffers.' } }),
  ])

  console.log('✅ Created factions')

  const [volo, durnan, laeral, xanathar, mirt, yagra] = await Promise.all([
    prisma.nPC.create({ data: { campaignId: campaign.id, name: 'Volo', description: 'The famous author Volothamp Geddarm, an eccentric and often unreliable guide to Waterdeep.', locationId: yawningPortal.id, status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { campaignId: campaign.id, name: 'Durnan', description: 'The gruff owner of the Yawning Portal. Former adventurer, keeps his past close to his chest.', locationId: yawningPortal.id, status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { campaignId: campaign.id, name: 'Laeral Silverhand', description: 'The Open Lord of Waterdeep. One of the Seven Sisters, an incredibly powerful archmage.', status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { campaignId: campaign.id, name: 'Xanathar', description: 'A paranoid beholder crime lord who rules the Xanathar Guild. Obsessed with his goldfish Sylgar.', locationId: xanatharGuild.id, status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { campaignId: campaign.id, name: 'Mirt', description: 'A retired adventurer and moneylender known as Mirt the Merciless. Secret Harper operative.', status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { campaignId: campaign.id, name: 'Yagra Stonefist', description: 'A half-orc Zhentarim enforcer the party met at the Yawning Portal. Pragmatic and direct.', locationId: yawningPortal.id, status: 'ACTIVE' } }),
  ])

  console.log('✅ Created NPCs')

  await Promise.all([
    prisma.factionMembership.create({ data: { factionId: xanatharFaction.id, npcId: xanathar.id, role: 'leader' } }),
    prisma.factionMembership.create({ data: { factionId: zhentarim.id, npcId: yagra.id, role: 'enforcer' } }),
    prisma.factionMembership.create({ data: { factionId: harpers.id, npcId: mirt.id, role: 'agent' } }),
  ])

  await Promise.all([
    prisma.relationship.create({ data: { campaignId: campaign.id, entityTypeA: 'NPC', entityIdA: volo.id, entityTypeB: 'LOCATION', entityIdB: yawningPortal.id, label: 'frequents', description: 'Volo is a regular at the Yawning Portal and hired the party here.' } }),
    prisma.relationship.create({ data: { campaignId: campaign.id, entityTypeA: 'FACTION', entityIdA: xanatharFaction.id, entityTypeB: 'FACTION', entityIdB: zhentarim.id, label: 'rivals', description: 'Both factions are competing for control of Waterdeep\'s criminal underworld.', bidirectional: true } }),
    prisma.relationship.create({ data: { campaignId: campaign.id, entityTypeA: 'NPC', entityIdA: xanathar.id, entityTypeB: 'LOCATION', entityIdB: xanatharGuild.id, label: 'controls', description: 'Xanathar rules from deep within the guild hideout.' } }),
  ])

  console.log('✅ Created relationships')

  const [goldThread, trollskullThread, xanatharThread] = await Promise.all([
    prisma.thread.create({ data: { campaignId: campaign.id, title: 'The Missing 500,000 Gold Dragons', description: 'A massive cache of gold meant for the city coffers has been stolen. Multiple factions are hunting for it.', status: 'OPEN', urgency: 'HIGH' } }),
    prisma.thread.create({ data: { campaignId: campaign.id, title: 'Restore Trollskull Manor', description: 'The party has been given a rundown tavern. They need to renovate it and deal with the resident poltergeist.', status: 'OPEN', urgency: 'MEDIUM' } }),
    prisma.thread.create({ data: { campaignId: campaign.id, title: 'Xanathar Surveillance', description: 'The Xanathar Guild has been watching the party since the Yawning Portal brawl.', status: 'OPEN', urgency: 'HIGH' } }),
  ])

  await Promise.all([
    prisma.threadEntityTag.create({ data: { threadId: goldThread.id, entityType: 'FACTION', entityId: xanatharFaction.id } }),
    prisma.threadEntityTag.create({ data: { threadId: goldThread.id, entityType: 'FACTION', entityId: zhentarim.id } }),
    prisma.threadEntityTag.create({ data: { threadId: trollskullThread.id, entityType: 'LOCATION', entityId: trollskull.id } }),
    prisma.threadEntityTag.create({ data: { threadId: xanatharThread.id, entityType: 'NPC', entityId: xanathar.id } }),
  ])

  console.log('✅ Created threads')

  const [, , stoneOfGolorrClue] = await Promise.all([
    prisma.clue.create({ data: { campaignId: campaign.id, title: 'The Zhentarim Safe House', description: 'A Zhentarim agent let slip that they have a safe house somewhere in the Dock Ward.' } }),
    prisma.clue.create({ data: { campaignId: campaign.id, title: 'Xanathar\'s Paranoia', description: 'Xanathar trusts almost no one. Anyone wanting an audience must bring a gift — ideally information.' } }),
    prisma.clue.create({ data: { campaignId: campaign.id, title: 'The Stone of Golorr', description: 'Rumors of an aboleth-created artifact that holds the location of the hidden vault.' } }),
  ])

  console.log('✅ Created clues')

  const session1 = await prisma.gameSession.create({
    data: {
      campaignId: campaign.id,
      number: 1,
      title: 'The Yawning Portal Brawl',
      playedOn: new Date('2024-01-15'),
      status: 'COMPLETED',
      gmSummary: 'Great first session. Players met Volo and Durnan, witnessed a troll emerge from the well, and got caught up in a bar fight between Zhentarim and Xanathar Guild members. Ended with Volo hiring them to find his missing friend Floon.',
      aiSummary: 'The adventurers gathered at the Yawning Portal tavern, where the eccentric author Volo introduced himself over drinks. The evening took a dramatic turn when a troll climbed out of the well at the center of the tavern, sending patrons scrambling. After the beast was dealt with, a brawl erupted between Zhentarim agents and Xanathar Guild thugs. The party navigated the chaos, impressing both Durnan and Yagra Stonefist. As the dust settled, Volo approached them with a job: find his missing friend Floon Blagmaar, who was last seen in the Dock Ward.',
    },
  })

  await Promise.all([
    prisma.sessionEntityTag.create({ data: { sessionId: session1.id, entityType: 'NPC', entityId: volo.id } }),
    prisma.sessionEntityTag.create({ data: { sessionId: session1.id, entityType: 'NPC', entityId: durnan.id } }),
    prisma.sessionEntityTag.create({ data: { sessionId: session1.id, entityType: 'NPC', entityId: yagra.id } }),
    prisma.sessionEntityTag.create({ data: { sessionId: session1.id, entityType: 'LOCATION', entityId: yawningPortal.id } }),
    prisma.sessionEntityTag.create({ data: { sessionId: session1.id, entityType: 'FACTION', entityId: xanatharFaction.id } }),
    prisma.sessionEntityTag.create({ data: { sessionId: session1.id, entityType: 'FACTION', entityId: zhentarim.id } }),
  ])

  await Promise.all([
    prisma.note.create({ data: { entityType: 'SESSION', entityId: session1.id, campaignId: campaign.id, sessionId: session1.id, authorId: user.id, content: 'Players really engaged with Durnan — consider making him a recurring figure who gives subtle quest hooks' } }),
    prisma.note.create({ data: { entityType: 'SESSION', entityId: session1.id, campaignId: campaign.id, sessionId: session1.id, authorId: user.id, content: 'Yagra made an impression — players asked about her backstory. Plant Zhentarim connection hints next session' } }),
    prisma.note.create({ data: { entityType: 'SESSION', entityId: session1.id, campaignId: campaign.id, sessionId: session1.id, authorId: user.id, content: 'Remember: Xanathar Guild watching the party after the brawl' } }),
  ])

  await prisma.gameSession.create({
    data: {
      campaignId: campaign.id,
      number: 2,
      title: 'Finding Floon',
      status: 'PLANNED',
    },
  })

  console.log('✅ Created sessions')

  const serafine = await ensurePlayerAccount('serafine@grimoire.dev', 'Serafine Ashveil', 'password')
  const rook = await ensurePlayerAccount('rook@grimoire.dev', 'Rook Valdris', 'password')
  const maren = await ensurePlayerAccount('maren@grimoire.dev', 'Maren Solis', 'password')
  await ensurePlayerAccount('kael@grimoire.dev', 'Kael Vireth', 'password')
  console.log('✅ Created player users (serafine, rook, maren, kael)')

  await Promise.all([serafine, rook, maren].map(p =>
    prisma.campaignMembership.upsert({
      where: { campaignId_userId: { campaignId: campaign.id, userId: p.id } },
      update: {},
      create: { campaignId: campaign.id, userId: p.id, role: 'PLAYER' },
    })
  ))
  console.log('✅ Added 3 players to Dragon Heist')

  await Promise.all([
    prisma.playerCharacter.create({
      data: {
        campaignId: campaign.id,
        linkedUserId: serafine.id,
        name: 'Serafine Ashveil',
        description: 'A hedge-wizard from the Dock Ward who freelances as a spellbook restorer. Knows more about Waterdeep\'s back alleys than she lets on.',
        status: 'ACTIVE',
      },
    }),
    prisma.playerCharacter.create({
      data: {
        campaignId: campaign.id,
        linkedUserId: rook.id,
        name: 'Rook Valdris',
        description: 'A half-elf rogue with a Zhentarim past he\'s actively trying to bury. Sharp tongue, sharper knives.',
        status: 'ACTIVE',
      },
    }),
    prisma.playerCharacter.create({
      data: {
        campaignId: campaign.id,
        linkedUserId: maren.id,
        name: 'Maren Solis',
        description: 'A paladin of Tyr who joined the party after a failed investigation into Xanathar Guild corruption in the Watch.',
        status: 'ACTIVE',
      },
    }),
  ])
  console.log('✅ Created Dragon Heist PCs for the 3 players')

  await Promise.all([
    ensureAllPlayersReveal(campaign.id, 'NPC', xanathar.id),
    ensureAllPlayersReveal(campaign.id, 'LOCATION', yawningPortal.id),
    ensureAllPlayersReveal(campaign.id, 'FACTION', xanatharFaction.id),
    ensureAllPlayersReveal(campaign.id, 'THREAD', goldThread.id),
  ])

  await Promise.all([
    ensurePlayerReveal(campaign.id, serafine.id, 'FACTION', zhentarim.id),
    ensurePlayerReveal(campaign.id, serafine.id, 'NPC', volo.id),
    ensurePlayerReveal(campaign.id, rook.id, 'CLUE', stoneOfGolorrClue.id),
    ensurePlayerReveal(campaign.id, maren.id, 'LOCATION', trollskull.id),
  ])
  console.log('✅ Pre-seeded entity reveals for Dragon Heist players')

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@grimoire.dev' },
    update: {},
    create: { email: 'demo@grimoire.dev', name: 'Demo User', emailVerified: true },
  })

  const existingDemo = await prisma.campaign.findFirst({
    where: { name: 'The Shattered Conclave', memberships: { some: { userId: demoUser.id } } },
  })
  if (existingDemo) {
    await prisma.campaign.delete({ where: { id: existingDemo.id } })
  }

  await createDemoCampaign(prisma, demoUser.id)
  console.log('✅ Created demo campaign (The Shattered Conclave)')
  console.log('✅ Pre-seeded entity reveals for player portal')

  console.log('')
  console.log('🎲 Seed complete!')
  console.log(`   Campaign: ${campaign.name}`)
  console.log(`   GM login: gm@grimoire.dev / gm@grimoire.dev`)
  console.log(`   Dragon Heist players: serafine@grimoire.dev / rook@grimoire.dev / maren@grimoire.dev (password: password)`)
  console.log(`   Demo campaign players: serafine@grimoire.dev / kael@grimoire.dev (password: password)`)
  console.log(`   6 NPCs, 5 locations, 3 factions, 3 threads, 3 clues`)
  console.log(`   1 completed session with notes and AI recap`)
  console.log(`   1 planned session`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
