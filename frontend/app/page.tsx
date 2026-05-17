import HomePageClient from '../components/landing/HomePageClient';
import SeoManager from '../components/shared/SeoManager';

export default function RootPage() {
  return (
    <>
      <SeoManager pageKey="home" />
      <HomePageClient />
    </>
  );
}
