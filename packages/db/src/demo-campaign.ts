import type { PrismaClient } from '@prisma/client'

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
    prisma.location.create({ data: { campaignId: campaign.id, name: 'Verath', description: 'A city of spires built on the ruins of an older civilization. Five towers once dominated the skyline — one for each Conclave mage. Three now stand dark and cold.' } }),
    prisma.location.create({ data: { campaignId: campaign.id, name: 'The Tower of Ashes', description: 'The tower that belonged to Archmage Sorell, the most powerful of the five. It burned on the night of the assassination. Locals say they still see lights in the upper windows.' } }),
    prisma.location.create({ data: { campaignId: campaign.id, name: 'The Merchant Quarter', description: 'The beating commercial heart of Verath. The Aurelius Trading Company controls most of the trade flowing through the city gates.' } }),
    prisma.location.create({ data: { campaignId: campaign.id, name: 'The Temple of Silence', description: 'A religious order devoted to a god of secrets and endings. They claim neutrality but have been suspiciously well-informed since the assassination.' } }),
    prisma.location.create({ data: { campaignId: campaign.id, name: 'The Undercity', description: 'A labyrinth of tunnels, collapsed aqueducts, and forgotten vaults beneath Verath. The Ash Network operates from somewhere down here.' } }),
  ])

  void towerOfAshes
  void undercity

  const [apprentices, merchantGuild, cityGuard, ashNetwork, templeOrder] = await Promise.all([
    prisma.faction.create({ data: { campaignId: campaign.id, name: 'The Surviving Apprentices', description: 'Three of the five Conclave mages had apprentices who survived the assassination night. They have banded together out of necessity but trust each other poorly.', agenda: 'Rebuild the Conclave under their own leadership — and find out which of them might be next.' } }),
    prisma.faction.create({ data: { campaignId: campaign.id, name: 'Aurelius Trading Company', description: 'The wealthiest merchant house in Verath. The Conclave taxed their trade heavily and regulated their use of enchanted goods. Their motive is obvious.', agenda: 'Fill the power vacuum with commerce. A city without a Conclave is a city they can own.' } }),
    prisma.faction.create({ data: { campaignId: campaign.id, name: 'The City Watch', description: 'Nominally responsible for investigating the assassination, but Commander Thrace has made very little progress in three months. Either incompetent or compromised.', agenda: 'Maintain order and protect their own. Someone powerful is pulling their strings.' } }),
    prisma.faction.create({ data: { campaignId: campaign.id, name: 'The Ash Network', description: 'A thieves and information brokerage operating out of the Undercity. They knew about the assassination before it happened — they just claim they were not involved.', agenda: 'Profit from chaos. Sell information to all sides and stay invisible.' } }),
    prisma.faction.create({ data: { campaignId: campaign.id, name: 'The Temple of Silence', description: 'A secretive religious order that has quietly expanded its influence since the assassination. They speak of the Conclave\'s fall as inevitable — almost as if they expected it.', agenda: 'Unclear. But they are collecting the Conclave\'s scattered research and artifacts with unusual urgency.' } }),
  ])

  void cityGuard

  const [mira, castor, thrace, lena, voss, tideborn, aldric] = await Promise.all([
    prisma.nPC.create({ data: { campaignId: campaign.id, name: 'Mira Sorell', description: 'Apprentice to the murdered Archmage Sorell and the most powerful of the surviving apprentices. Brilliant, ruthless, and visibly grieving — though it is hard to tell if she mourns her master or her lost future.', locationId: cityOfVerath.id, status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { campaignId: campaign.id, name: 'Castor Vel', description: 'A jovial spice merchant who is almost certainly the public face of the Aurelius Trading Company\'s intelligence operations. Always has information. Always wants something in return.', locationId: merchantQuarter.id, status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { campaignId: campaign.id, name: 'Commander Thrace', description: 'Head of the City Watch. A tired man who looks like he has not slept in three months. The party suspects he knows more than he admits.', locationId: cityOfVerath.id, status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { campaignId: campaign.id, name: 'Sister Lena', description: 'A mid-ranking priest of the Temple of Silence who has been seen meeting with members of every faction in the city. Polite, soft-spoken, and deeply unsettling.', locationId: templeOfSilence.id, status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { campaignId: campaign.id, name: 'Voss', description: 'The only known face of the Ash Network — a contact who appears in taverns, passes notes, and disappears. Nobody knows their real name or face.', status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { campaignId: campaign.id, name: 'The Tideborn', description: 'An unknown figure who has appeared in witness accounts from the night of the assassination. Described only as "dressed in grey, moving against the crowd." No one knows who they are.', status: 'ACTIVE' } }),
    prisma.nPC.create({ data: { campaignId: campaign.id, name: 'Aldric Mourne', description: 'The youngest surviving apprentice. Nineteen years old, clearly terrified, and hiding something. He was the only apprentice in the city when the Conclave was killed.', locationId: cityOfVerath.id, status: 'ACTIVE' } }),
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
    prisma.thread.create({ data: { campaignId: campaign.id, title: 'Who Killed the Conclave?', description: 'The central question. Five mages killed in a single night with no survivors and almost no witnesses. Every faction has motive. None of them are talking.', status: 'OPEN', urgency: 'CRITICAL' } }),
    prisma.thread.create({ data: { campaignId: campaign.id, title: 'The Tideborn', description: 'A mysterious grey-cloaked figure seen moving through the crowds on assassination night. Multiple witnesses. No identity. Sister Lena seems to know who they are.', status: 'OPEN', urgency: 'HIGH' } }),
    prisma.thread.create({ data: { campaignId: campaign.id, title: 'What Is Aldric Hiding?', description: 'The youngest apprentice was the only one in the city that night. He claims he saw nothing. He is clearly lying.', status: 'OPEN', urgency: 'HIGH' } }),
    prisma.thread.create({ data: { campaignId: campaign.id, title: 'The Temple\'s Expanding Influence', description: 'The Temple of Silence has quietly acquired three properties in the city and two of the Conclave\'s research repositories since the assassination. This seems like preparation, not opportunism.', status: 'OPEN', urgency: 'MEDIUM' } }),
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

  await Promise.all([
    prisma.clue.create({ data: { campaignId: campaign.id, title: 'The Simultaneous Strike', description: 'All five mages died within minutes of each other across different locations. This required either extraordinary coordination or magic capable of reaching multiple targets at once. The Conclave itself had such magic — but it was supposedly locked in the central vault.' } }),
    prisma.clue.create({ data: { campaignId: campaign.id, title: 'Aldric\'s Burnt Hands', description: 'Aldric\'s hands show old burn scarring consistent with a failed warding spell. The burns are three months old. He claims they are from a cooking accident.' } }),
    prisma.clue.create({ data: { campaignId: campaign.id, title: 'The Ash Network Knew First', description: 'A contact revealed that Voss was offering information about "a coming change in the city\'s leadership" two weeks before the assassination. Someone told them it was coming.' } }),
    prisma.clue.create({ data: { campaignId: campaign.id, title: 'Missing Vault Records', description: 'The Conclave vault\'s access log for the week before the assassination has been removed. Commander Thrace claims it was lost in the fire. Mira says there was no fire near the vault.' } }),
  ])

  await Promise.all([
    prisma.worldEvent.create({ data: { campaignId: campaign.id, title: 'The Night of Silence', description: 'All five Conclave mages are found dead before dawn. No alarm was raised. No witnesses have come forward. The city wakes to find its magical leadership gone.' } }),
    prisma.worldEvent.create({ data: { campaignId: campaign.id, title: 'Aurelius Moves Fast', description: 'Within a week of the assassination, the Aurelius Trading Company files paperwork to eliminate the Conclave\'s trade tariffs. Someone had this drafted in advance.' } }),
    prisma.worldEvent.create({ data: { campaignId: campaign.id, title: 'The Temple Expands', description: 'The Temple of Silence acquires the deed to two properties adjacent to a Conclave repository. The sale was registered the morning after the assassination.' } }),
  ])

  const session1 = await prisma.gameSession.create({
    data: {
      campaignId: campaign.id,
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
    prisma.note.create({ data: { entityType: 'SESSION', entityId: session1.id, campaignId: campaign.id, sessionId: session1.id, authorId: userId, content: 'Mira flinched when asked about the vault — worth pressing on next session' } }),
    prisma.note.create({ data: { entityType: 'SESSION', entityId: session1.id, campaignId: campaign.id, sessionId: session1.id, authorId: userId, content: 'Players really engaged with Castor — consider making him a recurring info source with escalating prices' } }),
    prisma.note.create({ data: { entityType: 'SESSION', entityId: session1.id, campaignId: campaign.id, sessionId: session1.id, authorId: userId, content: 'Aldric lead landed well as session hook — he is scared of Mira specifically, not just generally' } }),
  ])

  await prisma.gameSession.create({
    data: {
      campaignId: campaign.id,
      number: 2,
      title: 'The Youngest Apprentice',
      status: 'PLANNED',
    },
  })

  await Promise.all([
    prisma.note.create({ data: { entityType: 'NPC', entityId: mira.id, campaignId: campaign.id, authorId: userId, content: 'She knows what was in the vault. She is not saying.' } }),
    prisma.note.create({ data: { entityType: 'NPC', entityId: aldric.id, campaignId: campaign.id, authorId: userId, content: 'The burn scars are three months old. Exactly three months.' } }),
    prisma.note.create({ data: { entityType: 'NPC', entityId: thrace.id, campaignId: campaign.id, authorId: userId, content: 'Someone is protecting him. He would have been replaced by now otherwise.' } }),
  ])

  await Promise.all([
    prisma.informationNode.create({ data: { campaignId: campaign.id, entityType: 'NPC', entityId: aldric.id, title: 'Aldric Was There', content: 'Confirmed via street informant: Aldric Mourne was seen near the Tower of Ashes within one hour of the mages\' deaths. His alibi is false.', visibility: 'GM_ONLY' } }),
    prisma.informationNode.create({ data: { campaignId: campaign.id, entityType: 'FACTION', entityId: merchantGuild.id, title: 'Pre-drafted Legislation', content: 'The Aurelius tariff removal paperwork was filed within days of the assassination. It was clearly drafted in advance. Someone in the company knew this was coming.', visibility: 'GM_ONLY' } }),
  ])

  return campaign
}
