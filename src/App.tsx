import { useEffect, useState, Suspense, lazy } from 'react';
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

// Lazy load all page components
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Categories = lazy(() => import('./pages/Categories'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ProviderProfile = lazy(() => import('./pages/ProviderProfile'));
const ProviderRegistration = lazy(() => import('./pages/ProviderRegistration'));
const AllProviders = lazy(() => import('./pages/AllProviders'));
const Explorer = lazy(() => import('./pages/Explorer'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const Messages = lazy(() => import('./pages/Messages'));
const Blog = lazy(() => import('./pages/Blog'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
        // Vérification explicite du client Supabase
        if (!enhancedSupabase || !enhancedSupabase.from || typeof enhancedSupabase.from !== 'function') {
          setInitError(new Error('Client Supabase non initialisé ou en mode fallback (mock). Vérifiez vos variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY côté Netlify et local.'));
          console.error('[FloService] Client Supabase non initialisé ou mock. Variables actuelles :', {
            VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
            VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
          });
          return;
        }
        // Vérification de la connexion à Supabase
        console.log('Tentative de connexion à Supabase...');
        try {
          const query = enhancedSupabase.from('profiles').select('id');
          const result = 'limit' in query 
            ? await query.limit(1)
            : await query;
          if ('error' in result && result.error) {
            setInitError(new Error('Erreur lors de la connexion à Supabase : ' + (result.error.message || 'Erreur inconnue')));
            console.warn('Erreur lors de la vérification de la connexion à Supabase:', {
              message: result.error.message,
              code: result.error.code,
              details: result.error.details,
              hint: result.error.hint
            });
            return;
          } else {
            console.log('✅ Connexion à Supabase établie avec succès');
          }
        } catch (err) {
          const error = err as Error & { code?: string; details?: string; hint?: string };
          setInitError(new Error('Erreur lors de la connexion à Supabase (exception) : ' + (error.message || 'Erreur inconnue')));
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

  // Préparation des informations de debug
  const debugInfo = {
    isOnline,
    isAppReady,
    initError,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    // Ajoutez ici d'autres états ou infos utiles si besoin
  };

  // Afficher un écran de chargement pendant l'initialisation
  if (!isAppReady) {
    return (
      <>
        <GlobalLoadingSpinner />
        {/* Debug infos affichées en bas de page */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, background: '#eee', color: '#333', fontSize: 12, padding: 4, zIndex: 9999 }}>
          <strong>Debug:</strong> {JSON.stringify({ isOnline, isAppReady, initError: !!initError, debugInfo }, null, 2)}
        </div>
      </>
    );
  }

  // Afficher une erreur si l'initialisation a échoué
  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-50 text-red-700">
        <h1 className="text-2xl font-bold mb-2">Erreur d'initialisation</h1>
        <p className="mb-4">{initError.message}</p>
        <pre className="bg-red-100 p-2 rounded text-xs max-w-xl overflow-x-auto">{initError.stack}</pre>
        <details className="mt-4 max-w-xl">
          <summary className="cursor-pointer">Debug avancé</summary>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
        </details>
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