'use client'

import { Dialog as Primitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComponentProps, ReactNode } from 'react'

export const Sheet = Primitive.Root
export const SheetTrigger = Primitive.Trigger
export const SheetClose = Primitive.Close

const SIDE_CLASSES: Record<'top' | 'bottom' | 'left' | 'right', string> = {
  top: 'inset-x-0 top-0 max-h-[90vh] border-b rounded-b-lg data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top',
  bottom: 'inset-x-0 bottom-0 max-h-[90vh] border-t rounded-t-lg data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
  left: 'inset-y-0 left-0 h-full w-full sm:max-w-md border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
  right: 'inset-y-0 right-0 h-full w-full sm:max-w-md border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
}

interface SheetContentProps extends ComponentProps<typeof Primitive.Content> {
  side?: 'top' | 'bottom' | 'left' | 'right'
  children?: ReactNode
}

export function SheetContent({
  className,
  side = 'bottom',
  children,
  ...props
}: SheetContentProps) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-black/60',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
        )}
      />
      <Primitive.Content
        className={cn(
          'fixed z-50 flex flex-col gap-4 bg-background p-6 shadow-lg outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300',
          SIDE_CLASSES[side],
          className
        )}
        {...props}
      >
        {children}
        <Primitive.Close className="absolute right-4 top-4 rounded-sm p-2 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  )
}

export function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 text-left', className)} {...props} />
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title className={cn('text-lg font-semibold', className)} {...props} />
}

export function SheetDescription({ className, ...props }: ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-auto pt-2', className)} {...props} />
}
