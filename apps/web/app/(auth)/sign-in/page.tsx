import type { Metadata } from 'next'
import { SignInForm } from './sign-in-form'

export const metadata: Metadata = { title: 'Sign In' }

interface Props {
  searchParams: Promise<{ invite?: string }>
}

export default async function SignInPage({ searchParams }: Props) {
  const { invite } = await searchParams
  return (
    <>
      <h1 className="sr-only">Sign in to Grimoire</h1>
      <SignInForm inviteToken={invite} />
    </>
  )
}
