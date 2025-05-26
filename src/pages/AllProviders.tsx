import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LocationFilter from '../components/LocationFilter';
import { supabase } from '../lib/supabase';
import { ServiceProvider, CountryCode } from '../types';

const AllProviders: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<CountryCode | ''>(searchParams.get('country') as CountryCode || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [minRating, setMinRating] = useState(searchParams.get('rating') || '');

  useEffect(() => {
    loadProviders();
  }, [country, city, minRating]);

  const loadProviders = async () => {
    try {
      let query = supabase
        .from('providers')
        .select(`
          id,
          profiles:user_id (
            full_name,
            avatar_url,
            business_name
          ),
          profession,
          rating,
          reviews_count,
          created_at,
          city,
          country
        `)
        .order('rating', { ascending: false });

      if (country) {
        query = query.eq('country', country);
      }
      if (city) {
        query = query.eq('city', city);
      }
      if (minRating) {
        query = query.gte('rating', parseFloat(minRating));
      }

      const { data, error } = await query;

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    const params = new URLSearchParams();
    if (country) params.set('country', country);
    if (city) params.set('city', city);
    if (minRating) params.set('rating', minRating);
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Tous les prestataires
        </h1>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LocationFilter
              selectedCountry={country}
              selectedCity={city}
              onCountryChange={setCountry}
              onCityChange={setCity}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note minimum
              </label>
              <select
                value={minRating}
                onChange={(e) => {
                  setMinRating(e.target.value);
                  handleFilterChange();
                }}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">Toutes les notes</option>
                <option value="4">4+ étoiles</option>
                <option value="4.5">4.5+ étoiles</option>
                <option value="5">5 étoiles</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {providers.map((provider) => (
              <div key={provider.id} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col items-center text-center">
                  <img
                    src={provider.profiles.avatar_url || 'https://via.placeholder.com/96'}
                    alt={provider.profiles.full_name}
                    className="w-24 h-24 rounded-full object-cover mb-4"
                  />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {provider.profiles.full_name}
                  </h3>
                  <p className="text-gray-600 mb-2">{provider.profession}</p>
                  <div className="flex items-center mb-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="ml-1 text-gray-700">
                      {provider.rating} ({provider.reviews_count})
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {provider.city} • Membre depuis {new Date(provider.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </p>
                  <Link
                    to={`/provider/${provider.id}`}
                    className="text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Voir le profil
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && providers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">
              Aucun prestataire trouvé avec ces critères.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AllProviders;