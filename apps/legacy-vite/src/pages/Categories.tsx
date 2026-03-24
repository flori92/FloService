import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { categories } from '../data/providers';

interface ServiceCardProps {
  title: string;
  price: string;
  to: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ title, price, to }) => (
  <Link 
    to={to}
    className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
  >
    <h3 className="text-base font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-600">À partir de {price}</p>
  </Link>
);

const Categories: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Toutes les catégories
        </h1>

        {categories.map((category) => (
          <div key={category.id} className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                {category.title}
                <span className="ml-2 text-sm text-gray-500">
                  ({category.servicesCount} services)
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.subcategories.map((subcategory) => (
                <ServiceCard
                  key={subcategory.id}
                  title={subcategory.name}
                  price="2000 FCFA"
                  to={`/category/${category.id}?subcategory=${subcategory.id}`}
                />
              ))}
            </div>
          </div>
        ))}
      </main>
      <Footer />
    </div>
  );
};

export default Categories;