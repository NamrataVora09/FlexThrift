'use client';
import ProfilePageClient from '@/components/shared/ProfilePageClient';

export default function BuyerProfilePage() {
  return <ProfilePageClient requiredRoles={['buyer', 'super_admin']} />;
}
