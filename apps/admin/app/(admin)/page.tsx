import { redirect } from 'next/navigation'

// Default (admin) route redirects to washrooms
export default function AdminIndexPage() {
  redirect('/washrooms')
}
