'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from './PageHeader';
import { api } from '@/lib/api';

interface Notification { id: number; title: string; message: string; type: string; is_read: number; created_at: string; }

const ICON_MAP: Record<string, string> = {
  offer: 'fa fa-tags', order: 'fa fa-shopping-bag', system: 'fa fa-cog', default: 'fa fa-bell',
};

interface Props {
  role: string;
  apiPath: string;
}

export default function NotificationsView({ role, apiPath }: Props) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Notification[]>(apiPath).then((r) => {
      if (r.success && r.data) setItems(r.data);
      setLoading(false);
    });
  }, [apiPath]);

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container">
        <PageHeader title="Notifications" />
        <div className="card">
          <div className="card-body">
            {loading ? (
              <div className="text-center py-4"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
            ) : items.length === 0 ? (
              <div className="text-center py-5">
                <i className="fa fa-bell" style={{ fontSize: 48, color: '#ddd' }}></i>
                <p className="normal_label_font mt-3">No notifications</p>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {items.map((n) => {
                  const title = n.title.toLowerCase();
                  const msg = n.message.toLowerCase();
                  let icon = 'fa-solid fa-circle-info';
                  let color = '#adb5bd';
                  let bg = '#f8f9fa';

                  if (title.includes('accepted') || title.includes('finalized') || title.includes('confirmed')) {
                    icon = 'bi bi-chat-left-dots-fill';
                    color = '#2e7d32'; // Green
                    bg = '#e8f5e9';
                  } else if (title.includes('rejected') || title.includes('not accepted')) {
                    icon = 'bi bi-chat-left-dots-fill';
                    color = '#d32f2f'; // Red
                    bg = '#ffebee';
                  } else if (title.includes('suggested') || title.includes('proposed') || msg.includes('suggested') || msg.includes('proposed')) {
                    icon = 'fa-solid fa-calendar-days';
                    color = '#1976d2';
                    bg = '#e3f2fd';
                  }

                  return (
                    <div key={n.id} className={`list-group-item d-flex align-items-start gap-3 py-3 ${n.is_read ? '' : 'bg-light bg-opacity-50'}`}>
                      <div
                        className="d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 40, height: 40, borderRadius: 10, background: bg, color: color }}
                      >
                        <i className={`${icon}`} style={{ fontSize: 18 }}></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <h6 className="mb-0 fw-bold" style={{ color: '#1f2937' }}>{n.title}</h6>
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                        </div>
                        <p className="mb-0 text-muted" style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>{n.message}</p>
                      </div>
                      {!n.is_read && (
                        <div className="ms-2">
                          <span className="badge rounded-pill" style={{ background: '#ffc63a', color: '#fff', fontSize: '0.65rem' }}>NEW</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
