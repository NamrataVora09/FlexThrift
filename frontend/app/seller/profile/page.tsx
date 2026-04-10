import { Metadata } from 'next';
import ProfileView from '@/components/shared/ProfileView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Profile — Seller — FlexMarket',
  description: 'Manage your seller profile and account settings on FlexMarket.',
};

export default async function SellerProfilePage() {
  return <ProfileView role="seller" />;
}
