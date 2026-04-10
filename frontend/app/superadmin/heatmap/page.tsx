import { Metadata } from 'next';
import HeatmapClient from './HeatmapClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Registration Heatmap — SuperAdmin — FlexMarket',
  description: 'Visualize user registration attempts and service zones on FlexMarket.',
};

export default async function HeatmapPage() {
  return <HeatmapClient />;
}
