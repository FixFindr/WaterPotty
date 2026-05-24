'use client'

/**
 * components/ui/dropdown-menu.tsx
 *
 * Minimal DropdownMenu implementation — shadcn/ui API surface, no Radix dependency.
 * Uses a fixed-scrim click-outside pattern (same approach as alert-dialog).
 */

import {
  createContext, useContext, useState,
  cloneElement, isValidElement,
  type ReactNode, type ReactElement,
} from 'react'
import { cn } from '@/lib/utils'

// ── Context ───────────────────────────────────────────────────────────────────

interface Ctx { open: boolean; onOpenChange: (v: boolean) => void }
const DropdownCtx = createContext<Ctx>({ open: false, onOpenChange: () => {} })

// ── Root ──────────────────────────────────────────────────────────────────────

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <DropdownCtx.Provider value={{ open, onOpenChange: setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownCtx.Provider>
  )
}

// ── Trigger ───────────────────────────────────────────────────────────────────

export function DropdownMenuTrigger({
  asChild,
  children,
}: {
  asChild?: boolean
  children: ReactNode
}) {
  const { open, onOpenChange } = useContext(DropdownCtx)
  const toggle = () => onOpenChange(!open)
  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<{ onClick?: () => void }>, { onClick: toggle })
  }
  return <button type="button" onClick={toggle}>{children}</button>
}

// ── Content ───────────────────────────────────────────────────────────────────

export function DropdownMenuContent({
  children,
  className,
  align = 'start',
}: {
  children: ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
}) {
  const { open, onOpenChange } = useContext(DropdownCtx)
  if (!open) return null
  return (
    <>
      {/* Click scrim — closes menu on outside click */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => onOpenChange(false)}
      />
      <div className={cn(
        'absolute z-50 mt-1 min-w-[8rem] rounded-md border shadow-lg py-1',
        align === 'end'    ? 'right-0' :
        align === 'center' ? 'left-1/2 -translate-x-1/2' :
        'left-0',
        className,
      )}>
        {children}
      </div>
    </>
  )
}

// ── Item ──────────────────────────────────────────────────────────────────────

export function DropdownMenuItem({
  children,
  className,
  onClick,
  asChild,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  asChild?: boolean
}) {
  const { onOpenChange } = useContext(DropdownCtx)
  const handleClick = () => {
    onClick?.()
    onOpenChange(false)
  }
  if (asChild && isValidElement(children)) {
    return cloneElement(
      children as ReactElement<{ className?: string; onClick?: () => void }>,
      {
        className: cn(
          'flex w-full items-center px-3 py-1.5 text-sm cursor-pointer',
          (children.props as { className?: string }).className,
        ),
        onClick: handleClick,
      }
    )
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex w-full items-center px-3 py-1.5 text-sm cursor-pointer',
        'hover:bg-accent hover:text-accent-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

// ── Separator ─────────────────────────────────────────────────────────────────

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('my-1 h-px bg-border', className)} />
}
