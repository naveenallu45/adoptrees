import Navbar from '../../components/Home/Navbar';
import HeroSection from '../../components/Companies/HeroSection';
import Products from '../../components/Companies/Products';
import Banner from '../../components/Companies/Banner';
import Footer from '../../components/Home/Footer';

export default function Companies() {
  return (
    <main className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />
      <HeroSection />
      <Products />
      <Banner />
      <Footer />
    </main>
  );
}
