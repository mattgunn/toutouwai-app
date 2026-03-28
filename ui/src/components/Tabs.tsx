interface Tab {
  key: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
  variant?: 'pills' | 'underline'
}

export default function Tabs({ tabs, active, onChange, variant = 'underline' }: TabsProps) {
  if (variant === 'pills') {
    return (
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${active === tab.key
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }
            `}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 text-xs ${active === tab.key ? 'text-blue-400/70' : 'text-gray-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="border-b border-gray-800 flex gap-0 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`
            px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors relative
            ${active === tab.key
              ? 'text-blue-400'
              : 'text-gray-500 hover:text-gray-300'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 text-xs ${active === tab.key ? 'text-blue-400/70' : 'text-gray-600'}`}>
              {tab.count}
            </span>
          )}
          {active === tab.key && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />
          )}
        </button>
      ))}
    </div>
  )
}
