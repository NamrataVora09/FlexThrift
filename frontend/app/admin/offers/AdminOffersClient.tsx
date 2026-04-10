'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import OffersView from '@/components/shared/OffersView';

export default function AdminOffersClient() {
  return (
    <DashboardLayout requiredRoles={['admin']}>
      <OffersView role="admin" apiPath="/admin/personal-offers" perspective="combined" noLayout={true} />
    </DashboardLayout>
  );
}
