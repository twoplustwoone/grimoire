import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ComponentProps, ReactNode } from 'react'

type Variant = ComponentProps<typeof Button>['variant']

interface BaseProps {
  children: ReactNode
  variant?: Variant
  className?: string
}

type PageHeaderActionProps =
  | (BaseProps & { href: string; onClick?: never; type?: never; disabled?: never })
  | (BaseProps & {
      href?: undefined
      onClick?: ComponentProps<'button'>['onClick']
      type?: ComponentProps<'button'>['type']
      disabled?: boolean
    })

// Primary CTA with responsive sizing:
//   - below sm: full width (fills its container, stacks under any sibling)
//   - sm..md: inline, auto width, still 44px tall for touch
//   - md+: inline, auto width, 32px (Shadcn default)
//
// Primary use: the "New X" button in an entity index page header, where
// the header row is `flex-col sm:flex-row`. Also reused for the CTA in
// each index page's "No X yet" empty-state card — the full-width-below-sm
// behavior reads as a dominant call-to-action inside a centered card,
// which is the intent of that surface.
//
// Discriminates on `href`: with it, renders Button-styled Link; without,
// renders a Button with onClick.
export function PageHeaderAction(props: PageHeaderActionProps) {
  const { children, variant = 'default', className } = props
  const sizing = 'h-11 md:h-8 w-full sm:w-auto'

  if ('href' in props && props.href) {
    return (
      <Button asChild variant={variant} className={cn(sizing, className)}>
        <Link href={props.href}>{children}</Link>
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      className={cn(sizing, className)}
      onClick={props.onClick}
      type={props.type}
      disabled={props.disabled}
    >
      {children}
    </Button>
  )
}
