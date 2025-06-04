// API principale pour FloService sur Appwrite
const { Client, Users, Databases, Query, ID } = require('node-appwrite');

// Initialisation du client Appwrite
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(client);
const databases = new Databases(client);

// Configuration de la base de données
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'floservice_db';
const COLLECTIONS = {
  PROFILES: 'profiles',
  PROVIDER_PROFILES: 'provider_profiles',
  SERVICES: 'services',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  BOOKINGS: 'bookings',
  INVOICES: 'invoices'
};

/**
 * Fonction principale qui gère toutes les requêtes API
 */
module.exports = async function(req, res) {
  // Activer CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Gérer les requêtes OPTIONS (pre-flight)
  if (req.method === 'OPTIONS') {
    return res.send('');
  }

  try {
    // Extraire le chemin de l'API et les paramètres
    const path = req.path || '';
    const parts = path.split('/').filter(Boolean);
    const action = parts[0] || '';
    const params = req.body || {};
    
    // Router vers la fonction appropriée
    switch (action) {
      case 'get-or-create-conversation':
        return await getOrCreateConversation(params, res);
      case 'send-message':
        return await sendMessage(params, res);
      case 'mark-message-as-read':
        return await markMessageAsRead(params, res);
      default:
        return res.json({
          success: false,
          error: 'Action non reconnue'
        }, 400);
    }
  } catch (error) {
    console.error('Erreur API:', error);
    return res.json({
      success: false,
      error: error.message || 'Une erreur est survenue'
    }, 500);
  }
};

/**
 * Récupère ou crée une conversation entre un client et un prestataire
 */
async function getOrCreateConversation(params, res) {
  const { client_id, provider_external_id } = params;
  
  if (!client_id || !provider_external_id) {
    return res.json({
      success: false,
      error: 'Paramètres manquants'
    }, 400);
  }
  
  try {
    // Vérifier si une conversation existe déjà
    const conversations = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CONVERSATIONS,
      [
        Query.equal('client_id', client_id),
        Query.equal('provider_external_id', provider_external_id)
      ]
    );
    
    if (conversations.documents.length > 0) {
      // Conversation existante trouvée
      return res.json({
        success: true,
        data: conversations.documents[0].$id
      });
    }
    
    // Créer une nouvelle conversation
    const conversation = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.CONVERSATIONS,
      ID.unique(),
      {
        client_id,
        provider_external_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    );
    
    return res.json({
      success: true,
      data: conversation.$id
    });
  } catch (error) {
    console.error('Erreur lors de la création/récupération de la conversation:', error);
    return res.json({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * Envoie un message dans une conversation
 */
async function sendMessage(params, res) {
  const { 
    conversation_id, 
    sender_id, 
    content, 
    message_type = 'text',
    media_url = '',
    media_metadata = null
  } = params;
  
  if (!conversation_id || !sender_id || !content) {
    return res.json({
      success: false,
      error: 'Paramètres manquants'
    }, 400);
  }
  
  try {
    // Créer le message
    const message = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.MESSAGES,
      ID.unique(),
      {
        conversation_id,
        sender_id,
        content,
        message_type,
        media_url,
        media_metadata,
        created_at: new Date().toISOString(),
        read: false
      }
    );
    
    // Mettre à jour la dernière activité de la conversation
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.CONVERSATIONS,
      conversation_id,
      {
        last_message: content,
        last_message_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    );
    
    return res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    return res.json({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * Marque un message comme lu
 */
async function markMessageAsRead(params, res) {
  const { message_id, user_id } = params;
  
  if (!message_id || !user_id) {
    return res.json({
      success: false,
      error: 'Paramètres manquants'
    }, 400);
  }
  
  try {
    // Récupérer le message
    const message = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.MESSAGES,
      message_id
    );
    
    // Vérifier que l'utilisateur a le droit de marquer ce message comme lu
    // (il doit être le destinataire, pas l'expéditeur)
    if (message.sender_id === user_id) {
      return res.json({
        success: false,
        error: 'Un utilisateur ne peut pas marquer ses propres messages comme lus'
      }, 403);
    }
    
    // Marquer le message comme lu
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.MESSAGES,
      message_id,
      {
        read: true
      }
    );
    
    return res.json({
      success: true
    });
  } catch (error) {
    console.error('Erreur lors du marquage du message comme lu:', error);
    return res.json({
      success: false,
      error: error.message
    }, 500);
  }
}
