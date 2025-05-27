import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  message_type?: 'text' | 'image' | 'file' | 'audio' | 'video';
  media_url?: string;
  media_metadata?: {
    name?: string;
    size?: number;
    type?: string;
    duration?: number;
    width?: number;
    height?: number;
  };
}

export interface Conversation {
  id: string;
  client_id: string;
  provider_id: string;
  provider_external_id?: string;
  client_external_id?: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_time?: string;
  other_user?: {
    id: string;
    name: string;
    avatar?: string;
    is_online?: boolean;
  };
  unread_count?: number;
}

class MessagingService {
  /**
   * Crée ou récupère une conversation existante
   */
  async getOrCreateConversation(providerExternalId: string): Promise<{
    data: Conversation | null;
    error: Error | null;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Appel à la fonction RPC pour créer ou récupérer une conversation
      const { data: conversationId, error: rpcError } = await supabase.rpc(
        'get_or_create_conversation',
        {
          p_client_id: user.id,
          p_provider_external_id: providerExternalId
        }
      );

      if (rpcError) throw rpcError;
      if (!conversationId) throw new Error('Échec de la création de la conversation');

      // Récupérer les détails complets de la conversation
      return await this.getConversation(conversationId);
    } catch (error) {
      console.error('Erreur lors de la création/récupération de la conversation:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Récupère les détails d'une conversation
   */
  async getConversation(conversationId: string): Promise<{
    data: Conversation | null;
    error: Error | null;
  }> {
    try {
      // D'abord récupérer les données de base de la conversation pour déterminer son type
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;
      if (!convData) throw new Error('Conversation non trouvée');

      // Récupérer les détails du client (toujours présent)
      const { data: clientData, error: clientError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, is_online')
        .eq('id', convData.client_id)
        .single();

      if (clientError) {
        console.warn('Erreur lors de la récupération du profil client:', clientError);
      }

      // Initialiser les données du prestataire
      let providerData = null;

      // Si provider_id existe, récupérer les informations du prestataire depuis profiles
      if (convData.provider_id) {
        const { data: provData, error: provError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, is_online')
          .eq('id', convData.provider_id)
          .single();

        if (!provError) {
          providerData = provData;
        } else {
          console.warn('Erreur lors de la récupération du profil prestataire:', provError);
        }
      }

      // Déterminer quel utilisateur est l'autre utilisateur dans la conversation
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      const isClient = currentUserId === convData.client_id;
      
      // Construire les informations de l'autre utilisateur
      let otherUser = isClient ? providerData : clientData;
      
      // Si c'est un prestataire externe (provider_external_id existe mais pas provider_id)
      if (isClient && !providerData && convData.provider_external_id) {
        // On pourrait éventuellement chercher des informations sur le prestataire externe dans une autre table
        otherUser = {
          id: convData.provider_external_id,
          full_name: `Prestataire ${convData.provider_external_id}`,
          avatar_url: null,
          is_online: false
        };
      }

      const conversation: Conversation = {
        id: convData.id,
        client_id: convData.client_id,
        provider_id: convData.provider_id,
        provider_external_id: convData.provider_external_id,
        client_external_id: convData.client_external_id,
        created_at: convData.created_at,
        updated_at: convData.updated_at,
        last_message: convData.last_message,
        last_message_time: convData.last_message_time,
        other_user: otherUser ? {
          id: otherUser.id || '',
          name: otherUser.full_name || 'Utilisateur inconnu',
          avatar: otherUser.avatar_url,
          is_online: otherUser.is_online
        } : {
          id: '',
          name: 'Utilisateur inconnu',
          avatar: null,
          is_online: false
        }
      };

      return { data: conversation, error: null };
    } catch (error) {
      console.error('Erreur lors de la récupération de la conversation:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Envoie un message dans une conversation
   */
  async sendMessage(
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'audio' | 'video' = 'text',
    file?: File
  ): Promise<{ data: Message | null; error: Error | null }> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Utilisateur non connecté');

      let mediaUrl: string | undefined;
      let mediaMetadata: Record<string, any> = {};

      // Gérer l'upload du fichier si présent
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
        const filePath = `message_attachments/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        mediaUrl = uploadData.path;
        mediaMetadata = {
          name: file.name,
          size: file.size,
          type: file.type,
        };

        // Extraire les métadonnées supplémentaires selon le type de fichier
        if (file.type.startsWith('image/')) {
          const dimensions = await this.getImageDimensions(file);
          mediaMetadata = { ...mediaMetadata, ...dimensions };
        } else if (file.type.startsWith('audio/')) {
          const duration = await this.getAudioDuration(file);
          mediaMetadata = { ...mediaMetadata, duration };
        } else if (file.type.startsWith('video/')) {
          const videoData = await this.getVideoMetadata(file);
          mediaMetadata = { ...mediaMetadata, ...videoData };
        }
      }

      // Envoyer le message via la fonction RPC
      const { data: messageData, error: messageError } = await supabase.rpc('send_message', {
        p_conversation_id: conversationId,
        p_sender_id: user.id,
        p_content: content,
        p_message_type: messageType,
        p_media_url: mediaUrl,
        p_media_metadata: Object.keys(mediaMetadata).length > 0 ? mediaMetadata : null
      });

      if (messageError) throw messageError;

      return { data: messageData as Message, error: null };
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Récupère les messages d'une conversation
   */
  async getMessages(
    conversationId: string,
    page = 0,
    pageSize = 20
  ): Promise<{ data: Message[]; error: Error | null }> {
    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Inverser pour avoir les plus anciens en premier
      return { data: (data || []).reverse(), error: null };
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      return { data: [], error: error as Error };
    }
  }

  /**
   * S'abonne aux nouveaux messages d'une conversation
   */
  subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void
  ): () => void {
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  // Méthodes utilitaires pour les métadonnées
  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  private getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.src = URL.createObjectURL(file);
    });
  }

  private getVideoMetadata(
    file: File
  ): Promise<{ width: number; height: number; duration: number }> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration
        });
      };
      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Marque un message comme lu
   */
  async markMessageAsRead(messageId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { error } = await supabase.rpc('mark_message_as_read', {
        p_message_id: messageId,
        p_user_id: user.id
      });

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('Erreur lors du marquage du message comme lu:', error);
      return { success: false, error: error as Error };
    }
  }
}

export const messagingService = new MessagingService();
