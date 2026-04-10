import { Metadata } from 'next';
import ModerationHistoryView from '@/components/shared/ModerationHistoryView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Moderation History — Admin — FlexMarket',
  description: 'View product moderation history on FlexMarket.',
};

export default async function AdminModerationHistoryPage() {
  return <ModerationHistoryView role="admin" />;
}
