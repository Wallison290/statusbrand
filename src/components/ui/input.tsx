import * as React from 'react'
import { cn } from '@/utils/formatters'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[12px] font-medium text-gray-600 mb-1.5">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-8 w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[13px] text-gray-900 placeholder:text-gray-400',
              'transition-colors duration-100',
              'focus:outline-none focus:ring-1 focus:ring-gray-400/40 focus:border-gray-400',
              'disabled:cursor-not-allowed disabled:opacity-40',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              !!icon && 'pl-10',
              !!error && 'border-red-400 focus:ring-red-400/30',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
