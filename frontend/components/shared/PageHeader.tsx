import Link from 'next/link';

interface Props {
  title: string;
  badge?: number | string;
  actionLabel?: string;
  actionHref?: string;
  actionIcon?: string;
}

export default function PageHeader({ title, badge, actionLabel, actionHref, actionIcon = 'fa fa-plus' }: Props) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h1 className="header_label_font mb-0" style={{ fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: 4, fontFamily: 'Poppins' }}>
        {title}
        {badge !== undefined && (
          <span className="badge bg-dark ms-2" style={{ fontSize: 14 }}>{badge}</span>
        )}
      </h1>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn yellow_button">
          <i className={`${actionIcon} me-2`}></i>{actionLabel}
        </Link>
      )}
    </div>
  );
}
