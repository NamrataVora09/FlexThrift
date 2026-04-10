import { Metadata } from 'next';
import AnalyticsView from '@/components/shared/AnalyticsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Analytics — Seller — FlexMarket',
  description: 'View your sales analytics and performance metrics on FlexMarket.',
};

export default async function SellerAnalyticsPage() {
  return <AnalyticsView role="seller" />;
}
