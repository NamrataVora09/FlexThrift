import { Metadata } from 'next';
import SubscriptionsView from '@/components/shared/SubscriptionsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Subscriptions — Seller — FlexMarket',
  description: 'Manage your subscription plan on FlexMarket.',
};

export default async function SellerSubscriptionsPage() {
  return <SubscriptionsView role="seller" userType="seller" />;
}
