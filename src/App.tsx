import { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase as enhancedSupabase } from './lib/supabase-secure';
import { useAuthStore } from './store/authStore';
import { TranslationProvider } from './providers/TranslationProvider';
import { AuthGuard } from './components/AuthGuard';
import { ChatProvider } from './contexts/ChatContext';
import ChatContainer from './components/chat/ChatContainer';
import ChatFloatingButton from './components/chat/ChatFloatingButton';
import MigrationChecker from './components/MigrationChecker';

// Nouveaux composants d'amélioration UX
import { NotifierProvider } from './components/ui/Notifier';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { ConnectionError } from './components/ui/EmptyState';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Categories from './pages/Categories';
import CategoryPage from './pages/CategoryPage';
import ProviderProfile from './pages/ProviderProfile';
import ProviderRegistration from './pages/ProviderRegistration';
import AllProviders from './pages/AllProviders';
import Explorer from './pages/Explorer';
import HowItWorks from './pages/HowItWorks';
import Messages from './pages/Messages';
import Blog from './pages/Blog';
import HelpCenter from './pages/HelpCenter';
import NotFound from './pages/NotFound';

// Composant de chargement global
const GlobalLoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <LoadingSpinner 
      size="LG" 
      label="Chargement..." 
    />
  </div>
);

function App() {
  const setUser = useAuthStore((state) => state.setUser);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAppReady, setIsAppReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

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
        // Vérification que le client Supabase est correctement initialisé
        if (!enhancedSupabase || !enhancedSupabase.from) {
          throw new Error('Client Supabase non initialisé correctement. Vérifiez les variables d\'environnement.');
        }
        
        // Vérification de la connexion à Supabase avec gestion des erreurs améliorée
        console.log('Tentative de connexion à Supabase...');
        
        try {
          // Vérification simple de la connexion sans dépendre de méthodes spécifiques
          const query = enhancedSupabase.from('profiles').select('id');
          
          // Vérifier si la méthode limit est disponible avant de l'utiliser
          const result = 'limit' in query 
            ? await query.limit(1)
            : await query;
            
          if ('error' in result && result.error) {
            console.warn('Erreur lors de la vérification de la connexion à Supabase:', {
              message: result.error.message,
              code: result.error.code,
              details: result.error.details,
              hint: result.error.hint
            });
          } else {
            console.log('✅ Connexion à Supabase établie avec succès');
          }
        } catch (err) {
          // Gestion des erreurs avec typage sûr
          const error = err as Error & { code?: string; details?: string; hint?: string };
          console.warn('Erreur lors de la vérification de la connexion à Supabase:', {
            message: error.message || 'Erreur inconnue',
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          // On continue malgré l'erreur pour permettre l'affichage des notifications
        }
        
        console.log('✅ Vérification de la connexion à Supabase terminée');
        
        setIsAppReady(true);
      } catch (error) {
        // Capture et affichage détaillé de l'erreur
        const errorDetails = {
          message: error instanceof Error ? error.message : 'Erreur inconnue',
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined,
          toString: error?.toString ? error.toString() : 'Objet d\'erreur invalide'
        };
        
        console.error('Erreur lors de l\'initialisation de l\'application:', errorDetails);
        setInitError(error instanceof Error ? error : new Error('Erreur inconnue: ' + JSON.stringify(errorDetails)));
        // Même en cas d'erreur, on considère l'app comme prête pour afficher l'erreur
        setIsAppReady(true);
      }
    };

    initApp();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = enhancedSupabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  // Afficher un écran de chargement pendant l'initialisation
  if (!isAppReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingSpinner 
          size="LG" 
          label="Initialisation de l'application..." 
        />
      </div>
    );
  }

  // Afficher une erreur si l'initialisation a échoué
  if (initError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Erreur d'initialisation</h2>
          <p className="text-gray-700 mb-4">{initError.message}</p>
          <p className="text-gray-600 mb-6">Veuillez vérifier votre connexion internet et réessayer.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Réessayer
          </button>
        </div>
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
      <TranslationProvider>
        <ChatProvider>
          <Router>
            <div className="app-container">
              {/* Vérification des migrations Supabase */}
              <div className="container mx-auto px-4 mt-4">
                <MigrationChecker />
              </div>
              
              <Suspense fallback={<GlobalLoadingSpinner />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/category/:category" element={<CategoryPage />} />
                  <Route path="/provider/:id" element={<ProviderProfile />} />
                  <Route path="/providers" element={<AllProviders />} />
                  <Route path="/explorer" element={<Explorer />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected routes */}
                  <Route path="/dashboard" element={
                    <AuthGuard>
                      <Dashboard />
                    </AuthGuard>
                  } />
                  <Route path="/profile" element={
                    <AuthGuard>
                      <Profile />
                    </AuthGuard>
                  } />
                  <Route path="/messages" element={
                    <AuthGuard>
                      <Messages />
                    </AuthGuard>
                  } />
                  <Route path="/provider-registration" element={
                    <AuthGuard>
                      <ProviderRegistration />
                    </AuthGuard>
                  } />

                  {/* 404 page */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              {/* Système de chat */}
              <ChatContainer />
              <ChatFloatingButton />
              {/* Le Toaster est remplacé par le NotifierProvider */}
            </div>
          </Router>
        </ChatProvider>
      </TranslationProvider>
    </NotifierProvider>
  );
}

export default App;