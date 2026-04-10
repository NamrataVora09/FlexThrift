import { Metadata } from 'next';
import NotificationsView from '@/components/shared/NotificationsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Notifications — Seller — FlexMarket',
  description: 'View your latest notifications and updates on FlexMarket.',
};

export default async function SellerNotificationsPage() {
  return <NotificationsView role="seller" apiPath="/seller/notifications" />;
}
