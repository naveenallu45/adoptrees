import HeroSection from '@/components/Home/HeroSection';
import HowItWorks from '@/components/Home/HowItWorks';
import CompanyorPerson from '@/components/Home/CompanyorPerson';
import AfterPlant from '@/components/Home/AfterPlant';
import WhyWithUs from '@/components/Home/WhyWithUs';

export default function Home() {
  return (
    <main className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <HeroSection />
      <HowItWorks />
      <CompanyorPerson />
      <AfterPlant />
      <WhyWithUs />
    </main>
  );
}
