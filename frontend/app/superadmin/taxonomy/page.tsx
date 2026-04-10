import { Metadata } from 'next';
import TaxonomyView from '@/components/shared/TaxonomyView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Taxonomy — SuperAdmin — FlexMarket',
  description: 'Manage product categories and taxonomy structure.',
};

export default async function TaxonomyPage() {
  return <TaxonomyView />;
}
