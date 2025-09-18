interface DraftPageProps { params: { id: string } }

async function fetchDrafts(id: string) {
  try {
    const res = await fetch(`http://localhost:4000/api/drafts/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export default async function DraftPage({ params }: DraftPageProps) {
  const draft = await fetchDrafts(params.id);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Draft Detail</h2>
      {!draft && <p className="text-neutral-500">Draft not found.</p>}
      {draft && (
        <div className="space-y-2">
          <div className="p-4 border rounded bg-white shadow-sm">
            <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Tone: {draft.tone}</div>
            <pre className="whitespace-pre-wrap text-sm">{draft.draftText}</pre>
          </div>
          <form action={`/api/drafts/${draft.id}/send`} method="post" className="flex gap-3">
            <button className="bg-blue-600 text-white px-4 py-2 rounded" disabled>Send (API stub)</button>
          </form>
        </div>
      )}
    </div>
  );
}
