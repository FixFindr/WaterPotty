export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 border border-border rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Water Potty</h1>
          <p className="text-sm text-muted-foreground mt-1">Admin dashboard — restricted access.</p>
        </div>
        {/* TODO Phase 3: Implement Supabase Auth email/password login form */}
        <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
          Auth not yet implemented. Complete Phase 3.
        </div>
      </div>
    </main>
  )
}
