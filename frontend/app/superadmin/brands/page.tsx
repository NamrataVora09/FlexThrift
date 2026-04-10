import { Metadata } from 'next';
import BrandsClient from './BrandsClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Brands — SuperAdmin — FlexMarket',
  description: 'Manage seller brands and brand assignments on FlexMarket.',
};

export default async function BrandsPage() {
  return <BrandsClient />;
}
