import { Metadata } from 'next';
import HelpView from '@/components/shared/HelpView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Help — Admin — FlexMarket',
  description: 'Get help and find answers to common questions on FlexMarket.',
};

export default async function AdminHelpPage() {
  return <HelpView role="admin" />;
}
