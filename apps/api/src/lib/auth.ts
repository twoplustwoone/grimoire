import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@grimoire/db'
import { createDemoCampaign } from '@grimoire/db/demo-campaign'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3005',
  trustedOrigins: [
    process.env.WEB_URL ?? 'http://localhost:3000',
  ],
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await createDemoCampaign(prisma, user.id)
          } catch (e) {
            console.error('Failed to create demo campaign for new user:', e)
          }
        },
      },
    },
  },
})

export type Auth = typeof auth
