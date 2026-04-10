'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusFilter from '@/components/shared/StatusFilter';
import { api } from '@/lib/api';

interface Order {
  id: number; product_title: string; buyer_name: string; status: string;
  final_price: string; created_at: string; listing_type: string;
  delivery_address: string;
}

export default function DeliveryHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get<Order[]>('/delivery/history').then((r) => {
      if (r.success && r.data) setOrders(r.data);
      setLoading(false);
    });
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    ['delivered', 'completed', 'picked_up', 'in_transit', 'assigned'].forEach(s => {
      c[s] = orders.filter(o => o.status === s).length;
    });
    return c;
  }, [orders]);

  return (
    <DashboardLayout requiredRoles={['delivery']}>
      <div className="container">
        <h1 className="header_label_font mb-4">Delivery History</h1>
        <StatusFilter filters={['all', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed']} counts={counts} active={filter} onChange={setFilter} />
        <div className="card">
          <div className="card-body">
            {loading ? (
              <div className="text-center py-4"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-truck" style={{ fontSize: 48, color: '#ddd' }}></i>
                <p className="normal_label_font mt-3">No deliveries found</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>#</th><th>Product</th><th>Buyer</th><th>Address</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {filtered.map((o) => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>
                          <span className="fw-semibold">{o.product_title || '—'}</span>
                          {o.listing_type && <><br /><small className={o.listing_type === 'rent' ? 'rent_typ' : 'sell_typ'}>{o.listing_type}</small></>}
                        </td>
                        <td>{o.buyer_name || '—'}</td>
                        <td><small>{o.delivery_address || '—'}</small></td>
                        <td className="fw-bold">₹{o.final_price}</td>
                        <td><span className={`status-badge ${o.status}`}>{o.status}</span></td>
                        <td className="normal_label_font">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
