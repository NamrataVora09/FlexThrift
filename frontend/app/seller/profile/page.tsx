'use client';
import ProfilePageClient from '@/components/shared/ProfilePageClient';

export default function SellerProfilePage() {
  return <ProfilePageClient requiredRoles={['seller', 'super_admin']} />;
}
