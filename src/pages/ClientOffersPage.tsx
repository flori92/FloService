import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ClientOffersList from '../components/offers/ClientOffersList';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';

const ClientOffersPage: React.FC = () => {
  const { user } = useAuthStore();

  // Rediriger si l'utilisateur n'est pas connecté
  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-24">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Mes offres de service</h1>
          <p className="text-gray-600 mb-8">
            Consultez et gérez les offres de service que vous avez reçues des prestataires.
          </p>
          
          <ClientOffersList />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ClientOffersPage;
