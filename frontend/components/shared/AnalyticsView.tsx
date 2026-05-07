'use client';

import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable, { Column } from './DataTable';
import PageHeader from './PageHeader';
import { api } from '@/lib/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

interface AnalyticsData {
  status_stats: Array<{ status: string; count: number }>;
  offer_trend: Array<{ date: string; count: number; accepted: number }>;
  monthly_stats: Array<{ month?: string; date?: string; revenue: string; sales_count: string; offer_count: string }>;
  revenue_by_listing_type: Array<{ listing_type: string; revenue: string }>;
  top_products_by_offers: Array<{ title: string; listing_type: string; offer_count: number; accepted_count: number; total_revenue: string }>;
  top_products_by_revenue: Array<{ title: string; listing_type: string; offer_count: number; accepted_count: number; total_revenue: string }>;
  total_products: number;
  total_offers: number;
  score_points: number;
}

interface Props { role: string; }

const topProductCols: Column<any>[] = [
  { key: 'title', label: 'Product', render: (r) => <span className="fw-medium text-dark">{r.title}</span> },
  { key: 'listing_type', label: 'Type', render: (r) => <span className="badge rounded-pill bg-light text-muted border" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{r.listing_type}</span> },
  { key: 'offer_count', label: 'Offers', render: (r) => <span className="fw-bold">{r.offer_count}</span> },
  { key: 'accepted_count', label: 'Accepted', render: (r) => <span className="badge bg-success-subtle text-success border-0 px-2" style={{ fontSize: '0.7rem' }}>{r.accepted_count}</span> },
  { key: 'total_revenue', label: 'Revenue', render: (r) => <span className="fw-bold" style={{ color: '' }}>₹{parseFloat(r.total_revenue || '0').toLocaleString()}</span> },
];

const RANGES = [
  { label: 'All Time', value: 'all_time' },
  { label: 'Current Week', value: 'current_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'Last 2 Weeks', value: 'last_2_weeks' },
  { label: 'Current Month', value: 'current_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Current Quarter', value: 'current_quarter' },
  { label: 'Last Quarter', value: 'last_quarter' },
  { label: 'Last 2 Quarters', value: 'last_2_quarters' },
  { label: 'Current Year', value: 'current_year' },
  { label: 'Last Year', value: 'last_year' },
  { label: 'Last 2 Years', value: 'last_2_years' },
];

export default function AnalyticsView({ role }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [barRange, setBarRange] = useState('all_time');
  const [pieRange, setPieRange] = useState('all_time');
  const [barLoading, setBarLoading] = useState(false);
  const [pieLoading, setPieLoading] = useState(false);
  const [sortType, setSortType] = useState<'offers' | 'revenue'>('offers');
  const sliderRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    api.get<AnalyticsData>('/shared/analytics').then((r) => {
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    });
  }, []);

  // Update Bar Chart and other metrics
  useEffect(() => {
    if (loading) return;
    setBarLoading(true);
    api.get<AnalyticsData>(`/shared/analytics?range=${barRange}`).then((r) => {
      if (r.success && r.data) {
        setData(r.data);
      }
      setBarLoading(false);
    });
  }, [barRange]);

  // Update Pie Chart and other metrics
  useEffect(() => {
    if (loading) return;
    setPieLoading(true);
    api.get<AnalyticsData>(`/shared/analytics?range=${pieRange}`).then((r) => {
      if (r.success && r.data) {
        setData(r.data);
      }
      setPieLoading(false);
    });
  }, [pieRange]);

  const getStatusCount = (status: string) =>
    data?.status_stats?.find((s) => s.status === status)?.count ?? 0;

  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 300;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
    </DashboardLayout>
  );

  const stats = [
    { label: 'Total Revenue', value: `₹${(data?.monthly_stats?.reduce((s, r) => s + parseFloat(r.revenue || '0'), 0) ?? 0).toLocaleString()}`, icon: 'bi bi-currency-rupee', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Total Products', value: data?.total_products ?? 0, icon: 'bi bi-box-seam', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { label: 'Total Offers', value: data?.total_offers ?? 0, icon: 'bi bi-tags', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Score Points', value: data?.score_points ?? 0, icon: 'bi bi-star-fill', color: '#ffc63a', bg: 'rgba(255,198,58,0.1)' },
    { label: 'Approved', value: getStatusCount('approved'), icon: 'bi bi-check-circle-fill', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Pending', value: getStatusCount('pending'), icon: 'bi bi-clock-fill', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Rejected', value: getStatusCount('rejected'), icon: 'bi bi-x-circle-fill', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  ];

  // Bar Chart Data: Sales per Month/Date
  const formatLabel = (label: string) => {
    if (!label) return '';
    // YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(label)) {
      const [year, month] = label.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleString('default', { month: 'short', year: '2-digit' });
    }
    // YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
      const date = new Date(label);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }
    return label;
  };

  const barChartData: ChartData<'bar'> = {
    labels: data?.monthly_stats.map(s => formatLabel((s as any).month || (s as any).date)) || [],
    datasets: [
      {
        label: 'Total Revenue',
        data: data?.monthly_stats.map(s => parseFloat(s.revenue || '0')) || [],
        backgroundColor: '#d96459',
        borderRadius: 6,
        hoverBackgroundColor: '#d96459',
      }
    ]
  };

  // Pie Chart Data: Revenue Distribution by Listing Type
  const pieChartData: ChartData<'pie'> = {
    labels: data?.revenue_by_listing_type.map(r => r.listing_type.toUpperCase()) || [],
    datasets: [{
      data: data?.revenue_by_listing_type.map(r => parseFloat(r.revenue)) || [],
      backgroundColor: ['#d96459', '#008080', '#ef4444', '#d7b467', 'rgb(255, 198, 58)', 'rgb(231, 239, 229)', '#ffffff'],
      borderWidth: 0,
      hoverBackgroundColor: '#d96459',
    }]
  };

  const commonOptions: any = {
    responsive: true,

    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { weight: 'bold' } }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            return '₹' + value.toLocaleString('en-IN');
          }
        }
      }
    }
  };

  const RangePicker = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <select className="form-select form-select-sm" style={{ width: '130px', borderRadius: '10px', border: '1px solid #ddd', padding: '0.3rem 0.5rem', fontSize: '0.7rem' }} value={value} onChange={(e) => onChange(e.target.value)}>
      {RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
    </select>
  );

  const LoadingOverlay = () => (
    <div className="loading-overlay">
      <div className="spinner-border spinner-border-sm text-warning" role="status"></div>
    </div>
  );

  return (
    <DashboardLayout requiredRoles={[role]}>
      <style jsx>{`
        .stats-slider-container {
          position: relative;
          display: flex;
          align-items: center;
          margin-bottom: 2rem;
        }
        .stats-slider {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          scroll-behavior: smooth;
          padding: 0.5rem;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .stats-slider::-webkit-scrollbar {
          display: none;
        }
        .nav-btn {
          background: #fff;
          border: 1px solid #f0f0f0;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          z-index: 10;
          transition: 0.3s;
          color: #ffc63a;
          position: absolute;
        }
        .nav-btn:hover {
          box-shadow: 0 6px 16px rgba(0,0,0,0.1);
          transform: scale(1.1);
        }
        .nav-btn.left { left: -18px; }
        .nav-btn.right { right: -18px; }

        .stat-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #f0f0f0;
          padding: 1.25rem;
          text-align: center;
          transition: 0.3s;
          min-width: 200px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .stat-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.06); transform: translateY(-2px); }
        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 900;
          color: #000;
          line-height: 1.1;
          margin-bottom: 4px;
        }
        .stat-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        @media (min-width: 768px) {
          .stat-card { border-radius: 20px; padding: 1.75rem 1.5rem; min-width: 240px; }
          .stat-value { font-size: 2rem; }
          .stat-label { font-size: 0.75rem; letter-spacing: 1px; }
        }
        .chart-container {
          height: 300px;
          width: 100%;
        }
        .card-wrap { background: #fff; border-radius: 24px; border: 1px solid #f0f0f0; box-shadow: 0 4px 24px rgba(0,0,0,0.03); overflow: hidden; height: 100%; position: relative; }
        .loading-overlay {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center;
          z-index: 10; border-radius: inherit; backdrop-filter: blur(1px);
        }
      `}</style>

      <div className="container">
        <PageHeader title="Analytics" className="px-3" />

        <div className="stats-slider-container">
          <button className="nav-btn left" onClick={() => scroll('left')}><i className="bi bi-chevron-left"></i></button>
          <div className="stats-slider" ref={sliderRef}>
            {stats.map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-icon" >
                  <i className={s.icon} style={{ color: '#ffc63a' }}></i>
                </div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
          <button className="nav-btn right" onClick={() => scroll('right')}><i className="bi bi-chevron-right"></i></button>
        </div>

        <div className="row mb-5">
          <div className="col-md-7">
            <div className="card-wrap">
              {barLoading && <LoadingOverlay />}
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="subsection_label_font mb-0" style={{ fontWeight: 800 }}>
                    Total Revenue
                  </h5>
                  <RangePicker value={barRange} onChange={setBarRange} />
                </div>
                <div className="chart-container">
                  <Bar data={barChartData} options={commonOptions} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-5">
            <div className="card-wrap">
              {pieLoading && <LoadingOverlay />}
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="subsection_label_font mb-0" style={{ fontWeight: 800 }}>Revenue by Listing Type</h5>
                  <RangePicker value={pieRange} onChange={setPieRange} />
                </div>
                <div className="chart-container">
                  <Pie data={pieChartData} options={commonOptions} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card-wrap mb-5">
          <div className="p-4 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="subsection_label_font mb-1" style={{ fontWeight: 800 }}>Top Performing Products</h5>
              <p className="text-muted small mb-0">Analysis of your best-selling items.</p>
            </div>
            <select
              className="form-select form-select-sm"
              style={{ width: '160px', borderRadius: '10px', border: '1px solid #ddd', padding: '0.4rem', fontSize: '0.75rem' }}
              value={sortType}
              onChange={(e) => setSortType(e.target.value as any)}
            >
              <option value="offers">By Offers</option>
              <option value="revenue">By Revenue</option>
            </select>
          </div>
          <div className="table-responsive">
            <DataTable
              columns={topProductCols}
              data={sortType === 'offers' ? (data?.top_products_by_offers ?? []) : (data?.top_products_by_revenue ?? [])}
              emptyIcon="bi bi-box"
              emptyText="No product data yet"
              keyField="title"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
