import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { JournalsList } from './journals-list'

export const metadata: Metadata = { title: 'Journals' }

export default async function JournalsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const rows = await prisma.journal.findMany({
    where: { ownerId: session.user.id, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    include: { linkedCampaign: { select: { name: true } } },
  })

  const journals = rows.map((j) => ({
    id: j.id,
    name: j.name,
    linkedCampaignName: j.linkedCampaign?.name ?? null,
    updatedAt: j.updatedAt,
  }))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Journals</h1>
          <p className="text-muted-foreground mt-1">Your personal chronicles</p>
        </div>
        <Button asChild>
          <Link href="/journals/new">
            <Plus className="h-4 w-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">New journal</span>
          </Link>
        </Button>
      </div>

      {journals.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You haven&apos;t created any journals yet. Start one to track your character&apos;s story.
            </p>
            <Button asChild>
              <Link href="/journals/new">
                <Plus className="h-4 w-4 mr-2" />
                New journal
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <JournalsList journals={journals} />
      )}
    </div>
  )
}
