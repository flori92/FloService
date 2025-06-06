import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MessageSquare, User, LayoutDashboard, LogOut, ChevronDown, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useChat } from '../contexts/ChatContext';
import { FormattedMessage } from 'react-intl';
import { LanguageSwitch } from './LanguageSwitch';
import { NotificationBell } from './NotificationBell';
import { supabase } from '../lib/supabase';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isProvider, setIsProvider] = useState(false);
  const { user } = useAuthStore();
  const { hasUnreadMessages, unreadCount } = useChat();
  const location = useLocation();

  // Force header to be visible on certain pages
  const forceVisible = [
    '/login', 
    '/register', 
    '/categories', 
    '/explorer', 
    '/provider-registration',
    '/how-it-works',
    '/profile',
    '/messages',
    '/provider-dashboard'
  ].includes(location.pathname) || 
    location.pathname.startsWith('/provider-registration') || 
    location.pathname.startsWith('/provider-dashboard') ||
    location.pathname.startsWith('/provider/'); // Ajouter les pages de profil prestataire
    
  // Vérifier si l'utilisateur est un prestataire
  useEffect(() => {
    if (user) {
      const checkProviderStatus = async () => {
        try {
          // Utiliser la fonction RPC sécurisée get_my_provider_status
          const { data: isProviderStatus, error: rpcError } = await supabase.rpc('get_my_provider_status');
          
          if (!rpcError && isProviderStatus === true) {
            setIsProvider(true);
            return;
          }
          
          if (rpcError) {
            console.warn('Erreur lors de l\'appel RPC get_my_provider_status:', rpcError);
            
            // Fallback: utiliser la méthode RPC is_provider
            const { data: rpcCheck, error: rpcError2 } = await supabase.rpc('is_provider', { user_id: user.id });
            
            if (!rpcError2 && rpcCheck === true) {
              setIsProvider(true);
              return;
            }
            
            if (rpcError2) {
              console.warn('Erreur lors de l\'appel RPC is_provider:', rpcError2);
              
              // Dernier recours: requête directe (risque d'erreur 406)
              console.warn('Utilisation de la méthode de dernier recours (requête directe sur profiles)');
              const { data, error } = await supabase
                .from('profiles')
                .select('is_provider')
                .eq('id', user.id)
                .single();
                
              if (!error && data && 'is_provider' in data && data.is_provider === true) {
                setIsProvider(true);
              } else if (error) {
                console.error('Erreur lors de la vérification directe du statut prestataire:', error);
              }
            }
          }
        } catch (err) {
          console.error('Exception lors de la vérification du statut prestataire:', err);
        }
      };
      
      checkProviderStatus();
    }
  }, [user, location.pathname]);

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
            <span className={`text-2xl font-bold ${isScrolled || forceVisible ? 'text-teal-600' : 'text-teal-500 drop-shadow-md'}`}>Flo</span>
            <span className={`text-2xl font-bold ${isScrolled || forceVisible ? 'text-gray-900' : 'text-white drop-shadow-md'}`}>Service</span>
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
                
                {/* Menu utilisateur avec dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-1 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <User className="h-6 w-6" />
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <Link 
                        to="/profile" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Mon profil
                      </Link>
                      
                      <Link 
                        to="/messages" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <div className="relative">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {hasUnreadMessages && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </div>
                        Messagerie
                      </Link>
                      
                      {isProvider && (
                        <Link 
                          to="/provider-dashboard" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Espace prestataire
                        </Link>
                      )}
                      
                      <button 
                        onClick={async () => {
                          await supabase.auth.signOut();
                          window.location.href = '/';
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 border-t border-gray-100 flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Déconnexion
                      </button>
                    </div>
                  )}
                </div>
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