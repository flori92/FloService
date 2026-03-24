import React from 'react';
import Header from '../components/Header';
import SearchHero from '../components/SearchHero';
import PubCarousel from '../components/PubCarousel';
import ServiceCategories from '../components/ServiceCategories';
import FeaturedFreelancers from '../components/FeaturedFreelancers';
import HowItWorksSection from '../components/HowItWorksSection';
import CtaSection from '../components/CtaSection';
import Testimonials from '../components/Testimonials';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <SearchHero />
        <div className="container mx-auto px-4 py-24">
          <PubCarousel />
        </div>
        <ServiceCategories />
        <FeaturedFreelancers />
        <HowItWorksSection />
        <CtaSection />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
};

export default Home;