import { Metadata } from 'next';
import SellerDashboardClient from './SellerDashboardClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Seller Dashboard — FlexMarket',
  description: 'Manage your products, track offers and grow your business on FlexMarket.',
};

export default async function SellerDashboardPage() {
  return <SellerDashboardClient />;
}
