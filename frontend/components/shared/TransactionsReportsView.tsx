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
    total_plans: number;
  };
  charts: {
    amount_discount: {
      buyer: { spent: number; discount: number };
      seller: { spent: number; discount: number };
    };
    plan_breakdown: {
      labels: string[];
      values: number[];
      colors?: string[];
    };
    monthly_stats: {
      labels: string[];
      buyer_spent: number[];
      seller_spent: number[];
      buyer_count: number[];
      seller_count: number[];
      discount: number[];
    };
  };
  transactions: any[];
  user_role: string;
  user_type?: string;
}

const RANGES = [
  { label: 'All Time', value: 'all_time' },
  { label: 'Current Week', value: 'current_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'Last 2 Weeks', value: 'last_2_weeks' },
  { label: 'Current Month', value: 'current_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 2 Months', value: 'last_2_months' },
  { label: 'Current Quarter', value: 'current_quarter' },
  { label: 'Last Quarter', value: 'last_quarter' },
  { label: 'Last 2 Quarters', value: 'last_2_quarters' },
  { label: 'Current Year', value: 'current_year' },
  { label: 'Last Year', value: 'last_year' },
  { label: 'Last 2 Years', value: 'last_2_years' },
];

export default function TransactionsReportsView({ role }: { role: string }) {
  const [barRange, setBarRange] = useState('all_time');
  const [pieRange, setPieRange] = useState('all_time');
  const [countRange, setCountRange] = useState('all_time');
  const [countPieRange, setCountPieRange] = useState('all_time');
  const [historyRange, setHistoryRange] = useState('all_time');

  const [summaryData, setSummaryData] = useState<ReportData | null>(null);
  const [barData, setBarData] = useState<ReportData | null>(null);
  const [pieData, setPieData] = useState<ReportData | null>(null);
  const [countData, setCountData] = useState<ReportData | null>(null);
  const [countPieData, setCountPieData] = useState<ReportData | null>(null);
  const [historyData, setHistoryData] = useState<ReportData | null>(null);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [barLoading, setBarLoading] = useState(false);
  const [pieLoading, setPieLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(false);
  const [countPieLoading, setCountPieLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const barChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const countChartRef = useRef<HTMLCanvasElement>(null);
  const countPieChartRef = useRef<HTMLCanvasElement>(null);

  const barChartInstance = useRef<Chart | null>(null);
  const pieChartInstance = useRef<Chart | null>(null);
  const countChartInstance = useRef<Chart | null>(null);
  const countPieChartInstance = useRef<Chart | null>(null);

  const themeColors = {
    buyer: '#008080',
    seller: '#d96459',
    discount: '#ffc63a',
    text: '#1e2022'
  };

  const fetchSectionData = async (range: string, setter: (d: ReportData) => void, loadingSetter: (b: boolean) => void) => {
    loadingSetter(true);
    const res = await api.get<ReportData>(`/shared/transactions-reports?range=${range}`);
    if (res.success && res.data) {
      setter(res.data);
    }
    loadingSetter(false);
  };

  useEffect(() => { fetchSectionData(barRange, setBarData, setBarLoading); }, [barRange]);
  useEffect(() => { fetchSectionData(pieRange, setPieData, setPieLoading); }, [pieRange]);
  useEffect(() => { fetchSectionData(countRange, setCountData, setCountLoading); }, [countRange]);
  useEffect(() => { fetchSectionData(countPieRange, setCountPieData, setCountPieLoading); }, [countPieRange]);
  useEffect(() => { fetchSectionData(historyRange, setHistoryData, setHistoryLoading); }, [historyRange]);
  useEffect(() => { if (barData) setSummaryData(barData); }, [barData]);

  useEffect(() => {
    if (!barData) return;
    if (barChartInstance.current) barChartInstance.current.destroy();
    if (barChartRef.current) {
      const labels = barData.charts?.monthly_stats?.labels || [];
      const buyerSpent = barData.charts?.monthly_stats?.buyer_spent || [];
      const sellerSpent = barData.charts?.monthly_stats?.seller_spent || [];
      const discount = barData.charts?.monthly_stats?.discount || [];

      const isBoth = ['super_admin', 'superadmin', 'admin'].includes(barData.user_role) || barData.user_type === 'both';

      const datasets = [];
      if (isBoth) {
        datasets.push({
          label: 'Buyer Spent (₹)',
          data: buyerSpent,
          backgroundColor: themeColors.buyer,
          hoverBackgroundColor: themeColors.buyer,
          borderRadius: 4
        });
        datasets.push({
          label: 'Seller Spent (₹)',
          data: sellerSpent,
          backgroundColor: themeColors.seller,
          hoverBackgroundColor: themeColors.seller,
          borderRadius: 4
        });
      } else {
        const isSeller = barData.user_role === 'seller';
        datasets.push({
          label: (isSeller ? 'Seller' : 'Buyer') + ' Spent (₹)',
          data: isSeller ? sellerSpent : buyerSpent,
          backgroundColor: isSeller ? themeColors.seller : themeColors.buyer,
          hoverBackgroundColor: isSeller ? themeColors.seller : themeColors.buyer,
          borderRadius: 4
        });
      }

      datasets.push({
        label: 'Discount (₹)',
        data: discount,
        backgroundColor: themeColors.discount,
        hoverBackgroundColor: themeColors.discount,
        borderRadius: 4
      });

      barChartInstance.current = new Chart(barChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, usePointStyle: true, font: { size: 10 } } },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            y: { beginAtZero: true, ticks: { callback: (val) => `₹${val}` } }
          }
        }
      });
    }
  }, [barData]);

  useEffect(() => {
    if (!pieData) return;
    if (pieChartInstance.current) pieChartInstance.current.destroy();
    if (pieChartRef.current) {
      const isBoth = ['super_admin', 'superadmin', 'admin'].includes(pieData.user_role) || pieData.user_type === 'both';
      const isSeller = pieData.user_role === 'seller';
      const isBuyer = pieData.user_role === 'buyer';
      const labels = []; const values = []; const colors = [];
      const ad = pieData.charts?.amount_discount;
      if (!ad) return;
      if (isBoth || isSeller) { labels.push('Seller Spent'); values.push(ad.seller?.spent || 0); colors.push(themeColors.seller); }
      if (isBoth || isBuyer) { labels.push('Buyer Spent'); values.push(ad.buyer?.spent || 0); colors.push(themeColors.buyer); }
      const totalDisc = (ad.buyer?.discount || 0) + (ad.seller?.discount || 0);
      if (totalDisc > 0) { labels.push('Total Discount'); values.push(totalDisc); colors.push(themeColors.discount); }
      pieChartInstance.current = new Chart(pieChartRef.current, {
        type: 'pie',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, hoverBackgroundColor: colors, hoverOffset: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
      });
    }
  }, [pieData]);

  useEffect(() => {
    if (!countData) return;
    if (countChartInstance.current) countChartInstance.current.destroy();
    if (countChartRef.current) {
      const labels = countData.charts?.monthly_stats?.labels || [];
      const buyerCounts = countData.charts?.monthly_stats?.buyer_count || [];
      const sellerCounts = countData.charts?.monthly_stats?.seller_count || [];

      const isBoth = ['super_admin', 'superadmin', 'admin'].includes(countData.user_role) || countData.user_type === 'both';

      const datasets = [];
      if (isBoth) {
        datasets.push({
          label: 'Buyer Plans',
          data: buyerCounts,
          backgroundColor: themeColors.buyer,
          hoverBackgroundColor: themeColors.buyer,
          borderRadius: 4
        });
        datasets.push({
          label: 'Seller Plans',
          data: sellerCounts,
          backgroundColor: themeColors.seller,
          hoverBackgroundColor: themeColors.seller,
          borderRadius: 4
        });
      } else {
        const isSeller = countData.user_role === 'seller';
        datasets.push({
          label: (isSeller ? 'Seller' : 'Buyer') + ' Plans',
          data: isSeller ? sellerCounts : buyerCounts,
          backgroundColor: isSeller ? themeColors.seller : themeColors.buyer,
          hoverBackgroundColor: isSeller ? themeColors.seller : themeColors.buyer,
          borderRadius: 4
        });
      }

      countChartInstance.current = new Chart(countChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, usePointStyle: true, font: { size: 10 } } },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
            x: { ticks: { font: { size: 10 } } }
          }
        }
      });
    }

    if (countPieChartInstance.current) countPieChartInstance.current.destroy();
    if (countPieChartRef.current && countPieData) {
      const buyerCounts = countPieData.charts?.monthly_stats?.buyer_count || [];
      const sellerCounts = countPieData.charts?.monthly_stats?.seller_count || [];
      const totalBuyer = Array.isArray(buyerCounts) ? buyerCounts.reduce((a, b) => a + (Number(b) || 0), 0) : 0;
      const totalSeller = Array.isArray(sellerCounts) ? sellerCounts.reduce((a, b) => a + (Number(b) || 0), 0) : 0;

      countPieChartInstance.current = new Chart(countPieChartRef.current, {
        type: 'pie',
        data: {
          labels: ['Seller Plans', 'Buyer Plans'],
          datasets: [{
            data: [totalSeller, totalBuyer],
            backgroundColor: [themeColors.seller, themeColors.buyer],
            hoverBackgroundColor: [themeColors.seller, themeColors.buyer],
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
          }
        }
      });
    }
  }, [countPieData]);

  const columns: Column<any>[] = [
    { key: 'id', label: '#', render: (r) => <span className="small text-muted">#{r.id}</span> },
    { key: 'user_name', label: 'User', render: (r) => <span className="fw-medium">{r.user_name || 'System'}</span> },
    { key: 'description', label: 'Description' },
    { key: 'plan_type', label: 'Plan Type', render: (r) => <span className="badge bg-light text-muted border text-capitalize" style={{ fontSize: '0.65rem' }}>{r.plan_type || 'N/A'}</span> },
    { key: 'amount', label: 'Amount', render: (r) => <span className="fw-bold">₹{r.amount}</span> },
    {
      key: 'status', label: 'Status', render: (r) => (
        <span className={`badge rounded-pill ${r.payment_status === 'completed' || r.payment_status === 'paid' ? 'bg-success' : 'bg-warning text-dark'}`} style={{ fontSize: '0.7rem' }}>
          {r.payment_status || r.status}
        </span>
      )
    },
    { key: 'created_at', label: 'Date', render: (r) => <span className="small">{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span> },
  ];

  const RangePicker = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <select className="form-select form-select-sm" style={{ width: '160px', borderRadius: '10px', border: '1px solid #ddd', padding: '0.4rem', fontSize: '0.75rem' }} value={value} onChange={(e) => onChange(e.target.value)}>
      {RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
    </select>
  );

  const LoadingOverlay = () => (
    <div className="loading-overlay">
      <div className="spinner-border spinner-border-sm text-warning" role="status"></div>
      <span className="ms-2 small text-muted">Refreshing...</span>
    </div>
  );

  return (
    <DashboardLayout requiredRoles={[role]}>
      <style jsx>{`
        .metric-card { background: #fff; border-radius: 32px; padding: 2rem; border: 1px solid #f0f0f0; cursor: default; height: 100%; transition: transform 0.2s ease; position: relative; }
        .metric-card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .metric-icon { color: #ffc63a; font-size: 1.5rem; margin-bottom: 1.5rem; display: block; }
        .metric-label { font-size: 0.75rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; }
        .metric-value { font-size: 2.4rem; font-weight: 900; color: #000; line-height: 1.1; }
        .container-fluid { font-family: 'Poppins', 'Inter', sans-serif; }
        .card-wrap { background: #fff; border-radius: 24px; border: 1px solid #f0f0f0; box-shadow: 0 4px 24px rgba(0,0,0,0.03); overflow: hidden; height: 100%; position: relative; }
        .card-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .loading-overlay {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center;
          z-index: 10; border-radius: inherit; backdrop-filter: blur(2px);
        }
      `}</style>

      <div className="container-fluid py-4" style={{ minHeight: '100vh' }}>
        <div className="d-flex justify-content-between align-items-center mb-5">
          <div>
            <h1 style={{ fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: 4, fontFamily: 'Poppins' }}>Transactions / Reports</h1>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>Review financial performance and subscription analytics.</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold mb-0" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666' }}>Summary Overview</h6>
        </div>
        <div className="row g-4 mb-5">
          <div className="col-md-4">
            <div className="metric-card">
              <i className="bi bi-layers metric-icon"></i>
              <div className="metric-value">{summaryData?.summary.total_subscriptions || 0}</div>
              <div className="metric-label">Total Number of Subscription Plans Purchased</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="metric-card">
              <i className="bi bi-currency-rupee metric-icon"></i>
              <div className="metric-value">₹{summaryData?.summary.total_spent.toLocaleString('en-IN') || 0}</div>
              <div className="metric-label">Total Amount Spend on Subscription Plans </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="metric-card">
              <i className="bi bi-currency-rupee metric-icon"></i>
              <div className="metric-value">₹{summaryData?.summary.total_discount.toLocaleString('en-IN') || 0}</div>
              <div className="metric-label">Total Discounts Availed</div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="row g-4 mb-5">
          <div className="col-md-8">
            <div className="card-wrap p-4">
              {barLoading && <LoadingOverlay />}
              <div className="card-header-flex">
                <h6 className="fw-bold mb-0" style={{ fontSize: '0.9rem', color: '#1a1a1a', fontFamily: "inter" }}>Total Amount Spend on Subscription Plans
                </h6>
                <RangePicker value={barRange} onChange={setBarRange} />
              </div>
              <div style={{ height: '320px' }}><canvas ref={barChartRef}></canvas></div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card-wrap p-4">
              {pieLoading && <LoadingOverlay />}
              <div className="card-header-flex">
                <h6 className="fw-bold mb-0" style={{ fontSize: '0.9rem', color: '#1a1a1a', fontFamily: "inter" }}>Bifurcation</h6>
                <RangePicker value={pieRange} onChange={setPieRange} />
              </div>
              <div style={{ height: '320px' }}><canvas ref={pieChartRef}></canvas></div>
            </div>
          </div>
        </div>

        {/* Plan Counts Row */}
        <div className="row g-4 mb-5">
          {(() => {
            const isBothOrAdmin = countData?.user_type === 'both' || ['admin', 'super_admin', 'superadmin'].includes(countData?.user_role || '');
            if (isBothOrAdmin) {
              return (
                <>
                  <div className="col-md-8">
                    <div className="card-wrap p-4">
                      {countLoading && <LoadingOverlay />}
                      <div className="card-header-flex">
                        <h6 className="fw-bold mb-0" style={{ fontSize: '0.9rem', color: '#1a1a1a', fontFamily: "inter" }}>Total Number of Subscription Plans Purchased</h6>
                        <RangePicker value={countRange} onChange={setCountRange} />
                      </div>
                      <div style={{ height: '320px' }}><canvas ref={countChartRef}></canvas></div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card-wrap p-4">
                      {countPieLoading && <LoadingOverlay />}
                      <div className="card-header-flex">
                        <h6 className="fw-bold mb-0" style={{ fontSize: '0.9rem', color: '#1a1a1a', fontFamily: "inter" }}>Bifurcation</h6>
                        <RangePicker value={countPieRange} onChange={setCountPieRange} />
                      </div>
                      <div style={{ height: '320px' }}><canvas ref={countPieChartRef}></canvas></div>
                    </div>
                  </div>
                </>
              );
            } else {
              return (
                <div className="col-md-12">
                  <div className="card-wrap p-4">
                    {countLoading && <LoadingOverlay />}
                    <div className="card-header-flex">
                      <h6 className="fw-bold mb-0" style={{ fontSize: '0.9rem', color: '#1a1a1a' }}>Transaction History Trends</h6>
                      <RangePicker value={countRange} onChange={setCountRange} />
                    </div>
                    <div style={{ height: '320px' }}><canvas ref={countChartRef}></canvas></div>
                  </div>
                </div>
              );
            }
          })()}
        </div>

        {/* History Table */}
        <div className="card-wrap mb-5">
          {historyLoading && <LoadingOverlay />}
          <div className="p-4 d-flex justify-content-between align-items-center">
            <div>
              <h6 className="fw-bold mb-1" style={{ color: '#1a1a1a' }}>Payment History</h6>
              <p className="text-muted small mb-0">Latest transactions for the selected range.</p>
            </div>
            <RangePicker value={historyRange} onChange={setHistoryRange} />
          </div>
          <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <DataTable columns={columns} data={historyData?.transactions || []} loading={false} emptyIcon="bi bi-receipt" emptyText="No transaction history for this period." />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
