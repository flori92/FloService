import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LocationFilter from '../components/LocationFilter';
import ProviderCard from '../components/ProviderCard';
import { useProviders } from '../hooks/useProviders';
import { CountryCode } from '../types';
import { categories } from '../data/providers';

const CategoryPage: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | ''>('');
  const [selectedCity, setSelectedCity] = useState('');

  const providers = useProviders(category, selectedCountry, selectedCity);
  const categoryData = categories.find(c => c.id === category);

  if (!categoryData) {
    return <div>Catégorie non trouvée</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {categoryData.title}
          </h1>
          <p className="text-gray-600 mb-6">
            {categoryData.description}
          </p>
          
          <LocationFilter
            selectedCountry={selectedCountry}
            selectedCity={selectedCity}
            onCountryChange={setSelectedCountry}
            onCityChange={setSelectedCity}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>

        {providers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">
              Aucun prestataire trouvé pour ces critères.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CategoryPage;