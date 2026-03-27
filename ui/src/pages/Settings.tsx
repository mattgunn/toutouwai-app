import { useAdminPrefs } from '../hooks/useAdminPrefs'

export default function Settings() {
  const prefs = useAdminPrefs()

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Settings</h1>

      <div className="space-y-6 max-w-2xl">
        {/* Appearance */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-4">Appearance</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Theme</label>
              <div className="flex gap-2">
                {(['dark', 'light', 'katana'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => prefs.setTheme(t)}
                    className={`px-3 py-1.5 text-sm rounded capitalize transition-colors ${
                      prefs.theme === t
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Navigation Layout</label>
              <div className="flex gap-2">
                {(['sidebar', 'topbar'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => prefs.setNavLayout(l)}
                    className={`px-3 py-1.5 text-sm rounded capitalize transition-colors ${
                      prefs.navLayout === l
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Instance Label</label>
              <input
                type="text"
                value={prefs.instanceLabel}
                onChange={e => prefs.setInstanceLabel(e.target.value)}
                placeholder="HRIS"
                className="w-full max-w-xs bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Nav Color</label>
              <input
                type="color"
                value={prefs.navColor || '#1f2937'}
                onChange={e => prefs.setNavColor(e.target.value)}
                className="w-10 h-8 border border-gray-700 rounded cursor-pointer"
              />
              {prefs.navColor && (
                <button
                  onClick={() => prefs.setNavColor('')}
                  className="ml-2 text-xs text-gray-500 hover:text-gray-300"
                >
                  Reset
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Favicon Color</label>
              <input
                type="color"
                value={prefs.faviconColor || '#2563eb'}
                onChange={e => prefs.setFaviconColor(e.target.value)}
                className="w-10 h-8 border border-gray-700 rounded cursor-pointer"
              />
              {prefs.faviconColor && (
                <button
                  onClick={() => prefs.setFaviconColor('')}
                  className="ml-2 text-xs text-gray-500 hover:text-gray-300"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
