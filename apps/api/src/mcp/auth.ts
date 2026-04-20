import type { PrismaClient, CampaignMembership } from '@grimoire/db'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'

export async function requireMember(
  userId: string,
  campaignId: string,
  db: PrismaClient
): Promise<CampaignMembership> {
  const membership = await db.campaignMembership.findFirst({
    where: { campaignId, userId },
  })
  if (!membership) {
    throw new McpError(ErrorCode.InvalidParams, 'Campaign not found or access denied')
  }
  return membership
}

export async function requireGM(
  userId: string,
  campaignId: string,
  db: PrismaClient
): Promise<CampaignMembership> {
  const membership = await db.campaignMembership.findFirst({
    where: { campaignId, userId },
  })
  if (!membership) {
    throw new McpError(ErrorCode.InvalidParams, 'Campaign not found or access denied')
  }
  if (membership.role !== 'GM' && membership.role !== 'CO_GM') {
    throw new McpError(ErrorCode.InvalidParams, 'GM or CO_GM role required for this action')
  }
  return membership
}
