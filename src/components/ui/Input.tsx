import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        {...props}
        className={`
          w-full px-4 py-3 rounded-xl border bg-white text-gray-900 text-sm
          placeholder:text-gray-400 outline-none transition
          ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-[#3182F6]'}
          ${className}
        `.trim()}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
