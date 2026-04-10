import { Metadata } from 'next';
import ModerationHistoryView from '@/components/shared/ModerationHistoryView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Moderation History — SuperAdmin — FlexMarket',
  description: 'View product moderation history across the platform.',
};

export default async function ModerationHistoryPage() {
  return <ModerationHistoryView role="super_admin" />;
}
