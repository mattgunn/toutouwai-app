const AVATAR_COLORS = [
  '#4A90D9', // blue
  '#50B5A9', // teal
  '#7C6BC4', // purple
  '#E07C5A', // coral
  '#5B9BD5', // sky
  '#D4A843', // gold
  '#6BBF6B', // green
  '#C75B8E', // rose
  '#8E8E93', // gray
  '#D96B4A', // burnt orange
]

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  return Math.abs(hash)
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const SIZE_MAP = {
  sm: { container: 24, text: 10 },
  md: { container: 32, text: 12 },
  lg: { container: 40, text: 14 },
  xl: { container: 56, text: 20 },
} as const

interface AvatarProps {
  name: string
  imageUrl?: string | null
  size?: keyof typeof SIZE_MAP
  className?: string
}

export default function Avatar({ name, imageUrl, size = 'md', className = '' }: AvatarProps) {
  const dims = SIZE_MAP[size]
  const color = AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length]
  const initials = getInitials(name)

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: dims.container, height: dims.container }}
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: dims.container,
        height: dims.container,
        backgroundColor: color,
      }}
    >
      <span
        className="font-medium text-white leading-none select-none"
        style={{ fontSize: dims.text }}
      >
        {initials}
      </span>
    </div>
  )
}
