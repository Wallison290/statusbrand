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
          <label className="block text-[12px] font-medium text-[#94a3b8] mb-1.5">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]">{icon}</div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-9 w-full rounded-md border border-[#1e293b] bg-[#182233] px-3 py-1.5 text-[13px] text-[#E2E8F0] placeholder:text-[#64748b]',
              'transition-colors duration-100',
              'focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB]/50',
              'disabled:cursor-not-allowed disabled:opacity-40',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#CBD5E1]',
              '[color-scheme:dark]',
              !!icon && 'pl-10',
              !!error && 'border-[#ef4444] focus:ring-[#ef4444]/30',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-[11px] text-[#f87171]">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
