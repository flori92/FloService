import React from 'react';
import { Link } from 'react-router-dom';
import {
  Hammer,
  Paintbrush,
  Heart,
  Scissors
} from 'lucide-react';
import { categories } from '../data/providers';

const ServiceCategories: React.FC = () => {
  const categoryIcons = {
    batiment: <Hammer className="w-6 h-6" />,
    decoration: <Paintbrush className="w-6 h-6" />,
    beaute: <Heart className="w-6 h-6" />,
    artisanat: <Scissors className="w-6 h-6" />
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Parcourir par catégorie
          </h2>
          <Link
            to="/categories"
            className="text-teal-600 hover:text-teal-700 font-medium flex items-center"
          >
            Voir toutes les catégories →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.id}`}
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all hover:translate-y-[-2px]"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-teal-50 p-3 rounded-lg">
                  {categoryIcons[category.id as keyof typeof categoryIcons]}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {category.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {category.servicesCount} services
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceCategories;