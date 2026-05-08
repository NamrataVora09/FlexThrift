'use client';

import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/ui/StatsCard';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Activity {
  action_type: string;
  display_summary: string;
  user_name: string | null;
  created_at: string;
}

interface RecentUser {
  id: number;
  name: string;
  email: string;
  user_type: string;
  created_at: string;
}

import { useAuth } from '@/lib/auth-context';

interface SAData {
  user: { name: string };
  stats: Record<string, number>;
  registrations: Array<{ date: string; count: number }>;
  userDistribution: { labels: string[]; data: number[] };
  recentUsers: RecentUser[];
  activities: Activity[];
}

const AVATAR_COLORS = ['#377dff', '#ffc63a', '#8b5cf6', '#ed4c78', '#ff9d00', '#10b981'];

export default function SuperAdminDashboardClient() {
  const { refreshKey } = useAuth();
  const [data, setData] = useState<SAData | null>(null);
  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const doughnutChartRef = useRef<HTMLCanvasElement>(null);
  const chartsRef = useRef<any[]>([]);

  useEffect(() => {
    api.get<SAData>('/superadmin/dashboard').then((r) => {
      if (r.success && r.data) setData(r.data);
    });
  }, [refreshKey]);

  // Draw charts when data loads
  useEffect(() => {
    if (!data || typeof window === 'undefined') return;

    const loadChart = async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      // Destroy old charts
      chartsRef.current.forEach((c) => c?.destroy());
      chartsRef.current = [];

      // Fill 30-day registration data with gaps
      const regMap = new Map(data.registrations.map((r) => [r.date, Number(r.count)]));
      const labels: string[] = [];
      const counts: number[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }));
        counts.push(regMap.get(key) || 0);
      }

      // Line chart — Registration Trend
      if (lineChartRef.current) {
        const ctx = lineChartRef.current.getContext('2d')!;
        chartsRef.current.push(
          new Chart(ctx, {
            type: 'line',
            data: {
              labels,
              datasets: [
                {
                  label: 'New Registrations',
                  data: counts,
                  borderColor: '#ffc63a',
                  backgroundColor: 'rgba(255, 198, 58, 0.1)',
                  borderWidth: 3,
                  fill: true,
                  tension: 0.4,
                  pointRadius: 4,
                  pointBackgroundColor: '#fff',
                  pointBorderColor: '#ffc63a',
                  pointHoverRadius: 6,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#edf2f7' } },
              },
            },
          })
        );
      }

      // Doughnut chart — User Distribution
      if (doughnutChartRef.current) {
        const ctx = doughnutChartRef.current.getContext('2d')!;
        chartsRef.current.push(
          new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: data.userDistribution.labels,
              datasets: [
                {
                  data: data.userDistribution.data,
                  backgroundColor: ['#377dff', '#8b5cf6', '#10b981', '#ed4c78'],
                  hoverOffset: 4,
                  borderWidth: 0,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '70%',
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { usePointStyle: true, padding: 20, font: { family: 'Inter', weight: 600 } },
                },
              },
            },
          })
        );
      }
    };

    loadChart();

    return () => {
      chartsRef.current.forEach((c) => c?.destroy());
    };
  }, [data]);

  const s = data?.stats;

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        <h1 className="header_label_font mb-1">Analytics Dashboard</h1>
        <p className="normal_label_font mb-4">
          Welcome back, {data?.user.name}. Real-time platform performance and user engagement metrics.
        </p>

        {/* Stat Cards — User Overview */}
        <h6 className="subsection_label_font mb-3">User Overview</h6>
        <div className="row">
          <div className="col-md-2 mt-2">
            <StatsCard title="Total Users" value={s?.total_users ?? 0} icon="bi bi-people-fill" />
          </div>
          <div className="col-md-2 mt-2">
            <StatsCard title="Buyers" value={s?.buyers ?? 0} icon="bi bi-bag-heart" color="#3b82f6" />
          </div>
          <div className="col-md-2 mt-2">
            <StatsCard title="Sellers" value={s?.sellers ?? 0} icon="bi bi-shop" color="#10b981" />
          </div>
          <div className="col-md-2 mt-2">
            <StatsCard title="Both" value={s?.both ?? 0} icon="bi bi-arrow-left-right" color="#8b5cf6" />
          </div>
          <div className="col-md-2 mt-2">
            <StatsCard title="Delivery" value={s?.delivery ?? 0} icon="bi bi-truck" color="#f59e0b" />
          </div>
          <div className="col-md-2 mt-2">
            <StatsCard title="Admins" value={s?.admins ?? 0} icon="bi bi-shield-lock" color="#ef4444" />
          </div>
        </div>

        {/* Stat Cards — Products & Offers */}
        <h6 className="subsection_label_font mt-4 mb-3">Products & Offers</h6>
        <div className="row">
          <div className="col-md-3 mt-2">
            <StatsCard title="Total Products" value={s?.total_products ?? 0} icon="bi bi-box-seam" />
          </div>
          <div className="col-md-3 mt-2">
            <StatsCard title="Pending Products" value={s?.pending_products ?? 0} icon="bi bi-clock-history" color="#f59e0b" />
          </div>
          <div className="col-md-3 mt-2">
            <StatsCard title="Total Offers" value={s?.total_offers ?? 0} icon="bi bi-tags" color="#6366f1" />
          </div>
          <div className="col-md-3 mt-2">
            <StatsCard title="Accepted Offers" value={s?.accepted_offers ?? 0} icon="bi bi-check-circle" color="#10b981" />
          </div>
        </div>

        {/* Charts Row */}
        <div className="row mt-4">
          <div className="col-lg-8 mt-3">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="fw-bold mb-0">User Registration Trend</h5>
                <p className="text-muted small">Daily new user registrations over the last 30 days</p>
                <div style={{ height: 320 }}>
                  <canvas ref={lineChartRef}></canvas>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4 mt-3">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="fw-bold mb-0">User Distribution</h5>
                <p className="text-muted small">Breakdown by account type</p>
                <div style={{ height: 320 }}>
                  <canvas ref={doughnutChartRef}></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New Registrations + Platform Activity */}
        <div className="row mt-4">
          {/* Recent Registrations Table */}
          <div className="col-lg-7 mt-3">
            <div className="card h-100">
              <div className="card-body p-0">
                <div className="d-flex justify-content-between align-items-center px-4 pt-4 pb-2">
                  <h5 className="fw-bold mb-0">New Registrations</h5>
                  <Link href="/superadmin/users" className="btn btn-sm btn-light fw-bold px-3">
                    View All
                  </Link>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th className="ps-4" style={{ fontSize: '0.75rem', letterSpacing: 1, color: '#4a5568', textTransform: 'uppercase', fontWeight: 700 }}>
                          User Details
                        </th>
                        <th style={{ fontSize: '0.75rem', letterSpacing: 1, color: '#4a5568', textTransform: 'uppercase', fontWeight: 700 }}>
                          Account Type
                        </th>
                        <th style={{ fontSize: '0.75rem', letterSpacing: 1, color: '#4a5568', textTransform: 'uppercase', fontWeight: 700 }}>
                          Joined On
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.recentUsers && data.recentUsers.length > 0 ? (
                        data.recentUsers.map((u, i) => (
                          <tr key={u.id}>
                            <td className="ps-4">
                              <div className="d-flex align-items-center gap-3">
                                <div
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    color: '#fff',
                                    background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                  }}
                                >
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-bold">{u.name}</div>
                                  <div className="text-muted small">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  padding: '0.4rem 0.85rem',
                                  borderRadius: 8,
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  textTransform: 'uppercase',
                                  background: 'rgba(55,125,255,0.1)',
                                  color: '#377dff',
                                }}
                              >
                                {u.user_type}
                              </span>
                            </td>
                            <td className="text-muted">
                              {new Date(u.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: '2-digit',
                                year: 'numeric',
                              })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center py-5 text-muted">
                            No recent registrations.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Activity */}
          <div className="col-lg-5 mt-3">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="fw-bold mb-3">Platform Activity</h5>
                <div style={{ maxHeight: 460, overflowY: 'auto' }}>
                  {data?.activities && data.activities.length > 0 ? (
                    data.activities.map((act, i) => (
                      <div key={i} className="d-flex gap-3 mb-4">
                        <div className="flex-shrink-0">
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              // background: '#f4f6f9',
                              color: '#ffc63a',
                              fontSize: '1.1rem',
                            }}
                          >
                            <i className="bi bi-activity"></i>
                          </div>
                        </div>
                        <div>
                          <div className="fw-bold" style={{ fontSize: '0.9rem' }}>
                            {act.user_name || 'System'}
                          </div>
                          <p className="text-muted small mb-1">
                            <span className="fw-semibold" style={{ color: '#ffc63a' }}>
                              {act.action_type.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            : {act.display_summary}
                          </p>
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                            <i className="bi bi-clock me-1"></i>
                            {new Date(act.created_at).toLocaleDateString('en-US', {
                              day: '2-digit',
                              month: 'short',
                            })}
                            {', '}
                            {new Date(act.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-5 text-muted">No recent activities found.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
