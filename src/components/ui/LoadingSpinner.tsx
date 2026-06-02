interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = { sm: 20, md: 32, lg: 48 }

export function LoadingSpinner({ size = 'md', className = '' }: Props) {
  const px = sizeMap[size]
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ animation: 'spin 0.8s linear infinite' }}
      aria-label="Đang tải..."
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="12" cy="12" r="9"
        stroke="var(--border-focus)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="40 20"
      />
    </svg>
  )
}
