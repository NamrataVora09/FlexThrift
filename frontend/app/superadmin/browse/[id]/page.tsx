import { Metadata } from 'next';
import SAProductDetailClient from './ProductDetailClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Product Detail — SuperAdmin — FlexMarket',
  description: 'View detailed product information on FlexMarket.',
};

export default async function ProductDetailPage() {
  return <SAProductDetailClient />;
}
