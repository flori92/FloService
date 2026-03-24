import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Calendar, Clock, Plus, X, Save, AlertTriangle } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';

interface AvailabilitySectionProps {
  userId: string | undefined;
}

interface WeeklyAvailability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface AvailabilityException {
  id: string;
  exception_date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

interface Booking {
  id: string;
  service_title: string;
  client_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

const dayNames = [
  { id: 0, name: 'Dimanche' },
  { id: 1, name: 'Lundi' },
  { id: 2, name: 'Mardi' },
  { id: 3, name: 'Mercredi' },
  { id: 4, name: 'Jeudi' },
  { id: 5, name: 'Vendredi' },
  { id: 6, name: 'Samedi' }
];

const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({ userId }) => {
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyAvailability[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'weekly' | 'exceptions'>('calendar');
  
  // État pour l'ajout de nouvelles disponibilités
  const [newAvailability, setNewAvailability] = useState<{
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>({
    day_of_week: 1, // Lundi par défaut
    start_time: '09:00',
    end_time: '18:00'
  });
  
  // État pour l'ajout de nouvelles exceptions
  const [newException, setNewException] = useState<{
    exception_date: string;
    is_available: boolean;
    start_time: string;
    end_time: string;
    reason: string;
  }>({
    exception_date: new Date().toISOString().split('T')[0],
    is_available: false,
    start_time: '09:00',
    end_time: '18:00',
    reason: ''
  });

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchWeeklyAvailability(),
        fetchExceptions(),
        fetchBookings()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Impossible de charger vos disponibilités');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyAvailability = async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', userId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    setWeeklyAvailability(data || []);
  };

  const fetchExceptions = async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from('provider_availability_exceptions')
      .select('*')
      .eq('provider_id', userId)
      .order('exception_date', { ascending: true });
    
    if (error) throw error;
    setExceptions(data || []);
  };

  const fetchBookings = async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        services:service_id (title),
        clients:client_id (full_name),
        date,
        start_time,
        end_time,
        status
      `)
      .eq('provider_id', userId)
      .in('status', ['pending', 'confirmed'])
      .order('date', { ascending: true });
    
    if (error) throw error;
    
    const formattedBookings = (data || []).map(booking => ({
      id: booking.id,
      service_title: booking.services ? (booking.services as any).title || 'Service inconnu' : 'Service inconnu',
      client_name: booking.clients ? (booking.clients as any).full_name || 'Client inconnu' : 'Client inconnu',
      date: booking.date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status
    }));
    
    setBookings(formattedBookings);
  };

  const handleAddWeeklyAvailability = async () => {
    if (!userId) return;
    
    try {
      // Vérifier que l'heure de fin est après l'heure de début
      if (newAvailability.start_time >= newAvailability.end_time) {
        toast.error('L\'heure de fin doit être après l\'heure de début');
        return;
      }
      
      const { data, error } = await supabase
        .from('provider_availability')
        .insert({
          provider_id: userId,
          day_of_week: newAvailability.day_of_week,
          start_time: newAvailability.start_time,
          end_time: newAvailability.end_time,
          is_available: true
        })
        .select();
      
      if (error) throw error;
      
      setWeeklyAvailability([...weeklyAvailability, data[0]]);
      toast.success('Disponibilité ajoutée avec succès');
      
      // Réinitialiser le formulaire
      setNewAvailability({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '18:00'
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la disponibilité:', error);
      toast.error('Impossible d\'ajouter la disponibilité');
    }
  };

  const handleDeleteWeeklyAvailability = async (id: string) => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('provider_availability')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setWeeklyAvailability(weeklyAvailability.filter(item => item.id !== id));
      toast.success('Disponibilité supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression de la disponibilité:', error);
      toast.error('Impossible de supprimer la disponibilité');
    }
  };

  const handleAddException = async () => {
    if (!userId) return;
    
    try {
      // Vérifier que la date est valide
      if (!newException.exception_date) {
        toast.error('Veuillez sélectionner une date');
        return;
      }
      
      // Si c'est une exception de disponibilité, vérifier les heures
      if (newException.is_available && newException.start_time >= newException.end_time) {
        toast.error('L\'heure de fin doit être après l\'heure de début');
        return;
      }
      
      const { data, error } = await supabase
        .from('provider_availability_exceptions')
        .insert({
          provider_id: userId,
          exception_date: newException.exception_date,
          is_available: newException.is_available,
          start_time: newException.is_available ? newException.start_time : null,
          end_time: newException.is_available ? newException.end_time : null,
          reason: newException.reason
        })
        .select();
      
      if (error) throw error;
      
      setExceptions([...exceptions, data[0]]);
      toast.success('Exception ajoutée avec succès');
      
      // Réinitialiser le formulaire
      setNewException({
        exception_date: new Date().toISOString().split('T')[0],
        is_available: false,
        start_time: '09:00',
        end_time: '18:00',
        reason: ''
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'exception:', error);
      toast.error('Impossible d\'ajouter l\'exception');
    }
  };

  const handleDeleteException = async (id: string) => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('provider_availability_exceptions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setExceptions(exceptions.filter(item => item.id !== id));
      toast.success('Exception supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'exception:', error);
      toast.error('Impossible de supprimer l\'exception');
    }
  };

  const getCalendarEvents = () => {
    // Convertir les réservations en événements pour le calendrier
    const bookingEvents = bookings.map(booking => ({
      id: booking.id,
      title: `${booking.service_title} - ${booking.client_name}`,
      start: `${booking.date}T${booking.start_time}`,
      end: `${booking.date}T${booking.end_time}`,
      backgroundColor: booking.status === 'confirmed' ? '#0d9488' : '#f59e0b',
      borderColor: booking.status === 'confirmed' ? '#0d9488' : '#f59e0b',
      textColor: '#ffffff',
      extendedProps: {
        type: 'booking',
        status: booking.status
      }
    }));
    
    // Convertir les exceptions en événements pour le calendrier
    const exceptionEvents = exceptions.map(exception => ({
      id: `exception-${exception.id}`,
      title: exception.is_available 
        ? `Disponible: ${exception.reason || 'Horaire spécial'}` 
        : `Indisponible: ${exception.reason || 'Jour off'}`,
      start: exception.exception_date,
      allDay: !exception.is_available || (!exception.start_time && !exception.end_time),
      backgroundColor: exception.is_available ? '#10b981' : '#ef4444',
      borderColor: exception.is_available ? '#10b981' : '#ef4444',
      textColor: '#ffffff',
      extendedProps: {
        type: 'exception'
      }
    }));
    
    return [...bookingEvents, ...exceptionEvents];
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement de vos disponibilités...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Disponibilités et Agenda</h2>
      
      {/* Onglets de navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              activeTab === 'calendar'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="inline-block h-4 w-4 mr-2" />
            Agenda
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              activeTab === 'weekly'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="inline-block h-4 w-4 mr-2" />
            Horaires hebdomadaires
          </button>
          <button
            onClick={() => setActiveTab('exceptions')}
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              activeTab === 'exceptions'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <AlertTriangle className="inline-block h-4 w-4 mr-2" />
            Exceptions
          </button>
        </nav>
      </div>
      
      {/* Contenu des onglets */}
      <div className="space-y-6">
        {activeTab === 'calendar' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium mb-4">Mon agenda</h3>
            <div className="h-[600px]">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                locale={frLocale}
                events={getCalendarEvents()}
                businessHours={weeklyAvailability.map(avail => ({
                  daysOfWeek: [avail.day_of_week],
                  startTime: avail.start_time,
                  endTime: avail.end_time
                }))}
                height="100%"
                nowIndicator={true}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={true}
                slotDuration="00:30:00"
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-teal-600 mr-2"></div>
                <span className="text-sm text-gray-700">Réservations confirmées</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-amber-500 mr-2"></div>
                <span className="text-sm text-gray-700">Réservations en attente</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm text-gray-700">Jours d'indisponibilité</span>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'weekly' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium mb-4">Horaires hebdomadaires</h3>
            
            {/* Formulaire d'ajout de disponibilité */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-md font-medium mb-3 flex items-center">
                <Plus className="h-4 w-4 mr-2 text-teal-600" />
                Ajouter une disponibilité
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jour</label>
                  <select
                    value={newAvailability.day_of_week}
                    onChange={(e) => setNewAvailability({
                      ...newAvailability,
                      day_of_week: parseInt(e.target.value)
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  >
                    {dayNames.map((day) => (
                      <option key={day.id} value={day.id}>{day.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heure de début</label>
                  <input
                    type="time"
                    value={newAvailability.start_time}
                    onChange={(e) => setNewAvailability({
                      ...newAvailability,
                      start_time: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heure de fin</label>
                  <input
                    type="time"
                    value={newAvailability.end_time}
                    onChange={(e) => setNewAvailability({
                      ...newAvailability,
                      end_time: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
              <button
                onClick={handleAddWeeklyAvailability}
                className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Ajouter
              </button>
            </div>
            
            {/* Liste des disponibilités */}
            {weeklyAvailability.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Vous n'avez pas encore défini d'horaires hebdomadaires.</p>
                <p className="text-gray-500 mt-2">Ajoutez vos disponibilités pour permettre aux clients de réserver vos services.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jour</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heure de début</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heure de fin</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {weeklyAvailability.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {dayNames.find(day => day.id === item.day_of_week)?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.start_time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.end_time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteWeeklyAvailability(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'exceptions' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium mb-4">Exceptions et jours spéciaux</h3>
            
            {/* Formulaire d'ajout d'exception */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-md font-medium mb-3 flex items-center">
                <Plus className="h-4 w-4 mr-2 text-teal-600" />
                Ajouter une exception
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newException.exception_date}
                    onChange={(e) => setNewException({
                      ...newException,
                      exception_date: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type d'exception</label>
                  <select
                    value={newException.is_available.toString()}
                    onChange={(e) => setNewException({
                      ...newException,
                      is_available: e.target.value === 'true'
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="false">Jour d'indisponibilité</option>
                    <option value="true">Horaires spéciaux</option>
                  </select>
                </div>
              </div>
              
              {newException.is_available && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure de début</label>
                    <input
                      type="time"
                      value={newException.start_time}
                      onChange={(e) => setNewException({
                        ...newException,
                        start_time: e.target.value
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure de fin</label>
                    <input
                      type="time"
                      value={newException.end_time}
                      onChange={(e) => setNewException({
                        ...newException,
                        end_time: e.target.value
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison (optionnel)</label>
                <input
                  type="text"
                  value={newException.reason || ''}
                  onChange={(e) => setNewException({
                    ...newException,
                    reason: e.target.value
                  })}
                  placeholder="Ex: Vacances, formation, etc."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              
              <button
                onClick={handleAddException}
                className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Ajouter
              </button>
            </div>
            
            {/* Liste des exceptions */}
            {exceptions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Vous n'avez pas encore défini d'exceptions.</p>
                <p className="text-gray-500 mt-2">Ajoutez des exceptions pour les jours où vous n'êtes pas disponible ou avez des horaires spéciaux.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horaires</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raison</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {exceptions.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {formatDate(item.exception_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.is_available ? 'Horaires spéciaux' : 'Indisponible'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.is_available && item.start_time && item.end_time
                            ? `${item.start_time} - ${item.end_time}`
                            : 'Toute la journée'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.reason || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteException(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailabilitySection;
