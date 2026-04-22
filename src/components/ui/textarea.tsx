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
          <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
        )}
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500',
            'transition-all duration-200 resize-y',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500/50',
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
