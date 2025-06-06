import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { ServiceProvider } from '../types';

interface ProviderCardProps {
  provider: ServiceProvider;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ provider }) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all">
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
  );
};

export default ProviderCard;