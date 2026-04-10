import { Metadata } from 'next';
import BusinessSettingsView from '@/components/shared/BusinessSettingsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Business Settings — SuperAdmin — FlexMarket',
  description: 'Configure business-wide settings for the FlexMarket platform.',
};

export default async function BusinessSettingsPage() {
  return <BusinessSettingsView />;
}
