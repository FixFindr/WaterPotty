import { createServiceClient } from '@/lib/supabase-server'

export default async function WashroomsPage() {
  const supabase = createServiceClient()
  const { data: washrooms, error } = await supabase
    .from('washrooms')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
        Failed to load washrooms: {error.message}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Washrooms</h1>
        <span className="text-sm text-muted-foreground">{washrooms?.length ?? 0} results</span>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Verified</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pay to Use</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cleanliness</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
            </tr>
          </thead>
          <tbody>
            {washrooms?.map((w) => (
              <tr key={w.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{w.name}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{w.type.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    w.status === 'open'     ? 'bg-green-100 text-green-800'  :
                    w.status === 'pinned'   ? 'bg-yellow-100 text-yellow-800':
                    w.status === 'occupied' ? 'bg-red-100 text-red-800'      :
                    w.status === 'closed'   ? 'bg-gray-100 text-gray-600'    :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {w.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{w.verified ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-muted-foreground">{w.is_pay_to_use ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{w.last_cleanliness ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(w.created_at).toLocaleDateString('en-CA')}
                </td>
              </tr>
            ))}
            {!washrooms?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No washrooms found. Run Phase 2 database migrations first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
