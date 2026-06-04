interface PageHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
}

export function PageHeader({ eyebrow = 'ANLAA Estimate', title, subtitle, meta, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div style={{ minWidth: 0 }}>
        <div className="page-eyebrow">{eyebrow}</div>
        <h2 className="page-title">{title}</h2>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
        {meta && <div className="page-meta">{meta}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
