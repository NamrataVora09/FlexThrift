import { Metadata } from 'next';
import { Suspense } from 'react';
import SubscriptionsView from '@/components/shared/SubscriptionsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Subscriptions — Admin — FlexMarket',
  description: 'View subscription plans on FlexMarket.',
};

export default async function AdminSubscriptionsPage() {
  return (
    <Suspense fallback={<div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }} /></div>}>
      {/* We pass a generic userType; the view handles admin exemption */}
      <SubscriptionsView role="admin" userType="seller" />
    </Suspense>
  );
}
