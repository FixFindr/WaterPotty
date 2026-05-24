'use client'

/**
 * components/ui/dialog.tsx
 *
 * Minimal Dialog implementation — shadcn/ui API surface, no Radix dependency.
 * Supports both controlled (open + onOpenChange) and uncontrolled usage.
 */

import {
  createContext, useContext, useState,
  cloneElement, isValidElement,
  type ReactNode, type ReactElement,
} from 'react'
import { cn } from '@/lib/utils'

// ── Context ───────────────────────────────────────────────────────────────────

interface Ctx { open: boolean; onOpenChange: (v: boolean) => void }
const DialogCtx = createContext<Ctx>({ open: false, onOpenChange: () => {} })

// ── Root ──────────────────────────────────────────────────────────────────────

export function Dialog({
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (v: boolean) => void
  children: ReactNode
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const handleChange = (v: boolean) => {
    setUncontrolledOpen(v)
    onOpenChange?.(v)
  }
  return (
    <DialogCtx.Provider value={{ open, onOpenChange: handleChange }}>
      {children}
    </DialogCtx.Provider>
  )
}

// ── Trigger ───────────────────────────────────────────────────────────────────

export function DialogTrigger({
  asChild,
  children,
}: {
  asChild?: boolean
  children: ReactNode
}) {
  const { open, onOpenChange } = useContext(DialogCtx)
  const toggle = () => onOpenChange(!open)
  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<{ onClick?: () => void }>, { onClick: toggle })
  }
  return <button type="button" onClick={toggle}>{children}</button>
}

// ── Content ───────────────────────────────────────────────────────────────────

export function DialogContent({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { open, onOpenChange } = useContext(DialogCtx)
  if (!open) return null
  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog box */}
      <div className={cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-md',
        '-translate-x-1/2 -translate-y-1/2',
        'rounded-xl border p-6 shadow-2xl',
        className,
      )}>
        {children}
      </div>
    </>
  )
}

// ── Layout helpers ────────────────────────────────────────────────────────────

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-4 space-y-1.5">{children}</div>
}

export function DialogTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <h2 className={cn('text-lg font-semibold', className)}>{children}</h2>
}
