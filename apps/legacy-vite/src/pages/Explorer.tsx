import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProviderCard from '../components/ProviderCard';
import LocationFilter from '../components/LocationFilter';
import { useProviders } from '../hooks/useProviders';
import { CountryCode } from '../types';

const Explorer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [country, setCountry] = useState<CountryCode | ''>(searchParams.get('country') as CountryCode || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  const providers = useProviders(searchQuery, country, city);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (country) params.append('country', country);
    if (city) params.append('city', city);
    setSearchParams(params);
  };

  const popularSearches = [
    { id: 'plumbing', label: 'Plomberie' },
    { id: 'electricity', label: 'Électricité' },
    { id: 'homecare', label: 'Services à domicile' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main>
        {/* Search Section */}
        <div className="bg-gradient-to-r from-teal-500 to-blue-500 pt-32 pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <LocationFilter
                    selectedCountry={country}
                    selectedCity={city}
                    onCountryChange={setCountry}
                    onCityChange={setCity}
                  />
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un service..."
                    className="w-full p-4 pr-12 border border-gray-300 rounded-lg"
                  />
                  <button 
                    type="submit"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-teal-600"
                  >
                    <Search className="w-6 h-6" />
                  </button>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Populaire :</p>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setSearchQuery(service.label)}
                        className="px-3 py-1 bg-gray-100 hover:bg-teal-50 text-gray-700 hover:text-teal-600 rounded-full text-sm"
                      >
                        {service.label}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="container mx-auto px-4 py-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {providers.length} prestataires trouvés
            </h2>
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Explorer;