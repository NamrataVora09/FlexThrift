'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import OffersView from '@/components/shared/OffersView';
import { useAuth } from '@/lib/auth-context';

export default function AdminOffersClient() {
  const { user } = useAuth();
  const [perspective, setPerspective] = useState<'buyer' | 'seller' | 'combined'>('seller');

  const isBlockedBuyer = Number(user?.blocked_buyer) === 1;
  const isBlockedSeller = Number(user?.blocked_seller) === 1;

  // Auto-switch away from blocked perspective if it somehow gets set
  useEffect(() => {
    if (perspective === 'buyer' && isBlockedBuyer) setPerspective('seller');
    if (perspective === 'seller' && isBlockedSeller) setPerspective('buyer');
  }, [perspective, isBlockedBuyer, isBlockedSeller]);

  return (
    <DashboardLayout requiredRoles={['admin']}>
      <div className="container-fluid mb-4">
        <div className="d-flex justify-content-between align-items-center  p-3 rounded-4 ">
          <div>
            <h4 className="fw-bold mb-1">My Offers</h4>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted fw-bold">View as:</span>
            <select
              className="form-select border shadow-sm rounded-pill px-4 py-2"
              style={{ width: 140, background: '#f8f9fa', fontSize: '0.875rem' }}
              value={perspective}
              onChange={(e) => setPerspective(e.target.value as 'buyer' | 'seller')}
            >
              <option value="combined">Combined</option>
              {!isBlockedSeller && <option value="seller">Seller</option>}
              {!isBlockedBuyer && <option value="buyer">Buyer</option>}
            </select>
          </div>
        </div>
      </div>
      <OffersView
        role="admin"
        apiPath="/admin/personal-offers"
        perspective={perspective}
        noLayout={true}
      />
    </DashboardLayout>
  );
}


