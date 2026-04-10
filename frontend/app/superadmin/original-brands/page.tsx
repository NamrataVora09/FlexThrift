import { Metadata } from 'next';
import OriginalBrandsClient from './OriginalBrandsClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Original Brands — SuperAdmin — FlexMarket',
  description: 'Manage certified brand catalog on FlexMarket.',
};

export default async function OriginalBrandsPage() {
  return <OriginalBrandsClient />;
}
