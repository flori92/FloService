import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase-secure';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

/**
 * Page de callback pour OAuth (Google, etc.)
 * Gère la redirection après authentification sociale
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('[AuthCallback] Traitement du callback OAuth');
        
        // Récupérer la session après le callback OAuth
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthCallback] Erreur lors de la récupération de la session:', error);
          toast.error('Erreur lors de l\'authentification');
          navigate('/login');
          return;
        }

        if (session?.user) {
          console.log('[AuthCallback] Utilisateur authentifié:', session.user.id);
          
          // Mettre à jour le store avec l'utilisateur connecté
          setUser(session.user);
          
          // Vérifier si un profil existe déjà
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          // Si pas de profil, créer un profil de base
          if (profileError && profileError.code === 'PGRST116') {
            console.log('[AuthCallback] Création du profil pour nouvel utilisateur Google');
            
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                email: session.user.email,
                nom: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                full_name: session.user.user_metadata?.full_name,
                avatar_url: session.user.user_metadata?.avatar_url,
                is_provider: false,
                is_admin: false
              });
            
            if (insertError) {
              console.error('[AuthCallback] Erreur lors de la création du profil:', insertError);
              // Ne pas bloquer l'authentification si la création du profil échoue
            }
          }
          
          toast.success('Connexion réussie !');
          navigate('/');
        } else {
          console.warn('[AuthCallback] Aucune session trouvée après callback');
          toast.error('Échec de l\'authentification');
          navigate('/login');
        }
      } catch (error) {
        console.error('[AuthCallback] Erreur inattendue:', error);
        toast.error('Une erreur est survenue');
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Authentification en cours...</p>
      </div>
    </div>
  );
}
