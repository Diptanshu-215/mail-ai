"use client";
import { useEffect, useState } from 'react';

interface EmailRow {
  id: string;
  sender: string;
  subject: string;
  classificationLabel?: string | null;
  fetchedAt: string;
}

interface EmailDetail extends EmailRow {
  recipients: string;
  snippet?: string | null;
  labels?: any;
}

export default function InboxPage() {
  const api = process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:4000';
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmailDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  async function openEmail(id: string) {
    setOpenId(id);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await fetch(api + `/api/emails/${id}`, { credentials: 'include' });
      if (!res.ok) { setDetailError('Failed to load email'); return; }
      const data = await res.json();
      setDetail(data);
    } catch (e) {
      setDetailError('Network error');
    } finally {
      setDetailLoading(false);
    }
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(api + '/api/emails', { credentials: 'include' });
      if (res.status === 401) { setError('Not authenticated. Please sign in.'); setEmails([]); return; }
      if (!res.ok) { setError('Failed to load'); return; }
      const data = await res.json();
      setEmails(data.items || []);
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function generateDraft(emailId: string) {
    await fetch(api + `/api/emails/${emailId}/draft`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tones: ['friendly'] }) });
    // Could poll for draft status later
    alert('Draft generation queued');
  }

  useEffect(() => { load(); }, []);

  return (
    <>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Inbox</h2>
        <div className="flex gap-2">
          <button disabled={fetching} onClick={async () => {
            setFetching(true); setFetchMsg(null);
            try {
              const res = await fetch(api + '/api/emails/fetch', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ count: 10 }) });
              if (res.status === 401) { setError('Not authenticated. Please sign in.'); return; }
              const data = await res.json();
              if (!res.ok) {
                setFetchMsg(data.error || 'Fetch failed');
              } else {
                setFetchMsg(`Fetched ${data.inserted} new (of ${data.attempted || '?'}).`);
                await load();
              }
            } catch (e) {
              setFetchMsg('Fetch failed');
            } finally {
              setFetching(false);
            }
          }} className="text-sm px-3 py-1 rounded border bg-white hover:bg-neutral-50 disabled:opacity-50">{fetching ? 'Fetching...' : 'Fetch Gmail'}</button>
          <button onClick={load} className="text-sm px-3 py-1 rounded border bg-white hover:bg-neutral-50">Refresh</button>
        </div>
      </div>
      {loading && <p className="text-sm text-neutral-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {fetchMsg && <p className="text-xs text-neutral-500">{fetchMsg}</p>}
      {!loading && !error && (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-neutral-500"><th>From</th><th>Subject</th><th>Label</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {emails.map(e => (
              <tr key={e.id} className="border-b hover:bg-neutral-50">
                <td className="py-1 pr-4">{e.sender}</td>
                <td className="py-1 pr-4"><button onClick={() => openEmail(e.id)} className="text-blue-600 hover:underline text-left" title="Open email">{e.subject}</button></td>
                <td className="py-1 pr-4">{e.classificationLabel || '-'}</td>
                <td className="py-1 text-neutral-500 text-xs">{new Date(e.fetchedAt).toLocaleDateString()}</td>
                <td className="py-1 text-right"><button onClick={() => generateDraft(e.id)} className="text-xs px-2 py-1 border rounded hover:bg-neutral-100">Draft</button></td>
              </tr>
            ))}
            {emails.length === 0 && <tr><td colSpan={5} className="py-4 text-neutral-500">No emails found.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
      {openId ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setOpenId(null);
            }
          }}
        >
          <div className="bg-white rounded shadow-md w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <h3 className="font-semibold text-sm">Email Detail</h3>
              <button
                onClick={() => setOpenId(null)}
                className="text-xs px-2 py-1 rounded border hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-auto text-sm space-y-3">
              {detailLoading && <p className="text-neutral-500">Loading...</p>}
              {detailError && <p className="text-red-600">{detailError}</p>}
              {!detailLoading && !detailError && detail && (
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-neutral-500">Subject</div>
                    <div className="font-medium">{detail.subject}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-neutral-500">From</div>
                      <div>{detail.sender}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">To</div>
                      <div className="break-all">{detail.recipients}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500">Labels</div>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(detail.labels)
                        ? (detail.labels as any[]).map((l) => (
                            <span
                              key={String(l)}
                              className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 border"
                            >
                              {String(l)}
                            </span>
                          ))
                        : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500">Snippet</div>
                    <div className="whitespace-pre-wrap text-neutral-700">
                      {detail.snippet || '(no snippet)'}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-400">
                    Fetched {new Date(detail.fetchedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
