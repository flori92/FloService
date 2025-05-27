import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { TranslationProvider } from './providers/TranslationProvider';
import { AuthGuard } from './components/AuthGuard';
import { ChatProvider } from './contexts/ChatContext';
import ChatContainer from './components/chat/ChatContainer';
import ChatFloatingButton from './components/chat/ChatFloatingButton';

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

function App() {
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  return (
    <TranslationProvider>
      <ChatProvider>
        <Router>
          <div className="app-container">
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
        <Toaster position="top-right" />
            {/* Système de chat */}
            <ChatContainer />
            <ChatFloatingButton />
          </div>
        </Router>
      </ChatProvider>
    </TranslationProvider>
  );
}

export default App;