'use client'

/**
 * app/(admin)/credits/CreditAdjustmentDialog.tsx
 * Dialog for manually adjusting a user's credit balance.
 * TODO: implement form + addCreditAdjustment Server Action call.
 */

interface User {
  id: string
  anonymous_username: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CreditAdjustmentDialog({ users: _ }: { users: User[] }) {
  return null
}
