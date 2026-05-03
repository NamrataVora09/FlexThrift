'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  related_id?: number;
  created_at: string;
}

function getIconInfo(title: string, type: string, message: string) {
  const titleLower = (title || '').toLowerCase();
  const msgLower = (message || '').toLowerCase();
  
  if (titleLower.includes('accepted') || titleLower.includes('finalized') || titleLower.includes('confirmed')) {
    return { iconClass: 'icon-success', icon: 'bi bi-chat-left-dots-fill' };
  } else if (titleLower.includes('rejected') || titleLower.includes('not accepted')) {
    return { iconClass: 'icon-reject', icon: 'bi bi-chat-left-dots-fill' };
  } else if (titleLower.includes('suggested') || titleLower.includes('proposed') || msgLower.includes('suggested') || msgLower.includes('proposed')) {
    return { iconClass: 'icon-suggest', icon: 'fa-solid fa-calendar-days' };
  }
  return { iconClass: 'icon-default', icon: 'fa-solid fa-circle-info' };
}

function getRelatedLink(title: string, relatedId: number) {
  const titleLower = (title || '').toLowerCase();
  if (titleLower.includes('order')) return `/buyer/order/${relatedId}`;
  if (titleLower.includes('offer')) return '/buyer/my-offers';
  return null;
}

export default function Page() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Notification[]>('/buyer/notifications').then((r) => {
      if (r.success && r.data) setItems(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    const res = await api.post('/buyer/mark-notifications-read');
    if (res?.success) {
      toast.success('All notifications marked as read');
      load();
    } else {
      toast.error(res?.message || 'Failed to mark notifications as read');
    }
    setMarkingRead(false);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' }) +
      ' \u2022 ' +
      date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
      <style jsx>{`
        .notification-card {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          margin-bottom: 15px;
          border-left: 6px solid #f0f0f0;
          transition: all 0.3s ease;
          position: relative;
        }
        .notification-card.unread {
          border-left-color: #ffc63a;
          background: #fffdf7;
        }
        .notification-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
        }
        .notif-icon-box {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin-right: 20px;
          flex-shrink: 0;
        }
        .icon-success { background: #e8f5e9; color: #2e7d32; }
        .icon-reject { background: #ffebee; color: #d32f2f; }
        .icon-suggest { background: #e3f2fd; color: #1976d2; }
        .icon-default { background: #f8f9fa; color: #adb5bd; }
        .unread-indicator {
          width: 12px;
          height: 12px;
          background: #ffc63a;
          border-radius: 50%;
          position: absolute;
          top: 25px;
          right: 25px;
          box-shadow: 0 0 10px rgba(255, 198, 58, 0.5);
        }
        .header-section {
          background: white;
          border-radius: 20px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }
        .empty-state {
          padding: 80px 20px;
          text-align: center;
          background: white;
          border-radius: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }
      `}</style>

      <div className="header-section d-sm-flex justify-content-between align-items-center">
        <div>
          <h2 style={{ fontWeight: 700 }}>
            <i className="bi bi-bell-fill text-warning me-2"></i> Notifications
          </h2>
          <p className="text-muted mb-0">Stay updated with your latest activities</p>
        </div>
        {items.length > 0 && (
          <div className="mt-3 mt-sm-0">
            <button
              className="btn btn-outline-dark px-4 fw-bold rounded-pill"
              onClick={handleMarkAllRead}
              disabled={markingRead}
            >
              {markingRead ? (
                <><span className="spinner-border spinner-border-sm me-2"></span> Syncing...</>
              ) : (
                <><i className="bi bi-check-all me-1"></i> Mark all as read</>
              )}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" style={{ color: '#ffc63a' }} />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-bell-slash mb-4 text-warning" style={{ fontSize: '5rem' }}></i>
          <h3 className="fw-bold">No notifications yet</h3>
          <p className="text-muted mb-4">You&apos;re all caught up! New alerts will appear here as they arrive.</p>
          <Link href="/buyer" className="btn btn-warning px-5 rounded-pill fw-bold">
            <i className="bi bi-house-door me-2"></i> Back to Dashboard
          </Link>
        </div>
      ) : (
        <div className="notification-list mb-5">
          {items.map((notif) => {
            const { iconClass, icon } = getIconInfo(notif.title, notif.type, notif.message);
            const link = notif.related_id ? getRelatedLink(notif.title, notif.related_id) : null;

            return (
              <div key={notif.id} className={`notification-card ${notif.is_read ? '' : 'unread'}`}>
                {!notif.is_read && <div className="unread-indicator"></div>}

                <div className="d-flex align-items-start">
                  <div className={`notif-icon-box ${iconClass}`}>
                    <i className={icon}></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <h6 className="mb-0 fw-bold">{notif.title}</h6>
                      <small className="text-muted">
                        <i className="bi bi-clock me-1"></i>
                        {formatDate(notif.created_at)}
                      </small>
                    </div>
                    <p className="mb-0 text-muted small lh-base">{notif.message}</p>

                    {link && (
                      <Link
                        href={link}
                        className="btn btn-link btn-sm p-0 mt-2 text-decoration-none fw-bold text-dark"
                      >
                        View Details <i className="bi bi-arrow-right ms-1"></i>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
