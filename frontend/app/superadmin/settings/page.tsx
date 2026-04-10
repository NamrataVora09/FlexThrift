import { Metadata } from 'next';
import SettingsClient from './SettingsClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'System Settings — SuperAdmin — FlexMarket',
  description: 'Configure system-wide settings and maintenance on FlexMarket.',
};

export default async function SystemSettingsPage() {
  return <SettingsClient />;
}
