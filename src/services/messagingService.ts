import backendAdapter from '../lib/backendAdapter';
import { v4 as uuidv4 } from 'uuid';
import { COLLECTIONS } from '../lib/appwriteClient';

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
      const user = await backendAdapter.getCurrentUser();
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Vérifier si une conversation existe déjà
      const userId = user.id || user.$id;
      const conversations = await backendAdapter.query(COLLECTIONS.CONVERSATIONS, {
        filters: [
          { field: 'client_id', operator: '=', value: userId },
          { field: 'provider_external_id', operator: '=', value: providerExternalId }
        ]
      });

      let conversationId;
      
      if (conversations && conversations.length > 0) {
        // Conversation existante trouvée
        conversationId = conversations[0].id || conversations[0].$id;
      } else {
        // Créer une nouvelle conversation
        const newConversation = await backendAdapter.create(COLLECTIONS.CONVERSATIONS, {
          client_id: userId,
          provider_external_id: providerExternalId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        conversationId = newConversation.id || newConversation.$id;
      }

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
      // D'abord récupérer les données de base de la conversation
      const convData = await backendAdapter.getById(COLLECTIONS.CONVERSATIONS, conversationId);

      if (!convData) {
        throw new Error('Conversation non trouvée');
      }

      // Récupérer les détails du client (toujours présent)
      let clientData = null;
      try {
        clientData = await backendAdapter.getById(COLLECTIONS.PROFILES, convData.client_id);
      } catch (clientError) {
        console.warn('Erreur lors de la récupération du profil client:', clientError);
      }

      // Initialiser les données du prestataire
      let providerData = null;

      // Si provider_id existe, récupérer les informations du prestataire depuis profiles
      if (convData.provider_id) {
        try {
          providerData = await backendAdapter.getById(COLLECTIONS.PROFILES, convData.provider_id);
        } catch (provError) {
          console.warn('Erreur lors de la récupération du profil prestataire:', provError);
        }
      }

      // Déterminer quel utilisateur est l'autre utilisateur dans la conversation
      const currentUser = await backendAdapter.getCurrentUser();
      const currentUserId = currentUser?.id || currentUser?.$id;
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
      const user = await backendAdapter.getCurrentUser();
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Gérer l'upload de fichier si nécessaire
      let mediaUrl = '';
      let mediaMetadata: any = {};

      if (file && messageType !== 'text') {
        // Upload du fichier
        const filePath = `${uuidv4()}-${file.name}`;
        const bucketId = 'media'; // ID du bucket dans Appwrite
        
        try {
          const uploadData = await backendAdapter.uploadFile(bucketId, file, filePath);
          mediaUrl = backendAdapter.getFileUrl(bucketId, filePath);
          
          mediaMetadata = {
            name: file.name,
            size: file.size,
            type: file.type
          };
  
          // Ajouter des métadonnées spécifiques selon le type de média
          if (messageType === 'image') {
            const dimensions = await this.getImageDimensions(file);
            mediaMetadata = { ...mediaMetadata, ...dimensions };
          } else if (messageType === 'audio') {
            const duration = await this.getAudioDuration(file);
            mediaMetadata = { ...mediaMetadata, duration };
          } else if (messageType === 'video') {
            const videoData = await this.getVideoMetadata(file);
            mediaMetadata = { ...mediaMetadata, ...videoData };
          }
        } catch (uploadError) {
          console.error('Erreur lors de l\'upload du fichier:', uploadError);
          throw uploadError;
        }
      }

      // Créer le message directement dans la collection messages
      const messageData = await backendAdapter.create(COLLECTIONS.MESSAGES, {
        conversation_id: conversationId,
        sender_id: user.id || user.$id,
        content: content,
        message_type: messageType,
        media_url: mediaUrl,
        media_metadata: Object.keys(mediaMetadata).length > 0 ? mediaMetadata : null,
        created_at: new Date().toISOString(),
        read: false
      });

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
      const offset = page * pageSize;

      const messages = await backendAdapter.query(COLLECTIONS.MESSAGES, {
        filters: [{ field: 'conversation_id', operator: '=', value: conversationId }],
        orderBy: ['DESC(created_at)'],
        limit: pageSize,
        offset: offset
      });

      // Inverser pour avoir les plus anciens en premier
      return { data: (messages || []).reverse(), error: null };
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
    console.warn('Appwrite ne supporte pas encore complètement le realtime pour les collections');
    
    // Utiliser l'adaptateur pour s'abonner aux messages
    // Assurer que le retour est bien de type () => void
    const unsubscribe = backendAdapter.subscribeToCollection(COLLECTIONS.MESSAGES, (payload) => {
      // Vérifier si le message appartient à la conversation
      if (payload.conversation_id === conversationId) {
        callback(payload as unknown as Message);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
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
      const user = await backendAdapter.getCurrentUser();
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Récupérer le message
      const message = await backendAdapter.getById(COLLECTIONS.MESSAGES, messageId);
      if (!message) {
        throw new Error('Message non trouvé');
      }

      // Mettre à jour le message
      await backendAdapter.update(COLLECTIONS.MESSAGES, messageId, { read: true });
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Erreur lors du marquage du message comme lu:', error);
      return { success: false, error: error as Error };
    }
  }
}

export const messagingService = new MessagingService();
