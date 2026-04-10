import { Metadata } from 'next';
import ZonesView from '@/components/shared/ZonesView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Service Zones — SuperAdmin — FlexMarket',
  description: 'Manage service zones and delivery areas on FlexMarket.',
};

export default async function ZonesPage() {
  return <ZonesView />;
}
