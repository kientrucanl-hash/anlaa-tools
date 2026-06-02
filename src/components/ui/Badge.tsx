import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

const variantMap: Record<string, string> = {
  default: 'status-draft',
  success: 'status-approved',
  warning: 'status-pending',
  danger: 'status-rejected',
  info: '',
}

export function Badge({ children, variant = 'default', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantMap[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
