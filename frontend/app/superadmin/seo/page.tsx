import { Metadata } from 'next';
import SeoSettingsView from '@/components/shared/SeoSettingsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'SEO Settings — SuperAdmin — FlexMarket',
  description: 'Configure and optimize meta tags, titles, and keywords for all platform pages on FlexMarket.',
};

export default async function SeoSettingsPage() {
  return <SeoSettingsView />;
}
