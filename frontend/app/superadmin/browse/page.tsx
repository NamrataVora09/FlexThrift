import { Metadata } from 'next';
import BrowseClient from './BrowseClient';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Browse Products — SuperAdmin — FlexMarket',
  description: 'Browse and manage all marketplace products on FlexMarket.',
};

export default async function BrowsePage() {
  return <BrowseClient />;
}
