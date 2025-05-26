import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { serviceProviders } from '../data/providers';

const FeaturedFreelancers: React.FC = () => {
  // Filter providers with rating >= 4
  const topProviders = serviceProviders
    .filter(provider => provider.rating >= 4)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 4);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Prestataires en vedette
          </h2>
          <Link
            to="/providers"
            className="text-teal-600 hover:text-teal-700 font-medium flex items-center"
          >
            Voir tous les prestataires →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {topProviders.map((provider) => (
            <div key={provider.id} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center text-center">
                <img
                  src={provider.avatar}
                  alt={provider.name}
                  className="w-24 h-24 rounded-full object-cover mb-4"
                />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {provider.name}
                </h3>
                <p className="text-gray-600 mb-2">{provider.profession}</p>
                <div className="flex items-center mb-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="ml-1 text-gray-700">
                    {provider.rating} ({provider.reviews})
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {provider.city} • Membre depuis {provider.memberSince}
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
      </div>
    </section>
  );
};

export default FeaturedFreelancers;