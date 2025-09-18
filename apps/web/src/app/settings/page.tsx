export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-semibold">Settings (Placeholder)</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Default Tone</label>
          <select className="border rounded px-3 py-2 w-full" defaultValue="friendly" disabled>
            <option value="formal">Formal</option>
            <option value="friendly">Friendly</option>
            <option value="concise">Concise</option>
          </select>
          <p className="text-xs text-neutral-500 mt-1">Integration with real user preferences pending.</p>
        </div>
        <div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" disabled /> Auto Reply (soon)
          </label>
        </div>
      </div>
    </div>
  );
}
