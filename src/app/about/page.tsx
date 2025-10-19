import Navbar from '../../components/Home/Navbar';
import HeroSection from '../../components/About/HeroSection';
import Banner from '../../components/About/Banner';
import Footer from '../../components/Home/Footer';

export default function About() {
  return (
    <main className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />
      <HeroSection />
      <Banner />
      <Footer />
    </main>
  );
}
