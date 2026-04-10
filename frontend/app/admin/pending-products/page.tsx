import { Metadata } from 'next';
import PendingProductsView from '@/components/shared/PendingProductsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Pending Products — Admin — FlexMarket',
  description: 'Review and approve or reject pending product submissions.',
};

export default async function AdminPendingProductsPage() {
  return <PendingProductsView role="admin" apiPath="/admin/pending-products" />;
}
