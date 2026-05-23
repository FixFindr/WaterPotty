// TODO Phase 3: Add Supabase auth guard — redirect non-admins to /login
// import { createServiceClient } from '@/lib/supabase-server'
// import { redirect } from 'next/navigation'

const NAV_LINKS = [
  { href: '/washrooms',    label: 'Washrooms' },
  { href: '/users',        label: 'Users' },
  { href: '/flags',        label: 'Flags' },
  { href: '/verifications',label: 'Verifications' },
  { href: '/credits',      label: 'Credits' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border p-4 flex flex-col">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground">Water Potty</h2>
          <p className="text-xs text-muted-foreground">Admin Dashboard</p>
        </div>
        <nav className="space-y-1 flex-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-border pt-4">
          <a
            href="/login"
            className="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            Sign Out
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 bg-background overflow-auto">
        {children}
      </main>
    </div>
  )
}
