import { Metadata } from 'next';
import { Suspense } from 'react';
import SubscriptionsView from '@/components/shared/SubscriptionsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Subscriptions — Seller — FlexMarket',
  description: 'Manage your subscription plan on FlexMarket.',
};

export default async function SellerSubscriptionsPage() {
  return (
    <Suspense fallback={<div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }} /></div>}>
      <SubscriptionsView role="seller" userType="seller" />
    </Suspense>
  );
}
