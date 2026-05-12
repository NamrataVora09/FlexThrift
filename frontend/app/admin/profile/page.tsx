'use client';
import ProfilePageClient from '@/components/shared/ProfilePageClient';

export default function AdminProfilePage() {
  return <ProfilePageClient requiredRoles={['admin', 'super_admin']} />;
}
