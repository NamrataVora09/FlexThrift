'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import DataTable, { Column } from './DataTable';
import Chart from 'chart.js/auto';

interface ReportData {
  summary: {
    total_subscriptions: number;
    total_spent: number;
    total_discount: number;
  };
  charts: {
    amount_discount: {
      buyer: { spent: number; discount: number };
      seller: { spent: number; discount: number };
    };
    plan_counts: {
      buyer: number;
      seller: number;
    };
  };
  transactions: any[];
  user_role: string;
}

const RANGES = [
  { label: 'Current Week', value: 'current_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'Last 2 Weeks', value: 'last_2_weeks' },
  { label: 'Current Quarter', value: 'current_quarter' },
  { label: 'Last Quarter', value: 'last_quarter' },
  { label: 'Last 2 Quarters', value: 'last_2_quarters' },
  { label: 'Current Year', value: 'current_year' },
  { label: 'Last Year', value: 'last_year' },
  { label: 'Last 2 Years', value: 'last_2_years' },
];

export default function TransactionsReportsView({ role }: { role: string }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('current_week');

  const barChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const countChartRef = useRef<HTMLCanvasElement>(null);

  const barChartInstance = useRef<Chart | null>(null);
  const pieChartInstance = useRef<Chart | null>(null);
  const countChartInstance = useRef<Chart | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await api.get<ReportData>(`/shared/transactions-reports?range=${range}`);
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!data) return;

    // Destroy old instances
    if (barChartInstance.current) barChartInstance.current.destroy();
    if (pieChartInstance.current) pieChartInstance.current.destroy();
    if (countChartInstance.current) countChartInstance.current.destroy();

    const themeColors = {
      buyer: '#0d6efd',
      seller: '#ffc63a',
      discount: '#d6b06b',
      text: '#1e2022'
    };

    const isBoth = data.user_role === 'super_admin' || data.user_role === 'admin';
    const isSeller = data.user_role === 'seller';
    const isBuyer = data.user_role === 'buyer';

    // ── 2nd Row: Bar Graph (Amount vs Discount) ──
    if (barChartRef.current) {
      const labels = [];
      const barData = [];
      const colors = [];

      if (isBoth || isBuyer) {
        labels.push('Buyer Spent');
        barData.push(data.charts.amount_discount.buyer.spent);
        colors.push(themeColors.buyer);
      }
      if (isBoth || isSeller) {
        labels.push('Seller Spent');
        barData.push(data.charts.amount_discount.seller.spent);
        colors.push(themeColors.seller);
      }
      
      const totalDisc = data.charts.amount_discount.buyer.discount + data.charts.amount_discount.seller.discount;
      labels.push('Discount');
      barData.push(totalDisc);
      colors.push(themeColors.discount);

      barChartInstance.current = new Chart(barChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: 'Amount (₹)', data: barData, backgroundColor: colors }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { callback: (v) => '₹' + v } } }
        }
      });
    }

    // ── 2nd Row: Pie Chart (Distribution) ──
    if (pieChartRef.current) {
      const labels = [];
      const pieData = [];
      const colors = [];

      if (isBoth || isBuyer) {
        labels.push('Buyer Spent');
        pieData.push(data.charts.amount_discount.buyer.spent);
        colors.push(themeColors.buyer);
      }
      if (isBoth || isSeller) {
        labels.push('Seller Spent');
        pieData.push(data.charts.amount_discount.seller.spent);
        colors.push(themeColors.seller);
      }
      
      // Discount portion
      const totalDisc = data.charts.amount_discount.buyer.discount + data.charts.amount_discount.seller.discount;
      if (totalDisc > 0) {
        labels.push('Total Discount');
        pieData.push(totalDisc);
        colors.push(themeColors.discount);
      }

      pieChartInstance.current = new Chart(pieChartRef.current, {
        type: 'pie',
        data: {
          labels,
          datasets: [{ data: pieData, backgroundColor: colors }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } }
        }
      });
    }

    // ── 3rd Row: Bar Graph (Plan Counts) ──
    if (countChartRef.current) {
      const labels = [];
      const counts = [];
      const bgColors = [];

      if (isBoth || isBuyer) {
        labels.push('Buyer Plans');
        counts.push(data.charts.plan_counts.buyer);
        bgColors.push(themeColors.buyer);
      }
      if (isBoth || isSeller) {
        labels.push('Seller Plans');
        counts.push(data.charts.plan_counts.seller);
        bgColors.push(themeColors.seller);
      }

      countChartInstance.current = new Chart(countChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: 'No. of Subscriptions', data: counts, backgroundColor: bgColors }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    }

  }, [data]);

  const columns: Column<any>[] = [
    { key: 'id', label: '#', render: (r) => <span className="small text-muted">#{r.id}</span> },
    { key: 'user_name', label: 'User', render: (r) => <span className="fw-medium">{r.user_name || 'System'}</span> },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount', render: (r) => <span className="fw-bold">₹{r.amount}</span> },
    { key: 'status', label: 'Status', render: (r) => (
      <span className={`badge rounded-pill ${r.payment_status === 'completed' || r.payment_status === 'paid' ? 'bg-success' : 'bg-warning text-dark'}`} style={{ fontSize: '0.7rem' }}>
        {r.payment_status || r.status}
      </span>
    )},
    { key: 'created_at', label: 'Date', render: (r) => <span className="small">{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span> },
  ];

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container-fluid py-4" style={{ minHeight: '100vh' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 style={{ fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: 4, fontFamily: 'Poppins' }}>
            Transactions / Reports
          </h1>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-calendar3 text-muted"></i>
            <select className="form-select form-select-sm" style={{ width: '200px', borderRadius: '0.5rem', border: '1px solid #ddd' }} value={range} onChange={(e) => setRange(e.target.value)}>
              {RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── Row 1: Summary Cards ── */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1.5rem', background: '#ffc63a', minHeight: '160px' }}>
              <div className="card-body p-4 d-flex align-items-center gap-3">
                <div className="rounded-circle bg-white bg-opacity-25 p-3 text-dark">
                  <i className="bi bi-box-seam" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h6 className="text-dark small mb-1 opacity-75 fw-bold">Total Subscriptions Purchased</h6>
                  <h3 className="fw-bold mb-0" style={{ color: '#6c757d', fontSize: '2.4rem' }}>{data?.summary.total_subscriptions || 0}</h3>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1.5rem', background: '#ffc63a', minHeight: '160px' }}>
              <div className="card-body p-4 d-flex align-items-center gap-3">
                <div className="rounded-circle bg-white bg-opacity-25 p-3 text-dark">
                  <i className="bi bi-currency-rupee" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h6 className="text-dark small mb-1 opacity-75 fw-bold">Total Amount Spent</h6>
                  <h3 className="fw-bold mb-0" style={{ color: '#6c757d', fontSize: '2.4rem' }}>₹{data?.summary.total_spent.toLocaleString() || 0}</h3>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1.5rem', background: '#ffc63a', minHeight: '160px' }}>
              <div className="card-body p-4 d-flex align-items-center gap-3">
                <div className="rounded-circle bg-white bg-opacity-25 p-3 text-dark">
                  <i className="bi bi-percent" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h6 className="text-dark small mb-1 opacity-75 fw-bold">Total Discount Availed</h6>
                  <h3 className="fw-bold mb-0" style={{ color: '#6c757d', fontSize: '2.4rem' }}>₹{data?.summary.total_discount.toLocaleString() || 0}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Charts (Amount vs Discount) ── */}
        <div className="row g-4 mb-4">
          <div className="col-md-8">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '1rem' }}>
              <div className="card-body p-4">
                <h6 className="fw-bold mb-4">Total Amount Spent & Discount Availed (Bar Graph)</h6>
                <div style={{ height: '300px' }}>
                  <canvas ref={barChartRef}></canvas>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '1rem' }}>
              <div className="card-body p-4">
                <h6 className="fw-bold mb-4">Expense Distribution (Pie Chart)</h6>
                <div style={{ height: '300px' }}>
                  <canvas ref={pieChartRef}></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 3: Subscription Plan Counts ── */}
        <div className="row g-4 mb-4">
          <div className="col-md-8">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '1rem' }}>
              <div className="card-body p-4">
                <h6 className="fw-bold mb-4">Total Number of Subscription Plans</h6>
                <div style={{ height: '300px' }}>
                  <canvas ref={countChartRef}></canvas>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
             {/* Reserved or decorative space if needed, matching the layout */}
          </div>
        </div>

        {/* ── Row 4: Transaction History ── */}
        <div className="card border-0 shadow-sm mb-5" style={{ borderRadius: '1rem' }}>
          <div className="card-header bg-white border-0 p-4 pb-0">
            <h6 className="fw-bold mb-0">Payment History</h6>
            <p className="text-muted small">Latest transactions for the selected range.</p>
          </div>
          <div className="card-body p-0">
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <DataTable 
                columns={columns} 
                data={data?.transactions || []} 
                loading={loading} 
                emptyIcon="bi bi-receipt" 
                emptyText="No transaction history for this period." 
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .container-fluid {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        select:focus {
          box-shadow: 0 0 0 0.25rem rgba(255, 198, 58, 0.25);
          border-color: #ffc63a;
        }
      `}</style>
    </DashboardLayout>
  );
}
