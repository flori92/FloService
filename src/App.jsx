/**
 * Composant principal de l'application FloService
 * Intègre les améliorations d'expérience utilisateur et la gestion d'erreurs
 */

import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NotifierProvider } from './components/ui/Notifier';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { ConnectionError } from './components/ui/EmptyState';
import { supabase as enhancedSupabase } from './lib/supabase-secure';

// Import des pages avec chargement différé pour optimiser les performances
const HomePage = React.lazy(() => import('./pages/Home'));
const LoginPage = React.lazy(() => import('./pages/Login'));
const RegisterPage = React.lazy(() => import('./pages/Register'));
const ProfilePage = React.lazy(() => import('./pages/Profile'));
const MessagesPage = React.lazy(() => import('./pages/MessagesPage'));
const ConversationsPage = React.lazy(() => import('./pages/Messages')); // Messages.tsx pour les conversations
const ProvidersPage = React.lazy(() => import('./pages/AllProviders'));
const ServicesPage = React.lazy(() => import('./pages/Categories')); // Categories pour les services
const NotFoundPage = React.lazy(() => import('./pages/NotFound'));

// Composant de chargement global
const GlobalLoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <LoadingSpinner 
      size="lg" 
      label="Chargement..." 
    />
  </div>
);

// Composant pour protéger les routes nécessitant une authentification
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const Header = React.lazy(() => import('./components/Header'));

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await enhancedSupabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <GlobalLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <Header />
      <div className="pt-20">
        {children}
      </div>
    </>
  );
};

// Composant principal de l'application
const App = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAppReady, setIsAppReady] = useState(false);

  // Vérifier la connexion internet
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialiser l'application
  useEffect(() => {
    const initApp = async () => {
      try {
        // Considérer l'application comme prête immédiatement
        setIsAppReady(true);
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'application:', error);
        setIsAppReady(true);
      }
    };

    initApp();
  }, []);

  // Afficher un écran de chargement pendant l'initialisation
  if (!isAppReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingSpinner 
          size="lg" 
          label="Initialisation de l'application..." 
        />
      </div>
    );
  }

  // Afficher une erreur si l'utilisateur est hors ligne
  if (!isOnline) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <ConnectionError 
          onRetry={() => window.location.reload()} 
        />
      </div>
    );
  }

  return (
    <NotifierProvider>
      <Router>
        <Suspense fallback={<GlobalLoadingSpinner />}>
          <Routes>
            {/* Routes publiques */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Routes protégées */}
            <Route path="/" element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/messages/:conversationId" element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            } />
            <Route path="/conversations" element={
              <ProtectedRoute>
                <ConversationsPage />
              </ProtectedRoute>
            } />
            <Route path="/providers" element={
              <ProtectedRoute>
                <ProvidersPage />
              </ProtectedRoute>
            } />
            <Route path="/services" element={
              <ProtectedRoute>
                <ServicesPage />
              </ProtectedRoute>
            } />
            
            {/* Route 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Router>
    </NotifierProvider>
  );
};

export default App;
