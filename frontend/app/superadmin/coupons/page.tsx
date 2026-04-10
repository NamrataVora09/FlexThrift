import { Metadata } from 'next';
import CouponsView from '@/components/shared/CouponsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Coupons — SuperAdmin — FlexMarket',
  description: 'Create and manage discount coupons on FlexMarket.',
};

export default async function CouponsPage() {
  return <CouponsView />;
}
