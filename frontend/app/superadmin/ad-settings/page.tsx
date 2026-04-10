import { Metadata } from 'next';
import AdSettingsClient from './AdSettingsClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Ad Settings — SuperAdmin — FlexMarket',
  description: 'Configure advertisement settings and ad slots on FlexMarket.',
};

export default async function AdSettingsPage() {
  return <AdSettingsClient />;
}
