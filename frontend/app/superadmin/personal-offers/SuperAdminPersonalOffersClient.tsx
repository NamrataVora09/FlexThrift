'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import OffersView from '@/components/shared/OffersView';

export default function SuperAdminPersonalOffersClient() {
  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <OffersView role="super_admin" apiPath="/superadmin/personal-offers" perspective="combined" noLayout={true} />
    </DashboardLayout>
  );
}
