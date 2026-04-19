'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface RentalCalendarProps {
  bookedRanges: { start: string; end: string }[];
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
  minRentalDays?: number;
}

export function RentalCalendar({
  bookedRanges,
  startDate,
  endDate,
  onRangeChange,
  minRentalDays = 3,
}: RentalCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [phase, setPhase] = useState<'start' | 'end'>('start');
  const [hover, setHover] = useState<Date | null>(null);

  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (s: string) => {
    if (!s) return null;
    const [y, m, day] = s.split(/[- ]/).map(Number); // Handle 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS'
    return new Date(y, m - 1, day);
  };

  const dateOnly = (s: string) => s ? s.split(' ')[0] : s;

  const isBooked = (d: Date) => {
    const ds = fmt(d);
    return bookedRanges.some(r => ds >= dateOnly(r.start) && ds <= dateOnly(r.end));
  };

  const startD = parse(startDate);
  const endD = parse(endDate);

  const inRange = (d: Date) => {
    if (!startD) return false;
    const eff = endD || hover;
    if (!eff) return false;
    const lo = startD <= eff ? startD : eff;
    const hi = startD <= eff ? eff : startD;
    return d > lo && d < hi;
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let i = 1; i <= total; i++) cells.push(new Date(year, month, i));

  const daysBetween = (a: Date, b: Date) => {
    const lo = a <= b ? a : b;
    const hi = a <= b ? b : a;
    return Math.round((hi.getTime() - lo.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleDay = (d: Date) => {
    if (d < today || isBooked(d)) return;
    if (phase === 'start' || (startD && endD)) {
      onRangeChange(fmt(d), '');
      setPhase('end');
    } else {
      const s = startD!;
      const limit = minRentalDays;
      if (daysBetween(s, d) < limit) {
        toast.error(`Minimum rental period is ${limit} days.`);
        return;
      }
      if (d < s) {
        onRangeChange(fmt(d), fmt(s));
      } else {
        onRangeChange(fmt(s), fmt(d));
      }
      setPhase('start');
    }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '14px', padding: '16px', userSelect: 'none', fontSize: '0.82rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{ background: 'none', border: '1px solid #eee', borderRadius: '6px', cursor: 'pointer', padding: '2px 10px', fontWeight: 700 }}>‹</button>
        <span style={{ fontWeight: 700 }}>{MONTH_NAMES[month]} {year}</span>
        <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={{ background: 'none', border: '1px solid #eee', borderRadius: '6px', cursor: 'pointer', padding: '2px 10px', fontWeight: 700 }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
        {DAY_NAMES.map(n => <div key={n} style={{ textAlign: 'center', fontWeight: 700, color: '#999', padding: '2px' }}>{n}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const past = d < today;
          const booked = isBooked(d);
          const disabled = past;
          const isS = startD && fmt(d) === fmt(startD);
          const isE = endD && fmt(d) === fmt(endD);
          const rang = inRange(d);
          const isT = fmt(d) === fmt(today);

          let bg = 'transparent', color = '#000', br = '6px';
          if (booked) { bg = '#fee2e2'; color = '#dc2626'; }
          else if (isS || isE) { bg = '#ffc63a'; color = '#000'; br = '8px'; }
          else if (rang) { bg = '#fff3cc'; color = '#555'; br = '0'; }
          if (past && !booked) { color = '#ccc'; }

          return (
            <div key={i}
              onClick={() => handleDay(d)}
              onMouseEnter={() => { if (!disabled) setHover(d); }}
              onMouseLeave={() => setHover(null)}
              style={{
                textAlign: 'center', padding: '6px 2px', borderRadius: br,
                background: bg, color,
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontWeight: (isS || isE || isT) ? 700 : 400,
                border: isT && !isS && !isE ? '1.5px solid #ffc63a' : '1.5px solid transparent',
                opacity: past ? 0.35 : 1,
                transition: 'background .1s',
              }}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', color: '#777', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ffc63a', borderRadius: 3, marginRight: 4 }} />Selected</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fff3cc', borderRadius: 3, marginRight: 4 }} />Range</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fee2e2', borderRadius: 3, marginRight: 4 }} />Booked</span>
      </div>
      {startDate && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffdf0', borderRadius: 8, border: '1px solid #ffc63a44' }}>
          {endDate
            ? <><i className="bi bi-calendar-range me-1" style={{ color: '#ffc63a' }} /><strong>{startDate}</strong> → <strong>{endDate}</strong></>
            : <><i className="bi bi-calendar me-1" style={{ color: '#ffc63a' }} /><strong>{startDate}</strong> — pick an end date (min {minRentalDays} days)</>
          }
        </div>
      )}
      {!startDate && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, color: '#888', fontSize: '0.78rem' }}>
          <i className="bi bi-info-circle me-1" />Click a start date — minimum rental period is {minRentalDays} days
        </div>
      )}
    </div>
  );
}
