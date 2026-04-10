import { Metadata } from 'next';
import OrdersView from '@/components/shared/OrdersView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Orders — Seller — FlexMarket',
  description: 'Track and manage your orders on FlexMarket.',
};

export default async function SellerOrdersPage() {
  return <OrdersView role="seller" apiPath="/seller/orders" perspective="seller" />;
}
