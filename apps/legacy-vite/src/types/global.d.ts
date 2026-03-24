/**
 * Déclarations de types globales pour les composants d'amélioration UX
 */

// Déclaration pour les variables d'environnement globales
interface Window {
  ENV?: {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    [key: string]: string | undefined;
  };
}

// Déclaration pour process.env en environnement non-Node
declare namespace NodeJS {
  interface ProcessEnv {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    REACT_APP_SUPABASE_URL?: string;
    REACT_APP_SUPABASE_ANON_KEY?: string;
    [key: string]: string | undefined;
  }
}

// Déclaration pour les fichiers JSX
declare module '*.jsx' {
  import React from 'react';
  const Component: React.ComponentType<any>;
  export default Component;
}

// Déclaration pour le client Supabase amélioré
declare module './lib/supabaseClient' {
  import { SupabaseClient } from '@supabase/supabase-js';
  
  interface EnhancedSupabaseClient extends SupabaseClient {
    // Méthodes de vérification

    isProvider: (userId: string) => Promise<boolean>;
    
    // Méthodes de récupération de données
    getUserProfile: (userId: string) => Promise<any>;
    getMessages: (conversationId: string, limit?: number, offset?: number) => Promise<any>;
    getMessageCount: (conversationId: string) => Promise<number>;
    getConversations: (userId: string, limit?: number, offset?: number) => Promise<any>;
    
    // Méthodes d'opérations
    getOrCreateConversation: (userId1: string, userId2: string) => Promise<any>;
    sendMessage: (conversationId: string, senderId: string, recipientId: string, content: string) => Promise<any>;
    markMessagesAsRead: (conversationId: string, userId: string) => Promise<any>;
    
    // Méthodes de sécurité
    safeOperation: <T>(tableName: string, operation: () => Promise<T>, fallback: () => T) => Promise<T>;
  }
  
  const enhancedSupabase: EnhancedSupabaseClient;
  export default enhancedSupabase;
}

// Déclaration pour le composant Notifier
declare module './components/ui/Notifier' {
  import { ReactNode } from 'react';
  
  export interface NotifierContextType {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    clear: () => void;
  }
  
  export interface NotifierProviderProps {
    children: ReactNode;
  }
  
  export function NotifierProvider(props: NotifierProviderProps): JSX.Element;
  export function useNotifier(): NotifierContextType;
}

// Déclaration pour le composant LoadingSpinner
declare module './components/ui/LoadingSpinner' {
  export enum SPINNER_TYPES {
    CIRCLE = 'circle',
    DOTS = 'dots',
    PULSE = 'pulse'
  }
  
  export enum SPINNER_SIZES {
    SM = 'sm',
    MD = 'md',
    LG = 'lg',
    XL = 'xl'
  }
  
  export interface LoadingSpinnerProps {
    type?: keyof typeof SPINNER_TYPES;
    size?: keyof typeof SPINNER_SIZES;
    color?: string;
    label?: string;
    fullScreen?: boolean;
    className?: string;
  }
  
  export default function LoadingSpinner(props: LoadingSpinnerProps): JSX.Element;
}

// Déclaration pour le composant EmptyState
declare module './components/ui/EmptyState' {
  import { ReactNode } from 'react';
  
  export interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
  }
  
  export interface ConnectionErrorProps {
    onRetry?: () => void;
    className?: string;
  }
  
  export default function EmptyState(props: EmptyStateProps): JSX.Element;
  export function ConnectionError(props: ConnectionErrorProps): JSX.Element;
  export function EmptyMessages(props: any): JSX.Element;
  export function EmptySearch(props: any): JSX.Element;
  export function EmptyServices(props: any): JSX.Element;
}
