import { SupabaseClient } from '@supabase/supabase-js';

export interface EnhancedSupabaseClient extends SupabaseClient {
  // Propriétés héritées de SupabaseClient mais qui doivent être explicitement déclarées
  from: SupabaseClient['from'];
  rpc: SupabaseClient['rpc'];
  auth: SupabaseClient['auth'];
  storage: SupabaseClient['storage'];
  functions: SupabaseClient['functions'];
  channel: SupabaseClient['channel'];
  removeChannel: SupabaseClient['removeChannel'];
  
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

declare const enhancedSupabase: EnhancedSupabaseClient;

export default enhancedSupabase;
