import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { categories } from '../data/providers';

const Footer: React.FC = () => {
  const socialLinks = [
    { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
    { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
    { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
    { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' }
  ];

  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div>
            <Link to="/" className="flex items-center mb-4">
              <span className="text-2xl font-bold text-teal-400">Flo</span>
              <span className="text-2xl font-bold text-white">Service</span>
            </Link>
            <p className="text-gray-400 mb-6">
              La plateforme de services qui connecte les professionnels qualifiés avec les clients en Afrique de l'Ouest.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-teal-600 transition-colors duration-200"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5 text-white" />
                </a>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Catégories</h3>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/category/${category.id}`}
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {category.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Liens Rapides</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/how-it-works" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Comment ça marche
                </Link>
              </li>
              <li>
                <Link to="/provider-registration" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Devenir prestataire
                </Link>
              </li>
              <li>
                <Link to="/explorer" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Explorer les services
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Centre d'aide
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-teal-400 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-400">
                  Abomey-Calavi, Bénin<br />
                  Carré Agori
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 text-teal-400 mr-3 flex-shrink-0" />
                <a href="tel:+22967000000" className="text-gray-400 hover:text-white">
                  +229 67 00 00 00
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 text-teal-400 mr-3 flex-shrink-0" />
                <a href="mailto:contact@floservice.com" className="text-gray-400 hover:text-white">
                  contact@floservice.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} FloService. Tous droits réservés.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white text-sm">
                Politique de confidentialité
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm">
                Conditions d'utilisation
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm">
                Mentions légales
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;