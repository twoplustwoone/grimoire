'use client'

import { DropdownMenu as Primitive } from 'radix-ui'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

export const DropdownMenu = Primitive.Root
export const DropdownMenuTrigger = Primitive.Trigger

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = 'end',
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 min-w-[10rem] overflow-hidden rounded-md border bg-popover text-popover-foreground p-1 shadow-md',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      />
    </Primitive.Portal>
  )
}

export function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: ComponentProps<typeof Primitive.Item> & { inset?: boolean; variant?: 'default' | 'destructive' }) {
  return (
    <Primitive.Item
      className={cn(
        'relative flex items-center gap-2 rounded-sm px-3 py-3 md:py-1.5 text-sm outline-none select-none cursor-pointer min-h-11 md:min-h-0',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        inset && 'pl-8',
        variant === 'destructive' && 'text-destructive focus:bg-destructive/10 focus:text-destructive',
        className
      )}
      {...props}
    />
  )
}

export function DropdownMenuRadioGroup(props: ComponentProps<typeof Primitive.RadioGroup>) {
  return <Primitive.RadioGroup {...props} />
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.RadioItem>) {
  return (
    <Primitive.RadioItem
      className={cn(
        'relative flex items-center gap-2 rounded-sm pl-8 pr-3 py-3 md:py-1.5 text-sm outline-none select-none cursor-pointer min-h-11 md:min-h-0',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <Primitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </Primitive.ItemIndicator>
      </span>
      {children}
    </Primitive.RadioItem>
  )
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Primitive.Separator>) {
  return <Primitive.Separator className={cn('my-1 h-px bg-muted', className)} {...props} />
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Primitive.Label>) {
  return (
    <Primitive.Label
      className={cn('px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider', className)}
      {...props}
    />
  )
}
