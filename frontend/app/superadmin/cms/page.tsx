import { Metadata } from 'next';
import CmsPagesView from '@/components/shared/CmsPagesView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'CMS Pages — SuperAdmin — FlexMarket',
  description: 'Manage CMS content pages on FlexMarket.',
};

export default async function CmsPagesPage() {
  return <CmsPagesView />;
}
