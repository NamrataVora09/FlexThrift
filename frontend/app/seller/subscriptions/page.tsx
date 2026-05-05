'use client';

import { Suspense } from 'react';
import SubscriptionsView from '@/components/shared/SubscriptionsView';

export default function SellerSubscriptionsPage() {
  return (
    <Suspense fallback={<div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }} /></div>}>
      <SubscriptionsView role="seller" userType="seller" />
    </Suspense>
  );
}
