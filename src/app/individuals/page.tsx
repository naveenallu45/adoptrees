import Navbar from '../../components/Home/Navbar';
import HeroSection from '../../components/Individuals/HeroSection';
import Products from '../../components/Individuals/Products';
import Banner from '../../components/Individuals/Banner';
import Footer from '../../components/Home/Footer';

export default function Individuals() {
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
