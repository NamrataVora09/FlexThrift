interface Props {
  title: string;
  value: number | string;
  icon: string;
  color?: string;
}

export default function StatsCard({ title, value, icon, color = '#ffc63a' }: Props) {
  return (
    <div className="card">
      <div className="card-body">
        <i className={`${icon} header-icon`} style={{ color, fontSize: 20 }}></i>
        <span className="normal_label_font d-block mt-1">{title}</span>
        <h4 className="card-title fw-bold">{value}</h4>

      </div>
    </div>
  );
}
