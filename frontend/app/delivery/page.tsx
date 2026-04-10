'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/ui/StatsCard';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface DeliveryData {
  user: { name: string };
  stats: { total_deliveries: number; completed: number; pending: number };
}

interface PendingOrder {
  id: number; product_title: string; listing_type: string;
  buyer_name: string; buyer_mobile: string;
  seller_name: string; seller_mobile: string;
  delivery_address: string; delivery_pin_code: string;
  final_price: string; status: string; created_at: string;
}

export default function DeliveryDashboard() {
  const [data, setData] = useState<DeliveryData | null>(null);
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = () => {
    api.get<DeliveryData>('/delivery/dashboard').then((r) => { if (r.success && r.data) setData(r.data); });
    api.get<PendingOrder[]>('/delivery/pending-deliveries').then((r) => { if (r.success && r.data) setPending(r.data); });
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (orderId: number, action: string) => {
    setActionLoading(orderId);
    let res;
    switch (action) {
      case 'accept': res = await api.post(`/delivery/accept-delivery/${orderId}`); break;
      case 'pickup': res = await api.post(`/delivery/picked-up/${orderId}`); break;
      case 'deliver': res = await api.post(`/delivery/mark-delivered/${orderId}`); break;
      default: res = { success: false, message: 'Unknown action' };
    }
    setActionLoading(null);
    if (res?.success) {
      toast.success(res?.message || 'Status updated');
      load();
    } else {
      toast.error(res?.message || 'Action failed');
    }
  };

  const getActionButton = (order: PendingOrder) => {
    const isLoading = actionLoading === order.id;
    switch (order.status) {
      case 'assigned':
        return <button className="btn btn-sm btn-success" disabled={isLoading} onClick={() => handleAction(order.id, 'accept')}><i className="bi bi-check-lg me-1"></i>{isLoading ? '...' : 'Accept'}</button>;
      case 'accepted_by_delivery':
      case 'dispatched':
        return <button className="btn btn-sm btn-info text-white" disabled={isLoading} onClick={() => handleAction(order.id, 'pickup')}><i className="bi bi-box-seam me-1"></i>{isLoading ? '...' : 'Picked Up'}</button>;
      case 'picked_up':
      case 'in_transit':
        return <button className="btn btn-sm btn-primary" disabled={isLoading} onClick={() => handleAction(order.id, 'deliver')}><i className="bi bi-geo-alt me-1"></i>{isLoading ? '...' : 'Delivered'}</button>;
      default:
        return <span className={`status-badge ${order.status}`}>{order.status}</span>;
    }
  };

  return (
    <DashboardLayout requiredRoles={['delivery']}>
      <div className="container">
        <h1 className="header_label_font mb-4">Delivery Dashboard</h1>
        <p className="normal_label_font mb-4">Welcome, {data?.user.name}</p>
        <div className="row">
          <div className="col-md-4 mt-2"><StatsCard title="Total Deliveries" value={data?.stats.total_deliveries ?? 0} icon="bi bi-truck" /></div>
          <div className="col-md-4 mt-2"><StatsCard title="Completed" value={data?.stats.completed ?? 0} icon="bi bi-check-circle" color="#10b981" /></div>
          <div className="col-md-4 mt-2"><StatsCard title="Pending" value={data?.stats.pending ?? 0} icon="bi bi-clock" color="#f59e0b" /></div>
        </div>

        <h4 className="fw-bold mt-5 mb-3"><i className="bi bi-truck me-2" style={{ color: '#ffc63a' }}></i>Active Deliveries</h4>
        <div className="card">
          <div className="card-body">
            {pending.length === 0 ? (
              <div className="text-center py-4">
                <i className="bi bi-emoji-smile" style={{ fontSize: 48, color: '#10b981' }}></i>
                <p className="normal_label_font mt-3">No pending deliveries</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>#</th><th>Product</th><th>Buyer</th><th>Seller</th>
                      <th>Delivery Address</th><th>Amount</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((o) => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>
                          <span className="fw-semibold">{o.product_title || '—'}</span>
                          <br /><small className={o.listing_type === 'rent' ? 'rent_typ' : 'sell_typ'}>{o.listing_type}</small>
                        </td>
                        <td>
                          <div className="fw-semibold">{o.buyer_name}</div>
                          {o.buyer_mobile && <small className="text-muted">{o.buyer_mobile}</small>}
                        </td>
                        <td>
                          <div className="fw-semibold">{o.seller_name}</div>
                          {o.seller_mobile && <small className="text-muted">{o.seller_mobile}</small>}
                        </td>
                        <td>
                          <small>{o.delivery_address || '—'}</small>
                          {o.delivery_pin_code && <><br /><small className="text-muted">PIN: {o.delivery_pin_code}</small></>}
                        </td>
                        <td className="fw-bold">₹{o.final_price}</td>
                        <td><span className={`status-badge ${o.status}`}>{o.status}</span></td>
                        <td>{getActionButton(o)}</td>
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
