import { redirect } from 'next/navigation';
import HeroSection from '@/components/Home/HeroSection';
import HowItWorks from '@/components/Home/HowItWorks';
import CompanyorPerson from '@/components/Home/CompanyorPerson';
import AfterPlant from '@/components/Home/AfterPlant';
import WhyWithUs from '@/components/Home/WhyWithUs';
import { getSiteSettings } from '@/lib/site-settings';

// Home was getting stuck behind the service worker / static cache.
// Always render fresh so maintenance mode can apply here too.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const settings = await getSiteSettings();
  if (settings.maintenanceMode) {
    redirect('/maintenance');
  }

  return (
    <main className="bg-gradient-to-b from-white via-green-50 to-green-100 pb-12 sm:pb-16 md:pb-20 lg:pb-24">
      <HeroSection />
      <HowItWorks />
      <CompanyorPerson />
      <AfterPlant />
      <WhyWithUs />
    </main>
  );
}
