import { Metadata } from 'next';
import SubscriptionPlansAdmin from '@/components/shared/SubscriptionPlansAdmin';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Subscription Plans — Admin — FlexMarket',
  description: 'Manage subscription plans for FlexMarket users.',
};

export default async function SubscriptionPlansPage() {
  return <SubscriptionPlansAdmin />;
}
