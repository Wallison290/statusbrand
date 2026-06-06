import * as React from 'react'
import { cn } from '@/utils/formatters'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  showCount?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, showCount, value, ...props }, ref) => {
    const count = typeof value === 'string' ? value.length : 0
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">{label}</label>
        )}
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border border-[#1e293b] bg-[#182233] px-3 py-2 text-sm text-[#E2E8F0] placeholder:text-[#64748b]',
            'transition-all duration-200 resize-y',
            'focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB]/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[#ef4444]',
            className
          )}
          ref={ref}
          value={value}
          {...props}
        />
        {(showCount || error) && (
          <div className="flex justify-between mt-1">
            <span>{error && <p className="text-xs text-red-400">{error}</p>}</span>
            {showCount && (
              <span className="text-xs text-gray-500">{count} chars</span>
            )}
          </div>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
