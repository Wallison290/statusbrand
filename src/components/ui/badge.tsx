import * as React from 'react'
import { cn, statusColors, statusLabels } from '@/utils/formatters'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: string
  variant?: 'default' | 'outline'
}

function Badge({ className, status, variant = 'outline', children, ...props }: BadgeProps) {
  const colorClass = status ? statusColors[status] : ''
  const label = status ? statusLabels[status] : children
  return (
    <div
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-normal',
        variant === 'outline' ? colorClass : 'bg-white/[0.07] text-zinc-300 border-white/[0.08]',
        className
      )}
      {...props}
    >
      {label}
    </div>
  )
}

export { Badge }
