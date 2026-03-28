interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, required, error, hint, children, className = '' }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      {hint && !error && <p className="text-gray-600 text-xs mt-1">{hint}</p>}
    </div>
  )
}

const inputBase = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors'
const inputError = 'border-red-500 focus:ring-red-500/40 focus:border-red-500'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      className={`${inputBase} ${error ? inputError : ''} ${className}`}
      {...props}
    />
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ error, options, placeholder, className = '', ...props }: SelectProps) {
  return (
    <select
      className={`${inputBase} ${error ? inputError : ''} ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function Textarea({ error, className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`${inputBase} ${error ? inputError : ''} ${className}`}
      rows={3}
      {...props}
    />
  )
}
