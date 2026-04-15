'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import OffersView from '@/components/shared/OffersView';

export default function SuperAdminPersonalOffersClient() {
  const [perspective, setPerspective] = useState<'buyer' | 'seller'>('seller');

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid mb-4">
        <div className="d-flex justify-content-end align-items-center  p-3 rounded-4 ">

          <div className="d-flex  align-items-center gap-2">
            <span className="small text-muted fw-bold">View as:</span>
            <select
              className="form-select border shadow-sm rounded-pill px-4 py-2"
              style={{ width: 140, background: '#f8f9fa', fontSize: '0.875rem' }}
              value={perspective}
              onChange={(e) => setPerspective(e.target.value as 'buyer' | 'seller')}
            >
              <option value="seller">Seller</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>
        </div>
      </div>
      <OffersView
        role="super_admin"
        apiPath="/superadmin/personal-offers"
        perspective={perspective}
        noLayout={true}
      />
    </DashboardLayout>
  );
}

