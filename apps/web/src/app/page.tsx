"use client";

export default function HomePage() {
  const api = process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:4000';
  async function devLogin() {
    await fetch(api + '/api/auth/dev-login', { method: 'POST', credentials: 'include' });
    window.location.href = '/inbox';
  }
  return (
    <div className="space-y-10 py-20 text-center">
      <div>
        <h2 className="text-3xl font-bold mb-4">Sign in</h2>
        <p className="text-neutral-600 mb-6">Authenticate to view your inbox and draft replies.</p>
        <div className="flex gap-4 justify-center">
          <a href={api + '/api/auth/google'} className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded font-medium">Google OAuth</a>
          <button onClick={devLogin} className="bg-neutral-800 hover:bg-neutral-900 text-white px-5 py-3 rounded font-medium">Dev Login</button>
        </div>
      </div>
      <p className="text-sm text-neutral-500">This is a prototype. Do not use real sensitive accounts in development.</p>
    </div>
  );
}
