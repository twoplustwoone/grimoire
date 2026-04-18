import type { Metadata } from 'next'
import { SignUpForm } from './sign-up-form'

export const metadata: Metadata = { title: 'Sign Up' }

interface Props {
  searchParams: Promise<{ invite?: string; email?: string }>
}

export default async function SignUpPage({ searchParams }: Props) {
  const { invite, email } = await searchParams
  return (
    <>
      <h1 className="sr-only">Create your Grimoire account</h1>
      <SignUpForm inviteToken={invite} invitedEmail={email} />
    </>
  )
}
