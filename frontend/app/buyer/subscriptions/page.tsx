'use client';

import { Suspense } from 'react';
import SubscriptionsView from '@/components/shared/SubscriptionsView';

export default function BuyerSubscriptionsPage() {
  return (
    <Suspense fallback={<div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }} /></div>}>
      <SubscriptionsView role="buyer" userType="buyer" />
    </Suspense>
  );
}
