import { cn } from '@/lib/utils'
import { LoadingSpinner } from './LoadingSpinner'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: 'var(--gradient-primary)',
    color: '#000',
    border: 'none',
    fontWeight: 700,
  },
  secondary: {
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-glass)',
    fontWeight: 500,
  },
  danger: {
    background: 'rgba(239,68,68,0.12)',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.3)',
    fontWeight: 600,
  },
  ghost: {
    background: 'none',
    color: 'var(--text-secondary)',
    border: 'none',
    fontWeight: 500,
  },
}

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '0.375rem 0.75rem', fontSize: '0.8rem', borderRadius: 8 },
  md: { padding: '0.55rem 1rem',     fontSize: '0.875rem', borderRadius: 10 },
  lg: { padding: '0.75rem 1.5rem',   fontSize: '1rem',    borderRadius: 12 },
}

export function Button({ variant = 'primary', size = 'md', loading, children, disabled, style, ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'opacity 0.15s, transform 0.1s',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...rest}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  )
}
