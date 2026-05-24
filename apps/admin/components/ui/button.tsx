'use client'

/**
 * components/ui/button.tsx
 *
 * Minimal Button implementation — shadcn/ui API surface, no Radix dependency.
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Accepted but unused — always renders a <button>. */
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild: _, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'default'     && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'ghost'       && 'hover:bg-accent hover:text-accent-foreground',
        variant === 'outline'     && 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
        variant === 'secondary'   && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        size === 'default' && 'h-9 px-4 py-2',
        size === 'sm'      && 'h-7 rounded px-2 text-xs',
        size === 'lg'      && 'h-11 px-8',
        size === 'icon'    && 'h-9 w-9',
        className,
      )}
      {...props}
    />
  )
)
Button.displayName = 'Button'
