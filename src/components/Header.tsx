import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MessageSquare, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { FormattedMessage } from 'react-intl';
import { LanguageSwitch } from './LanguageSwitch';
import { NotificationBell } from './NotificationBell';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuthStore();
  const location = useLocation();

  // Force header to be visible on certain pages
  const forceVisible = ['/login', '/register', '/categories', '/explorer'].includes(location.pathname);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || forceVisible
          ? 'bg-white/95 backdrop-blur-sm shadow-lg' 
          : 'bg-transparent'
      }`}
    >
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <span className={`text-2xl font-bold ${isScrolled || forceVisible ? 'text-teal-600' : 'text-teal-500'}`}>Flo</span>
            <span className={`text-2xl font-bold ${isScrolled || forceVisible ? 'text-gray-900' : 'text-white'}`}>Service</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/explorer" 
              className={`text-base font-medium transition-colors duration-200 ${
                isScrolled || forceVisible ? 'text-gray-700 hover:text-teal-600' : 'text-white/90 hover:text-white'
              }`}
            >
              <FormattedMessage id="navigation.explore" />
            </Link>
            <Link 
              to="/categories" 
              className={`text-base font-medium transition-colors duration-200 ${
                isScrolled || forceVisible ? 'text-gray-700 hover:text-teal-600' : 'text-white/90 hover:text-white'
              }`}
            >
              <FormattedMessage id="navigation.categories" />
            </Link>
            <Link 
              to="/how-it-works" 
              className={`text-base font-medium transition-colors duration-200 ${
                isScrolled || forceVisible ? 'text-gray-700 hover:text-teal-600' : 'text-white/90 hover:text-white'
              }`}
            >
              <FormattedMessage id="navigation.howItWorks" />
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <LanguageSwitch />
            
            {user ? (
              <div className="flex items-center space-x-4">
                <NotificationBell />
                <Link to="/messages" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <MessageSquare className="h-6 w-6" />
                </Link>
                <Link to="/profile" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <User className="h-6 w-6" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    isScrolled || forceVisible
                      ? 'text-gray-700 hover:text-teal-600' 
                      : 'text-white/90 hover:text-white'
                  }`}
                >
                  <FormattedMessage id="common.login" />
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  <FormattedMessage id="common.register" />
                </Link>
              </div>
            )}
          </div>

          <button
            className={`md:hidden p-2 rounded-lg transition-colors duration-200 ${
              isScrolled || forceVisible ? 'text-gray-700' : 'text-white'
            }`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 bg-white rounded-lg shadow-lg">
            <nav className="flex flex-col space-y-4 p-4">
              <Link to="/explorer" className="text-gray-700 hover:text-teal-600">
                <FormattedMessage id="navigation.explore" />
              </Link>
              <Link to="/categories" className="text-gray-700 hover:text-teal-600">
                <FormattedMessage id="navigation.categories" />
              </Link>
              <Link to="/how-it-works" className="text-gray-700 hover:text-teal-600">
                <FormattedMessage id="navigation.howItWorks" />
              </Link>
              <div className="pt-2 border-t border-gray-200">
                <LanguageSwitch />
              </div>
              {!user && (
                <div className="flex flex-col space-y-2 pt-2">
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-teal-600"
                  >
                    <FormattedMessage id="common.login" />
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-center"
                  >
                    <FormattedMessage id="common.register" />
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;