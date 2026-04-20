import { ZodError, ZodSchema } from 'zod'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'

export function mcpValidationError(err: ZodError): never {
  const details = err.issues
    .map((i) => {
      const path = i.path.length ? i.path.join('.') : 'input'
      return `${path}: ${i.message.toLowerCase()}`
    })
    .join(', ')
  throw new McpError(ErrorCode.InvalidParams, `Invalid input: ${details}`)
}

export function validateInput<T>(schema: ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) mcpValidationError(result.error)
  return result.data
}
