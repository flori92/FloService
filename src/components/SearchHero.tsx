import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SearchHero: React.FC = () => {
  const navigate = useNavigate();
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (country) params.append('country', country);
    if (city) params.append('city', city);
    navigate(`/explorer?${params.toString()}`);
  };

  const popularSearches = [
    { id: 'plumbing', label: 'Plomberie' },
    { id: 'electricity', label: 'Électricité' },
    { id: 'homecare', label: 'Services à domicile' }
  ];

  const countries = [
    { code: 'BJ', name: 'Bénin' },
    { code: 'TG', name: 'Togo' },
    { code: 'CI', name: "Côte d'Ivoire" }
  ];

  const cities = {
    BJ: ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi', 'Bohicon'],
    TG: ['Lomé', 'Sokodé', 'Kara', 'Kpalimé', 'Atakpamé'],
    CI: ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Korhogo', 'San-Pédro']
  };

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
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setCity('');
                }}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">Sélectionnez un pays</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                disabled={!country}
              >
                <option value="">Sélectionnez une ville</option>
                {country && cities[country as keyof typeof cities].map((city) => (
                  <option key={city} value={city.toLowerCase()}>
                    {city}
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