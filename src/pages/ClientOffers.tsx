import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ClientOffersList from '../components/offers/ClientOffersList';

const ClientOffers: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-24">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <ClientOffersList />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ClientOffers;
