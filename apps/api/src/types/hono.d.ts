import 'hono'

declare module 'hono' {
  interface ContextVariableMap {
    user: {
      id: string
      email: string
      name: string
      image?: string | null
      emailVerified: boolean
      createdAt: Date
      updatedAt: Date
    }
    session: {
      id: string
      userId: string
      token: string
      expiresAt: Date
      createdAt: Date
      updatedAt: Date
      ipAddress?: string | null
      userAgent?: string | null
    }
  }
}
