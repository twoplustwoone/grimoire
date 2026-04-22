import type { PrismaClient } from '@prisma/client'
import {
  extractMentionsFromDoc,
  plainTextToDoc,
  type ProseMirrorDoc,
  type ProseMirrorNode,
} from '@grimoire/db/prosemirror'

function mentionNode(name: string, entityType: string, entityId: string): ProseMirrorNode {
  return {
    type: 'mention',
    attrs: { id: entityId, name, label: name, type: entityType.toUpperCase() },
  }
}

function paragraphWithMentions(
  parts: Array<string | ProseMirrorNode>
): ProseMirrorNode {
  const content: ProseMirrorNode[] = parts.map((p) =>
    typeof p === 'string' ? { type: 'text', text: p } : p
  )
  return { type: 'paragraph', content }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docOfParagraph(children: Array<string | ProseMirrorNode>): any {
  return { type: 'doc', content: [paragraphWithMentions(children)] }
}

export async function createDemoCampaign(prisma: PrismaClient, userId: string) {
  const campaign = await prisma.campaign.create({
    data: {
      name: 'The Shattered Conclave',
      description: 'Three months ago, the five mages of the Conclave were assassinated in a single night. Now their apprentices, patrons, and rivals scramble for power in the vacuum. Your party are investigators hired to find out who did it — and why no one seems to actually want the council back.',
      isDemo: true,
      settings: {
        system: 'D&D 5e',
        world: 'Custom',
        city: 'Verath',
        tone: 'Political intrigue, mystery',
      },
      memberships: {
        create: {
          userId,
          role: 'GM',
        },
      },
    },
  })

  const [cityOfVerath, towerOfAshes, merchantQuarter, templeOfSilence, undercity] = await Promise.all([
    prisma.location.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'Verath', description: 'A city of spires built on the ruins of an older civilization. Five towers once dominated the skyline — one for each Conclave mage. Three now stand dark and cold.' } }),
    prisma.location.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'The Tower of Ashes', description: 'The tower that belonged to Archmage Sorell, the most powerful of the five. It burned on the night of the assassination. Locals say they still see lights in the upper windows.' } }),
    prisma.location.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'The Merchant Quarter', description: 'The beating commercial heart of Verath. The Aurelius Trading Company controls most of the trade flowing through the city gates.' } }),
    prisma.location.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'The Temple of Silence', description: 'A religious order devoted to a god of secrets and endings. They claim neutrality but have been suspiciously well-informed since the assassination.' } }),
    prisma.location.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'The Undercity', description: 'A labyrinth of tunnels, collapsed aqueducts, and forgotten vaults beneath Verath. The Ash Network operates from somewhere down here.' } }),
  ])

  void undercity

  const [apprentices, merchantGuild, cityGuard, ashNetwork, templeOrder] = await Promise.all([
    prisma.faction.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'The Surviving Apprentices', description: 'Three of the five Conclave mages had apprentices who survived the assassination night. They have banded together out of necessity but trust each other poorly.', agenda: 'Rebuild the Conclave under their own leadership — and find out which of them might be next.' } }),
    prisma.faction.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'Aurelius Trading Company', description: 'The wealthiest merchant house in Verath. The Conclave taxed their trade heavily and regulated their use of enchanted goods. Their motive is obvious.', agenda: 'Fill the power vacuum with commerce. A city without a Conclave is a city they can own.' } }),
    prisma.faction.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'The City Watch', description: 'Nominally responsible for investigating the assassination, but Commander Thrace has made very little progress in three months. Either incompetent or compromised.', agenda: 'Maintain order and protect their own. Someone powerful is pulling their strings.' } }),
    prisma.faction.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'The Ash Network', description: 'A thieves and information brokerage operating out of the Undercity. They knew about the assassination before it happened — they just claim they were not involved.', agenda: 'Profit from chaos. Sell information to all sides and stay invisible.' } }),
    prisma.faction.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'The Temple of Silence', description: 'A secretive religious order that has quietly expanded its influence since the assassination. They speak of the Conclave\'s fall as inevitable — almost as if they expected it.', agenda: 'Unclear. But they are collecting the Conclave\'s scattered research and artifacts with unusual urgency.' } }),
  ])

  void cityGuard

  const [mira, castor, thrace, lena, voss, tideborn, aldric] = await Promise.all([
    prisma.nPC.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'Mira Sorell', description: 'Apprentice to the murdered Archmage Sorell and the most powerful of the surviving apprentices. Brilliant, ruthless, and visibly grieving — though it is hard to tell if she mourns her master or her lost future.', locationId: cityOfVerath.id, status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'Castor Vel', description: 'A jovial spice merchant who is almost certainly the public face of the Aurelius Trading Company\'s intelligence operations. Always has information. Always wants something in return.', locationId: merchantQuarter.id, status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'Commander Thrace', description: 'Head of the City Watch. A tired man who looks like he has not slept in three months. The party suspects he knows more than he admits.', locationId: cityOfVerath.id, status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'Sister Lena', description: 'A mid-ranking priest of the Temple of Silence who has been seen meeting with members of every faction in the city. Polite, soft-spoken, and deeply unsettling.', locationId: templeOfSilence.id, status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'Voss', description: 'The only known face of the Ash Network — a contact who appears in taverns, passes notes, and disappears. Nobody knows their real name or face.', status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'The Tideborn', description: 'An unknown figure who has appeared in witness accounts from the night of the assassination. Described only as "dressed in grey, moving against the crowd." No one knows who they are.', status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,name: 'Aldric Mourne', description: 'The youngest surviving apprentice. Nineteen years old, clearly terrified, and hiding something. He was the only apprentice in the city when the Conclave was killed.', locationId: cityOfVerath.id, status: 'ACTIVE' } }),
  ])

  await Promise.all([
    prisma.factionMembership.create({ data: { factionId: apprentices.id, npcId: mira.id, role: 'leader' } }),
    prisma.factionMembership.create({ data: { factionId: apprentices.id, npcId: aldric.id, role: 'member' } }),
    prisma.factionMembership.create({ data: { factionId: merchantGuild.id, npcId: castor.id, role: 'operative' } }),
    prisma.factionMembership.create({ data: { factionId: cityGuard.id, npcId: thrace.id, role: 'commander' } }),
    prisma.factionMembership.create({ data: { factionId: templeOrder.id, npcId: lena.id, role: 'emissary' } }),
    prisma.factionMembership.create({ data: { factionId: ashNetwork.id, npcId: voss.id, role: 'contact' } }),
  ])

  await Promise.all([
    prisma.relationship.create({ data: { campaignId: campaign.id, entityTypeA: 'NPC', entityIdA: mira.id, entityTypeB: 'NPC', entityIdB: aldric.id, label: 'distrusts', description: 'Mira suspects Aldric knows something about the night of the assassination. Aldric is terrified of her.' } }),
    prisma.relationship.create({ data: { campaignId: campaign.id, entityTypeA: 'NPC', entityIdA: mira.id, entityTypeB: 'NPC', entityIdB: tideborn.id, label: 'hunting', description: 'Mira has been quietly investigating the Tideborn figure since the assassination.' } }),
    prisma.relationship.create({ data: { campaignId: campaign.id, entityTypeA: 'FACTION', entityIdA: apprentices.id, entityTypeB: 'FACTION', entityIdB: merchantGuild.id, label: 'hostile', description: 'The apprentices know the merchant guild had motive. The guild denies everything smoothly.', bidirectional: true } }),
    prisma.relationship.create({ data: { campaignId: campaign.id, entityTypeA: 'FACTION', entityIdA: ashNetwork.id, entityTypeB: 'FACTION', entityIdB: templeOrder.id, label: 'uneasy alliance', description: 'The Ash Network and the Temple have been seen exchanging documents. Neither acknowledges the relationship.', bidirectional: true } }),
    prisma.relationship.create({ data: { campaignId: campaign.id, entityTypeA: 'NPC', entityIdA: thrace.id, entityTypeB: 'FACTION', entityIdB: merchantGuild.id, label: 'compromised by', description: 'The party suspects Aurelius has something on Commander Thrace. His investigation has been suspiciously slow.' } }),
    prisma.relationship.create({ data: { campaignId: campaign.id, entityTypeA: 'NPC', entityIdA: lena.id, entityTypeB: 'NPC', entityIdB: tideborn.id, label: 'knows identity of', description: 'A witness saw Sister Lena speaking to someone matching the Tideborn description two days after the assassination.' } }),
  ])

  const [whoThread, tidebornThread, aldricThread, templeThread] = await Promise.all([
    prisma.thread.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,title: 'Who Killed the Conclave?', description: 'The central question. Five mages killed in a single night with no survivors and almost no witnesses. Every faction has motive. None of them are talking.', status: 'OPEN', urgency: 'CRITICAL' } }),
    prisma.thread.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,title: 'The Tideborn', description: 'A mysterious grey-cloaked figure seen moving through the crowds on assassination night. Multiple witnesses. No identity. Sister Lena seems to know who they are.', status: 'OPEN', urgency: 'HIGH' } }),
    prisma.thread.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,title: 'What Is Aldric Hiding?', description: 'The youngest apprentice was the only one in the city that night. He claims he saw nothing. He is clearly lying.', status: 'OPEN', urgency: 'HIGH' } }),
    prisma.thread.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,title: 'The Temple\'s Expanding Influence', description: 'The Temple of Silence has quietly acquired three properties in the city and two of the Conclave\'s research repositories since the assassination. This seems like preparation, not opportunism.', status: 'OPEN', urgency: 'MEDIUM' } }),
  ])

  await Promise.all([
    prisma.threadEntityTag.create({ data: { threadId: whoThread.id, entityType: 'FACTION', entityId: apprentices.id } }),
    prisma.threadEntityTag.create({ data: { threadId: whoThread.id, entityType: 'FACTION', entityId: merchantGuild.id } }),
    prisma.threadEntityTag.create({ data: { threadId: whoThread.id, entityType: 'FACTION', entityId: ashNetwork.id } }),
    prisma.threadEntityTag.create({ data: { threadId: tidebornThread.id, entityType: 'NPC', entityId: tideborn.id } }),
    prisma.threadEntityTag.create({ data: { threadId: tidebornThread.id, entityType: 'NPC', entityId: lena.id } }),
    prisma.threadEntityTag.create({ data: { threadId: aldricThread.id, entityType: 'NPC', entityId: aldric.id } }),
    prisma.threadEntityTag.create({ data: { threadId: templeThread.id, entityType: 'FACTION', entityId: templeOrder.id } }),
    prisma.threadEntityTag.create({ data: { threadId: templeThread.id, entityType: 'NPC', entityId: lena.id } }),
  ])

  const [simultaneousClue, , , vaultRecordsClue] = await Promise.all([
    prisma.clue.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,title: 'The Simultaneous Strike', description: 'All five mages died within minutes of each other across different locations. This required either extraordinary coordination or magic capable of reaching multiple targets at once. The Conclave itself had such magic — but it was supposedly locked in the central vault.' } }),
    prisma.clue.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,title: 'Aldric\'s Burnt Hands', description: 'Aldric\'s hands show old burn scarring consistent with a failed warding spell. The burns are three months old. He claims they are from a cooking accident.' } }),
    prisma.clue.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,title: 'The Ash Network Knew First', description: 'A contact revealed that Voss was offering information about "a coming change in the city\'s leadership" two weeks before the assassination. Someone told them it was coming.' } }),
    prisma.clue.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,title: 'Missing Vault Records', description: 'The Conclave vault\'s access log for the week before the assassination has been removed. Commander Thrace claims it was lost in the fire. Mira says there was no fire near the vault.' } }),
  ])

  await Promise.all([
    prisma.worldEvent.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,title: 'The Night of Silence', description: 'All five Conclave mages are found dead before dawn. No alarm was raised. No witnesses have come forward. The city wakes to find its magical leadership gone.' } }),
    prisma.worldEvent.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,title: 'Aurelius Moves Fast', description: 'Within a week of the assassination, the Aurelius Trading Company files paperwork to eliminate the Conclave\'s trade tariffs. Someone had this drafted in advance.' } }),
    prisma.worldEvent.create({ data: { ownerType: 'CAMPAIGN' as const, ownerId: campaign.id,title: 'The Temple Expands', description: 'The Temple of Silence acquires the deed to two properties adjacent to a Conclave repository. The sale was registered the morning after the assassination.' } }),
  ])

  const session1 = await prisma.gameSession.create({
    data: {
      ownerType: 'CAMPAIGN',
      ownerId: campaign.id,
      number: 1,
      title: 'Smoke and Questions',
      playedOn: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: 'COMPLETED',
      gmSummary: 'Great first session. Players arrived in Verath and immediately got a feel for the tension. The meeting with Mira went well — she is clearly hiding something about her master\'s final days. Castor Vel was a hit, players liked his charm. They found the Aldric lead at the end which should drive session 2.',
      aiSummary: 'The investigators arrived in Verath to find a city holding its breath. Three months after the Conclave\'s assassination, the streets carry an undercurrent of anxious energy — too many factions jockeying for position, too few answers. Their first contact, the apprentice Mira Sorell, received them coolly in a rented townhouse far from her master\'s ruined tower. She wants the killers found but reveals nothing about her own movements that night, deflecting with precision that suggests practice.\n\nA chance encounter with Castor Vel in the Merchant Quarter proved more fruitful — the affable spice trader offered information freely, perhaps too freely, hinting that the Ash Network had prior knowledge of the assassination. His cheerful manner did nothing to hide the calculation behind his eyes.\n\nThe session ended with a breakthrough: a street informant placed Aldric Mourne near the Tower of Ashes in the hour before the mages died. The youngest apprentice, supposedly asleep in his rooms across the city, has some explaining to do.',
    },
  })

  await Promise.all([
    prisma.sessionEntityTag.create({ data: { sessionId: session1.id, entityType: 'NPC', entityId: mira.id } }),
    prisma.sessionEntityTag.create({ data: { sessionId: session1.id, entityType: 'NPC', entityId: castor.id } }),
    prisma.sessionEntityTag.create({ data: { sessionId: session1.id, entityType: 'NPC', entityId: aldric.id } }),
    prisma.sessionEntityTag.create({ data: { sessionId: session1.id, entityType: 'LOCATION', entityId: cityOfVerath.id } }),
    prisma.sessionEntityTag.create({ data: { sessionId: session1.id, entityType: 'FACTION', entityId: apprentices.id } }),
    prisma.sessionEntityTag.create({ data: { sessionId: session1.id, entityType: 'FACTION', entityId: merchantGuild.id } }),
    prisma.sessionEntityTag.create({ data: { sessionId: session1.id, entityType: 'THREAD', entityId: whoThread.id } }),
  ])

  await Promise.all([
    prisma.note.create({ data: { entityType: 'SESSION', entityId: session1.id, campaignId: campaign.id, sessionId: session1.id, authorId: userId, content: plainTextToDoc('Mira flinched when asked about the vault — worth pressing on next session') } }),
    prisma.note.create({ data: { entityType: 'SESSION', entityId: session1.id, campaignId: campaign.id, sessionId: session1.id, authorId: userId, content: plainTextToDoc('Players really engaged with Castor — consider making him a recurring info source with escalating prices') } }),
    prisma.note.create({ data: { entityType: 'SESSION', entityId: session1.id, campaignId: campaign.id, sessionId: session1.id, authorId: userId, content: plainTextToDoc('Aldric lead landed well as session hook — he is scared of Mira specifically, not just generally') } }),
  ])

  await prisma.gameSession.create({
    data: {
      ownerType: 'CAMPAIGN',
      ownerId: campaign.id,
      number: 2,
      title: 'The Youngest Apprentice',
      status: 'PLANNED',
    },
  })

  await Promise.all([
    prisma.note.create({ data: { entityType: 'NPC', entityId: mira.id, campaignId: campaign.id, authorId: userId, content: plainTextToDoc('She knows what was in the vault. She is not saying.') } }),
    prisma.note.create({ data: { entityType: 'NPC', entityId: aldric.id, campaignId: campaign.id, authorId: userId, content: plainTextToDoc('The burn scars are three months old. Exactly three months.') } }),
    prisma.note.create({ data: { entityType: 'NPC', entityId: thrace.id, campaignId: campaign.id, authorId: userId, content: plainTextToDoc('Someone is protecting him. He would have been replaced by now otherwise.') } }),
  ])

  await Promise.all([
    prisma.informationNode.create({ data: { campaignId: campaign.id, entityType: 'NPC', entityId: aldric.id, title: 'Aldric Was There', content: 'Confirmed via street informant: Aldric Mourne was seen near the Tower of Ashes within one hour of the mages\' deaths. His alibi is false.', visibility: 'GM_ONLY' } }),
    prisma.informationNode.create({ data: { campaignId: campaign.id, entityType: 'FACTION', entityId: merchantGuild.id, title: 'Pre-drafted Legislation', content: 'The Aurelius tariff removal paperwork was filed within days of the assassination. It was clearly drafted in advance. Someone in the company knew this was coming.', visibility: 'GM_ONLY' } }),
  ])

  // ---------------------------------------------------------------
  // Two seeded demo players demonstrate information asymmetry.
  //
  // Serafine (arcane lens): sees Aldric by name, knows the Ash Network
  //   only by alias ("An Unknown Network"), has the Simultaneous Strike
  //   clue, and holds the SPECIFIC_PLAYERS "He Was There" node on Aldric.
  //
  // Kael (noble/bureaucratic lens): sees Commander Thrace, the Temple
  //   of Silence, and Sister Lena (by alias "The Temple Envoy"), has
  //   the Missing Vault Records clue, and holds a SPECIFIC_PLAYERS
  //   "A Family Friend" node on the Aurelius Trading Company.
  //
  // Shared baseline is the ensureAllPlayersReveal set below. Toggling
  // "View as player" between them should produce visibly different
  // portals without either feeling empty.
  // ---------------------------------------------------------------

  const serafinePlayer = await prisma.user.upsert({
    where: { email: 'serafine@grimoire.dev' },
    update: {},
    create: {
      email: 'serafine@grimoire.dev',
      name: 'Serafine Ashveil',
      emailVerified: true,
    },
  })

  await prisma.journal.create({
    data: {
      ownerId: serafinePlayer.id,
      name: "Serafine's Journal",
    },
  })

  const kaelPlayer = await prisma.user.upsert({
    where: { email: 'kael@grimoire.dev' },
    update: {},
    create: {
      email: 'kael@grimoire.dev',
      name: 'Kael Vireth',
      emailVerified: true,
    },
  })

  const [serafineMembership, kaelMembership] = await Promise.all([
    prisma.campaignMembership.upsert({
      where: { campaignId_userId: { campaignId: campaign.id, userId: serafinePlayer.id } },
      update: {},
      create: { campaignId: campaign.id, userId: serafinePlayer.id, role: 'PLAYER' },
    }),
    prisma.campaignMembership.upsert({
      where: { campaignId_userId: { campaignId: campaign.id, userId: kaelPlayer.id } },
      update: {},
      create: { campaignId: campaign.id, userId: kaelPlayer.id, role: 'PLAYER' },
    }),
  ])

  const [serafinePC, kaelPC] = await Promise.all([
    prisma.playerCharacter.create({
      data: {
        ownerType: 'CAMPAIGN',
        ownerId: campaign.id,
        linkedUserId: serafinePlayer.id,
        name: 'Serafine Ashveil',
        description: 'A hedge-arcanist raised in the shadow of the Tower of Ashes. Serafine apprenticed briefly under one of Sorell\'s junior scribes before being turned away — too curious, too stubborn. She returned to Verath the week after the assassination, officially for the funerals. She is here to find out which of her former teachers was lying about why.',
        status: 'ACTIVE',
      },
    }),
    prisma.playerCharacter.create({
      data: {
        ownerType: 'CAMPAIGN',
        ownerId: campaign.id,
        linkedUserId: kaelPlayer.id,
        name: 'Kael Vireth',
        description: 'A minor scion of House Vireth — a noble family whose fortunes have been knotted into the Conclave\'s affairs for three generations. Kael is the fifth of five siblings and the only one who reads the court gazette. They returned to Verath to find out which of their aunts is lying about why they left the city the night the mages died.',
        status: 'ACTIVE',
      },
    }),
  ])

  await Promise.all([
    (() => {
      const content = docOfParagraph([
        'Keeps a grudge against ',
        mentionNode('Mira Sorell', 'NPC', mira.id),
        ' — they apprenticed in the same cohort and she remembers being outshone. Useful friction.',
      ])
      return prisma.note.create({
        data: {
          entityType: 'PLAYER_CHARACTER',
          entityId: serafinePC.id,
          campaignId: campaign.id,
          authorId: userId,
          content,
          mentions: extractMentionsFromDoc(content),
        },
      })
    })(),
    (() => {
      const content = docOfParagraph([
        'Treats mysteries like estate paperwork — bureaucratically, patiently, with an eye for the missing signature. Has a standing lunch with ',
        mentionNode('Commander Thrace', 'NPC', thrace.id),
        ' going back years.',
      ])
      return prisma.note.create({
        data: {
          entityType: 'PLAYER_CHARACTER',
          entityId: kaelPC.id,
          campaignId: campaign.id,
          authorId: userId,
          content,
          mentions: extractMentionsFromDoc(content),
        },
      })
    })(),
  ])

  await Promise.all([
    prisma.relationship.create({
      data: {
        campaignId: campaign.id,
        entityTypeA: 'PLAYER_CHARACTER', entityIdA: serafinePC.id,
        entityTypeB: 'NPC', entityIdB: mira.id,
        label: 'former classmate of',
        description: 'Serafine and Mira apprenticed in the same cohort under Sorell\'s scribes. Mira was the star. Serafine was dismissed.',
      },
    }),
    prisma.relationship.create({
      data: {
        campaignId: campaign.id,
        entityTypeA: 'PLAYER_CHARACTER', entityIdA: kaelPC.id,
        entityTypeB: 'NPC', entityIdB: thrace.id,
        label: 'old friend of',
        description: 'The Vireth family and Commander Thrace go back a generation. Kael\'s aunt sponsored his promotion.',
      },
    }),
  ])

  async function ensureAllPlayersReveal(
    entityType: 'NPC' | 'LOCATION' | 'FACTION' | 'THREAD' | 'CLUE' | 'PLAYER_CHARACTER',
    entityId: string,
    overrides?: { displayName?: string; displayDescription?: string }
  ) {
    const existing = await prisma.entityReveal.findFirst({
      where: { campaignId: campaign.id, entityType, entityId, userId: null },
    })
    if (existing) return existing
    return prisma.entityReveal.create({
      data: {
        campaignId: campaign.id,
        entityType,
        entityId,
        userId: null,
        displayName: overrides?.displayName ?? null,
        displayDescription: overrides?.displayDescription ?? null,
      },
    })
  }

  await Promise.all([
    ensureAllPlayersReveal('NPC', mira.id),
    ensureAllPlayersReveal('NPC', castor.id),
    ensureAllPlayersReveal('NPC', tideborn.id, {
      displayName: 'A Grey-Cloaked Figure',
      displayDescription: 'A figure seen moving against the crowd on the night of the assassination. Multiple witnesses. No name. No face.',
    }),
    ensureAllPlayersReveal('LOCATION', cityOfVerath.id),
    ensureAllPlayersReveal('LOCATION', towerOfAshes.id),
    ensureAllPlayersReveal('FACTION', apprentices.id),
    ensureAllPlayersReveal('FACTION', merchantGuild.id),
    ensureAllPlayersReveal('THREAD', whoThread.id),
    ensureAllPlayersReveal('THREAD', tidebornThread.id),
    ensureAllPlayersReveal('PLAYER_CHARACTER', serafinePC.id),
    ensureAllPlayersReveal('PLAYER_CHARACTER', kaelPC.id),
  ])

  await Promise.all([
    prisma.entityReveal.upsert({
      where: { entityType_entityId_userId: { entityType: 'NPC', entityId: aldric.id, userId: serafinePlayer.id } },
      create: { campaignId: campaign.id, entityType: 'NPC', entityId: aldric.id, userId: serafinePlayer.id },
      update: {},
    }),
    prisma.entityReveal.upsert({
      where: { entityType_entityId_userId: { entityType: 'FACTION', entityId: ashNetwork.id, userId: serafinePlayer.id } },
      create: {
        campaignId: campaign.id,
        entityType: 'FACTION',
        entityId: ashNetwork.id,
        userId: serafinePlayer.id,
        displayName: 'An Unknown Network',
        displayDescription: 'A contact hinted at an information brokerage operating somewhere in the city. No name. No face. Just a rumor.',
      },
      update: {},
    }),
    prisma.entityReveal.upsert({
      where: { entityType_entityId_userId: { entityType: 'CLUE', entityId: simultaneousClue.id, userId: serafinePlayer.id } },
      create: { campaignId: campaign.id, entityType: 'CLUE', entityId: simultaneousClue.id, userId: serafinePlayer.id },
      update: {},
    }),
  ])

  await Promise.all([
    prisma.entityReveal.upsert({
      where: { entityType_entityId_userId: { entityType: 'NPC', entityId: thrace.id, userId: kaelPlayer.id } },
      create: { campaignId: campaign.id, entityType: 'NPC', entityId: thrace.id, userId: kaelPlayer.id },
      update: {},
    }),
    prisma.entityReveal.upsert({
      where: { entityType_entityId_userId: { entityType: 'NPC', entityId: lena.id, userId: kaelPlayer.id } },
      create: {
        campaignId: campaign.id,
        entityType: 'NPC',
        entityId: lena.id,
        userId: kaelPlayer.id,
        displayName: 'The Temple Envoy',
        displayDescription: 'A soft-spoken Temple representative who has been visiting your family\'s estate since the assassination. Never gives a name. Never asks for one.',
      },
      update: {},
    }),
    prisma.entityReveal.upsert({
      where: { entityType_entityId_userId: { entityType: 'LOCATION', entityId: templeOfSilence.id, userId: kaelPlayer.id } },
      create: { campaignId: campaign.id, entityType: 'LOCATION', entityId: templeOfSilence.id, userId: kaelPlayer.id },
      update: {},
    }),
    prisma.entityReveal.upsert({
      where: { entityType_entityId_userId: { entityType: 'CLUE', entityId: vaultRecordsClue.id, userId: kaelPlayer.id } },
      create: { campaignId: campaign.id, entityType: 'CLUE', entityId: vaultRecordsClue.id, userId: kaelPlayer.id },
      update: {},
    }),
  ])

  const [, , , aldricRevealedNode, aureliusKaelNode] = await Promise.all([
    prisma.informationNode.create({
      data: {
        campaignId: campaign.id,
        entityType: 'NPC',
        entityId: mira.id,
        title: 'Sorell\'s Apprentice',
        content: 'Mira Sorell was the direct apprentice of Archmage Sorell, the most powerful of the five murdered mages. She is now the de facto leader of the surviving apprentices and is actively investigating the assassination.',
        visibility: 'ALL_PLAYERS',
      },
    }),
    prisma.informationNode.create({
      data: {
        campaignId: campaign.id,
        entityType: 'NPC',
        entityId: castor.id,
        title: 'More Than a Merchant',
        content: 'Castor Vel presents himself as a simple spice trader but his knowledge of city politics and faction movements suggests he is something more. He offered information freely in your first meeting — perhaps too freely.',
        visibility: 'ALL_PLAYERS',
      },
    }),
    prisma.informationNode.create({
      data: {
        campaignId: campaign.id,
        entityType: 'FACTION',
        entityId: merchantGuild.id,
        title: 'They Had Motive',
        content: 'The Aurelius Trading Company filed paperwork to eliminate Conclave trade tariffs within days of the assassination. The paperwork was clearly drafted in advance. Someone inside knew this was coming.',
        visibility: 'ALL_PLAYERS',
      },
    }),
    prisma.informationNode.create({
      data: {
        campaignId: campaign.id,
        entityType: 'NPC',
        entityId: aldric.id,
        title: 'He Was There',
        content: 'A street informant placed Aldric near the Tower of Ashes within the hour before the mages died. His alibi puts him across the city. One of these is a lie.',
        visibility: 'SPECIFIC_PLAYERS',
      },
    }),
    prisma.informationNode.create({
      data: {
        campaignId: campaign.id,
        entityType: 'FACTION',
        entityId: merchantGuild.id,
        title: 'A Family Friend',
        content: 'Castor Vel has been a guest at Vireth family dinners for years. He plays cards terribly and drinks his host\'s wine. Your aunt swears he is harmless. Your aunt is also the one who drafted the tariff legislation.',
        visibility: 'SPECIFIC_PLAYERS',
      },
    }),
  ])

  await Promise.all([
    prisma.informationNodeReveal.upsert({
      where: { informationNodeId_membershipId: { informationNodeId: aldricRevealedNode.id, membershipId: serafineMembership.id } },
      create: { informationNodeId: aldricRevealedNode.id, membershipId: serafineMembership.id },
      update: {},
    }),
    prisma.informationNodeReveal.upsert({
      where: { informationNodeId_membershipId: { informationNodeId: aureliusKaelNode.id, membershipId: kaelMembership.id } },
      create: { informationNodeId: aureliusKaelNode.id, membershipId: kaelMembership.id },
      update: {},
    }),
  ])

  // Seed a few realistic ChangelogEntry rows so the dashboard's
  // activity feed is non-empty on first login. Spaced several days
  // apart so the feed reads like genuine campaign work, not a
  // freshly-seeded artifact.
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  await Promise.all([
    prisma.changelogEntry.create({
      data: {
        entityType: 'NPC',
        entityId: mira.id,
        campaignId: campaign.id,
        authorId: userId,
        field: 'created',
        newValue: mira.name,
        createdAt: new Date(now - 9 * day),
      },
    }),
    prisma.changelogEntry.create({
      data: {
        entityType: 'FACTION',
        entityId: ashNetwork.id,
        campaignId: campaign.id,
        authorId: userId,
        field: 'created',
        newValue: ashNetwork.name,
        createdAt: new Date(now - 7 * day),
      },
    }),
    prisma.changelogEntry.create({
      data: {
        entityType: 'THREAD',
        entityId: whoThread.id,
        campaignId: campaign.id,
        authorId: userId,
        field: 'urgency',
        oldValue: 'HIGH',
        newValue: 'CRITICAL',
        createdAt: new Date(now - 4 * day),
      },
    }),
    prisma.changelogEntry.create({
      data: {
        entityType: 'NPC',
        entityId: aldric.id,
        campaignId: campaign.id,
        authorId: userId,
        field: 'description',
        oldValue: 'The youngest apprentice. Shy.',
        newValue: aldric.description ?? aldric.name,
        createdAt: new Date(now - 2 * day),
      },
    }),
    prisma.changelogEntry.create({
      data: {
        entityType: 'CLUE',
        entityId: simultaneousClue.id,
        campaignId: campaign.id,
        authorId: userId,
        field: 'created',
        newValue: simultaneousClue.title,
        createdAt: new Date(now - 1 * day),
      },
    }),
  ])

  return campaign
}
