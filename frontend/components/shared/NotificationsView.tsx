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
                {items.map((n) => (
                  <div key={n.id} className={`list-group-item d-flex align-items-start gap-3 ${n.is_read ? '' : 'bg-light'}`}>
                    <i className={`${ICON_MAP[n.type] || ICON_MAP.default} mt-1`} style={{ color: '#ffc63a', fontSize: 18 }}></i>
                    <div className="flex-grow-1">
                      <h6 className="mb-1 fw-semibold">{n.title}</h6>
                      <p className="mb-1 normal_label_font">{n.message}</p>
                      <small className="text-muted">{new Date(n.created_at).toLocaleString('en-IN')}</small>
                    </div>
                    {!n.is_read && <span className="badge rounded-pill bg-danger">New</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
