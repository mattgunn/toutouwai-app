interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm',
  secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700',
  danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm',
  ghost: 'hover:bg-gray-800 text-gray-400 hover:text-white',
}

const sizeClasses = {
  sm: 'text-xs px-2.5 py-1.5 rounded',
  md: 'text-sm px-4 py-2 rounded-lg',
  lg: 'text-sm px-5 py-2.5 rounded-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizeClasses[size]} ${className}
      `.trim()}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}
