import { create } from 'zustand';
import backendAdapter from '../lib/backendAdapter';

// Type utilisateur générique pour être compatible avec Supabase et Appwrite
type User = {
  id?: string;
  $id?: string; // Format Appwrite
  email?: string;
  [key: string]: any;
};

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  signIn: async (email, password) => {
    try {
      await backendAdapter.signIn(email, password);
      // Après connexion, récupérer l'utilisateur
      const user = await backendAdapter.getCurrentUser();
      set({ user, loading: false });
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  },
  signUp: async (email, password) => {
    try {
      const name = email.split('@')[0]; // Nom par défaut basé sur l'email
      await backendAdapter.signUp(email, password, name);
      // Après inscription, récupérer l'utilisateur
      const user = await backendAdapter.getCurrentUser();
      set({ user, loading: false });
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      throw error;
    }
  },
  signOut: async () => {
    try {
      await backendAdapter.signOut();
      set({ user: null });
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      throw error;
    }
  },
}));