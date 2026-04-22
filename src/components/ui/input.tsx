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
          <label className="block text-[12px] font-normal text-zinc-500 mb-1.5">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">{icon}</div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-8 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[13px] text-zinc-200 placeholder:text-zinc-600',
              'transition-colors duration-100',
              'focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/15',
              'disabled:cursor-not-allowed disabled:opacity-40',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              icon && 'pl-10',
              error && 'border-red-500/40 focus:ring-red-500/30',
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
