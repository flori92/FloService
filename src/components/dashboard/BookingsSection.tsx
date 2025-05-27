import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Calendar, Clock, User, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Booking {
  id: string;
  service_id: string;
  service_title: string;
  client_id: string;
  client_name: string;
  client_avatar: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  location: string;
  notes: string | null;
  created_at: string;
}

interface BookingsSectionProps {
  userId: string | undefined;
}

const BookingsSection: React.FC<BookingsSectionProps> = ({ userId }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    if (userId) {
      fetchBookings();
    }
  }, [userId]);

  const fetchBookings = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Dans une application réelle, cette requête serait plus complexe
      // avec des jointures pour obtenir les informations des services et des clients
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          service_id,
          services:service_id (title),
          client_id,
          clients:client_id (full_name, avatar_url),
          date,
          start_time,
          end_time,
          status,
          location,
          notes,
          created_at
        `)
        .eq('provider_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Transformer les données pour correspondre à notre interface
      const formattedBookings = (data || []).map(booking => ({
        id: booking.id,
        service_id: booking.service_id,
        service_title: booking.services?.title || 'Service inconnu',
        client_id: booking.client_id,
        client_name: booking.clients?.full_name || 'Client inconnu',
        client_avatar: booking.clients?.avatar_url || null,
        date: booking.date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        location: booking.location,
        notes: booking.notes,
        created_at: booking.created_at
      }));
      
      setBookings(formattedBookings);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
      toast.error('Impossible de charger vos réservations');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: 'confirmed' | 'completed' | 'cancelled') => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Mettre à jour l'état local
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: newStatus } 
          : booking
      ));
      
      toast.success(`Réservation ${
        newStatus === 'confirmed' ? 'confirmée' : 
        newStatus === 'completed' ? 'marquée comme terminée' : 
        'annulée'
      } avec succès`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      toast.error('Impossible de mettre à jour le statut');
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === filter);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            En attente
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmée
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Terminée
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Annulée
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Mes Réservations</h2>
      
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all' 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md ${
              filter === 'pending' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            En attente
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-4 py-2 rounded-md ${
              filter === 'confirmed' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Confirmées
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-md ${
              filter === 'completed' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Terminées
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-md ${
              filter === 'cancelled' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Annulées
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de vos réservations...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'Vous n\'avez pas encore de réservations.' 
              : `Vous n'avez pas de réservations ${
                  filter === 'pending' ? 'en attente' : 
                  filter === 'confirmed' ? 'confirmées' : 
                  filter === 'completed' ? 'terminées' : 
                  'annulées'
                }.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredBookings.map(booking => (
            <div key={booking.id} className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div className="mb-2 md:mb-0">
                    <h3 className="text-lg font-medium text-gray-900">{booking.service_title}</h3>
                    <div className="mt-1">{getStatusBadge(booking.status)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {booking.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                          className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                        >
                          Annuler
                        </button>
                      </>
                    )}
                    {booking.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(booking.id, 'completed')}
                          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          Marquer comme terminée
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                          className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                        >
                          Annuler
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-gray-700">{formatDate(booking.date)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-gray-700">{booking.start_time} - {booking.end_time}</span>
                  </div>
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-500 mr-2" />
                    <div className="flex items-center">
                      {booking.client_avatar ? (
                        <img 
                          src={booking.client_avatar} 
                          alt={booking.client_name} 
                          className="h-6 w-6 rounded-full mr-2"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-gray-200 mr-2"></div>
                      )}
                      <span className="text-gray-700">{booking.client_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-gray-700">{booking.location}</span>
                  </div>
                </div>
                
                {booking.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700">{booking.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingsSection;
