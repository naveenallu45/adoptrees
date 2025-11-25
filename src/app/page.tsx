import HeroSection from '@/components/Home/HeroSection';
import HowItWorks from '@/components/Home/HowItWorks';
import CompanyorPerson from '@/components/Home/CompanyorPerson';
import AfterPlant from '@/components/Home/AfterPlant';
import WhyWithUs from '@/components/Home/WhyWithUs';

export default function Home() {
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
