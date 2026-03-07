type SectionHeaderProps = {
  title: string
  subtitle?: string
  icon?: string
}

export default function SectionHeader({ title, subtitle, icon }: SectionHeaderProps) {
  return (
    <div className="section-heading-row">
      <h2 className="section-title">
        {icon ? <span aria-hidden="true">{icon} </span> : null}
        {title}
      </h2>
      {subtitle ? <p className="section-meta">{subtitle}</p> : null}
    </div>
  )
}
