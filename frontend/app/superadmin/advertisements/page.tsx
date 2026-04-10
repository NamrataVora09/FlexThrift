import { Metadata } from 'next';
import AdvertisementsClient from './AdvertisementsClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Advertisements — SuperAdmin — FlexMarket',
  description: 'Manage advertisements and promotional content on FlexMarket.',
};

export default async function AdvertisementsPage() {
  return <AdvertisementsClient />;
}
