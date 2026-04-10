'use client';

interface Props {
  filters: string[];
  counts: Record<string, number>;
  active: string;
  onChange: (filter: string) => void;
}

export default function StatusFilter({ filters, counts, active, onChange }: Props) {
  return (
    <div className="d-flex gap-2 mb-4 flex-wrap">
      {filters.map((f) => (
        <button
          key={f}
          className={`btn btn-sm ${active === f ? 'yellow_button' : 'white_button'}`}
          onClick={() => onChange(f)}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f] ?? 0})
        </button>
      ))}
    </div>
  );
}
