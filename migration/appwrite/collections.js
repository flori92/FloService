/**
 * Configuration des collections Appwrite pour FloService
 * Ce script définit la structure des collections à créer dans Appwrite
 */

export default {
  // Collection des profils utilisateurs
  profiles: {
    name: 'profiles',
    attributes: [
      { key: 'first_name', type: 'string', required: false, array: false },
      { key: 'last_name', type: 'string', required: false, array: false },
      { key: 'avatar_url', type: 'string', required: false, array: false },
      { key: 'email', type: 'string', required: false, array: false },
      { key: 'phone', type: 'string', required: false, array: false },
      { key: 'is_provider', type: 'boolean', required: false, array: false, default: false },
      { key: 'is_admin', type: 'boolean', required: false, array: false, default: false },
      { key: 'created_at', type: 'datetime', required: false, array: false },
      { key: 'updated_at', type: 'datetime', required: false, array: false },
      { key: 'last_seen', type: 'datetime', required: false, array: false }
    ],
    indexes: [
      { key: 'email_idx', type: 'key', attributes: ['email'] },
      { key: 'provider_idx', type: 'key', attributes: ['is_provider'] }
    ]
  },
  
  // Collection des profils prestataires
  provider_profiles: {
    name: 'provider_profiles',
    attributes: [
      { key: 'user_id', type: 'string', required: true, array: false },
      { key: 'category_id', type: 'string', required: false, array: false },
      { key: 'title', type: 'string', required: false, array: false },
      { key: 'description', type: 'string', required: false, array: false },
      { key: 'hourly_rate', type: 'double', required: false, array: false },
      { key: 'years_experience', type: 'integer', required: false, array: false },
      { key: 'is_available', type: 'boolean', required: false, array: false, default: true },
      { key: 'created_at', type: 'datetime', required: false, array: false },
      { key: 'updated_at', type: 'datetime', required: false, array: false }
    ],
    indexes: [
      { key: 'user_id_idx', type: 'key', attributes: ['user_id'] },
      { key: 'category_idx', type: 'key', attributes: ['category_id'] },
      { key: 'availability_idx', type: 'key', attributes: ['is_available'] }
    ]
  },
  
  // Collection des services
  services: {
    name: 'services',
    attributes: [
      { key: 'provider_id', type: 'string', required: true, array: false },
      { key: 'title', type: 'string', required: true, array: false },
      { key: 'description', type: 'string', required: false, array: false },
      { key: 'price', type: 'double', required: true, array: false },
      { key: 'duration', type: 'integer', required: false, array: false },
      { key: 'category_id', type: 'string', required: false, array: false },
      { key: 'image_url', type: 'string', required: false, array: false },
      { key: 'created_at', type: 'datetime', required: false, array: false },
      { key: 'updated_at', type: 'datetime', required: false, array: false }
    ],
    indexes: [
      { key: 'provider_idx', type: 'key', attributes: ['provider_id'] },
      { key: 'category_idx', type: 'key', attributes: ['category_id'] },
      { key: 'price_idx', type: 'key', attributes: ['price'] }
    ]
  },
  
  // Collection des conversations
  conversations: {
    name: 'conversations',
    attributes: [
      { key: 'client_id', type: 'string', required: true, array: false },
      { key: 'provider_id', type: 'string', required: true, array: false },
      { key: 'last_message', type: 'string', required: false, array: false },
      { key: 'created_at', type: 'datetime', required: false, array: false },
      { key: 'updated_at', type: 'datetime', required: false, array: false }
    ],
    indexes: [
      { key: 'client_idx', type: 'key', attributes: ['client_id'] },
      { key: 'provider_idx', type: 'key', attributes: ['provider_id'] },
      { key: 'conversation_idx', type: 'key', attributes: ['client_id', 'provider_id'] }
    ]
  },
  
  // Collection des messages
  messages: {
    name: 'messages',
    attributes: [
      { key: 'conversation_id', type: 'string', required: true, array: false },
      { key: 'sender_id', type: 'string', required: true, array: false },
      { key: 'recipient_id', type: 'string', required: true, array: false },
      { key: 'content', type: 'string', required: true, array: false },
      { key: 'read', type: 'boolean', required: false, array: false, default: false },
      { key: 'created_at', type: 'datetime', required: false, array: false },
      { key: 'updated_at', type: 'datetime', required: false, array: false }
    ],
    indexes: [
      { key: 'conversation_idx', type: 'key', attributes: ['conversation_id'] },
      { key: 'sender_idx', type: 'key', attributes: ['sender_id'] },
      { key: 'recipient_idx', type: 'key', attributes: ['recipient_id'] },
      { key: 'created_at_idx', type: 'key', attributes: ['created_at'] }
    ]
  },
  
  // Collection des réservations
  bookings: {
    name: 'bookings',
    attributes: [
      { key: 'client_id', type: 'string', required: true, array: false },
      { key: 'service_id', type: 'string', required: true, array: false },
      { key: 'start_time', type: 'datetime', required: true, array: false },
      { key: 'end_time', type: 'datetime', required: true, array: false },
      { key: 'status', type: 'string', required: false, array: false, default: 'pending' },
      { key: 'notes', type: 'string', required: false, array: false },
      { key: 'created_at', type: 'datetime', required: false, array: false },
      { key: 'updated_at', type: 'datetime', required: false, array: false }
    ],
    indexes: [
      { key: 'client_idx', type: 'key', attributes: ['client_id'] },
      { key: 'service_idx', type: 'key', attributes: ['service_id'] },
      { key: 'status_idx', type: 'key', attributes: ['status'] },
      { key: 'date_idx', type: 'key', attributes: ['start_time'] }
    ]
  },
  
  // Collection des factures
  invoices: {
    name: 'invoices',
    attributes: [
      { key: 'booking_id', type: 'string', required: false, array: false },
      { key: 'client_id', type: 'string', required: true, array: false },
      { key: 'provider_id', type: 'string', required: true, array: false },
      { key: 'amount', type: 'double', required: true, array: false },
      { key: 'status', type: 'string', required: false, array: false, default: 'pending' },
      { key: 'payment_id', type: 'string', required: false, array: false },
      { key: 'pdf_url', type: 'string', required: false, array: false },
      { key: 'created_at', type: 'datetime', required: false, array: false },
      { key: 'updated_at', type: 'datetime', required: false, array: false }
    ],
    indexes: [
      { key: 'booking_idx', type: 'key', attributes: ['booking_id'] },
      { key: 'client_idx', type: 'key', attributes: ['client_id'] },
      { key: 'provider_idx', type: 'key', attributes: ['provider_id'] },
      { key: 'status_idx', type: 'key', attributes: ['status'] }
    ]
  }
};
