import React from 'react';
import './globals.css';

export const metadata = { title: 'AI Mail Reply Assistant' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-neutral-50">
      <body className="min-h-screen font-sans antialiased text-neutral-900 flex flex-col">
        <header className="p-4 border-b bg-white shadow-sm flex items-center justify-between">
          <h1 className="font-semibold">AI Mail Reply Assistant</h1>
          <nav className="text-sm space-x-4">
            <a className="hover:underline" href="/">Home</a>
            <a className="hover:underline" href="/inbox">Inbox</a>
            <a className="hover:underline" href="/settings">Settings</a>
          </nav>
        </header>
        <main className="p-6 max-w-6xl w-full mx-auto flex-1">{children}</main>
        <footer className="text-xs text-neutral-500 text-center py-4">Prototype scaffold – not production ready</footer>
      </body>
    </html>
  );
}
