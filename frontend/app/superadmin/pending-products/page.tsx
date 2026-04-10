import { Metadata } from 'next';
import PendingProductsView from '@/components/shared/PendingProductsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Pending Products — SuperAdmin — FlexMarket',
  description: 'Review and approve or reject pending product submissions.',
};

export default async function SuperAdminPendingProductsPage() {
  return <PendingProductsView role="super_admin" apiPath="/superadmin/pending-products" showRatings />;
}
