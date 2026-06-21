'use client';
import ProfilePageClient from '@/components/shared/ProfilePageClient';

export default function SuperAdminProfilePage() {
    return <ProfilePageClient requiredRoles={['admin', 'super_admin']} />;
}
