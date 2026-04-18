import type { Metadata } from 'next'
import { SignUpForm } from './sign-up-form'

export const metadata: Metadata = { title: 'Sign Up' }

export default function SignUpPage() {
  return (
    <>
      <h1 className="sr-only">Create your Grimoire account</h1>
      <SignUpForm />
    </>
  )
}
