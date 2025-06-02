import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchCountries, fetchCitiesByCountry } from '../utils/supabaseHelpers';
import toast from 'react-hot-toast';

// Types pour les pays et villes
type Country = {
  id: number;
  nom: string;
  code: string;
};

type City = {
  id: number;
  nom: string;
};

const SearchHero: React.FC = () => {
  const navigate = useNavigate();
  const [countryCode, setCountryCode] = useState('');
  const [cityName, setCityName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [countriesList, setCountriesList] = useState<Country[]>([]);
  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Récupération des pays au chargement du composant
  useEffect(() => {
    const loadCountries = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await fetchCountries();
        if (error) {
          console.error('Erreur lors de la récupération des pays:', error);
          toast.error('Impossible de charger la liste des pays');
        } else if (data && Array.isArray(data) && data.length > 0) {
          // Vérification du type et conversion sécurisée
          const safeData = data.filter(item => 
            typeof item === 'object' && 
            item !== null && 
            'id' in item && 
            'nom' in item && 
            'code' in item
          ) as Country[];
          
          setCountriesList(safeData);
        }
      } catch (err) {
        console.error('Exception lors de la récupération des pays:', err);
        toast.error('Erreur lors du chargement des pays');
      } finally {
        setIsLoading(false);
      }
    };

    loadCountries();
  }, []);

  // Récupération des villes lorsque le pays change
  useEffect(() => {
    const loadCities = async () => {
      if (!countryCode) {
        setCitiesList([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await fetchCitiesByCountry(countryCode);
        if (error) {
          console.error(`Erreur lors de la récupération des villes pour ${countryCode}:`, error);
          toast.error('Impossible de charger la liste des villes');
        } else if (data && Array.isArray(data) && data.length > 0) {
          // Vérification du type et conversion sécurisée
          const safeData = data.filter(item => 
            typeof item === 'object' && 
            item !== null && 
            'id' in item && 
            'nom' in item
          ) as City[];
          
          setCitiesList(safeData);
        }
      } catch (err) {
        console.error('Exception lors de la récupération des villes:', err);
        toast.error('Erreur lors du chargement des villes');
      } finally {
        setIsLoading(false);
      }
    };

    loadCities();
  }, [countryCode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (countryCode) params.append('country', countryCode);
    if (cityName) params.append('city', cityName);
    navigate(`/explorer?${params.toString()}`);
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountryCode = e.target.value;
    setCountryCode(newCountryCode);
    setCityName(''); // Réinitialiser la ville quand le pays change
  };

  const popularSearches = [
    { id: 'plumbing', label: 'Plomberie' },
    { id: 'electricity', label: 'Électricité' },
    { id: 'homecare', label: 'Services à domicile' }
  ];

  return (
    <section className="relative min-h-[600px] flex items-center">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/90 to-teal-600/90 mix-blend-multiply" />
        <img
          src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Professional services marketplace"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 pt-32 pb-20">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg">
            Une plateforme de services qui connecte des millions de prestataires qualifiés, prêts à répondre à vos besoins.
          </h1>
          <p className="text-xl text-white opacity-90 mb-8 drop-shadow-md">
            Trouvez des experts locaux pour tous vos besoins : plomberie, électricité, services à domicile et plus encore
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <select
                value={countryCode}
                onChange={handleCountryChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                disabled={isLoading}
              >
                <option value="">Sélectionnez un pays</option>
                {countriesList.map((country) => (
                  <option key={country.id} value={country.code}>
                    {country.nom}
                  </option>
                ))}
              </select>

              <select
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                disabled={!countryCode || isLoading}
              >
                <option value="">Sélectionnez une ville</option>
                {citiesList.map((city) => (
                  <option key={city.id} value={city.nom.toLowerCase()}>
                    {city.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quel service recherchez-vous ?"
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
                {popularSearches.map((search) => (
                  <button
                    key={search.id}
                    type="button"
                    onClick={() => setSearchQuery(search.label)}
                    className="px-3 py-1 bg-gray-100 hover:bg-teal-50 text-gray-700 hover:text-teal-600 rounded-full text-sm"
                  >
                    {search.label}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SearchHero;