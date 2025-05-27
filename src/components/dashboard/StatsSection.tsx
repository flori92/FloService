import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart2, TrendingUp, Users, Calendar, DollarSign, Star } from 'lucide-react';

interface StatsSectionProps {
  userId: string | undefined;
}

interface StatsData {
  totalBookings: number;
  completedBookings: number;
  totalClients: number;
  totalRevenue: number;
  averageRating: number;
  monthlyStats: {
    month: string;
    bookings: number;
    revenue: number;
  }[];
}

const StatsSection: React.FC<StatsSectionProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({
    totalBookings: 0,
    completedBookings: 0,
    totalClients: 0,
    totalRevenue: 0,
    averageRating: 0,
    monthlyStats: []
  });
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId, period]);

  const fetchStats = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Note: Dans une application réelle, ces statistiques seraient calculées côté serveur
      // Ici, nous simulons des données pour la démonstration
      
      // Simuler un délai de chargement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Générer des données aléatoires pour la démonstration
      const totalBookings = Math.floor(Math.random() * 50) + 10;
      const completedBookings = Math.floor(totalBookings * 0.7);
      const totalClients = Math.floor(Math.random() * 30) + 5;
      const totalRevenue = Math.floor(Math.random() * 500000) + 100000;
      const averageRating = (Math.random() * 2) + 3; // Entre 3 et 5
      
      // Générer des statistiques mensuelles
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      const currentMonth = new Date().getMonth();
      
      const monthlyStats = [];
      
      // Nombre de mois à afficher selon la période
      const monthsToShow = period === 'week' ? 1 : period === 'month' ? 6 : 12;
      
      for (let i = 0; i < monthsToShow; i++) {
        const monthIndex = (currentMonth - i + 12) % 12; // Pour gérer le passage à l'année précédente
        const bookings = Math.floor(Math.random() * 15) + 1;
        const revenue = bookings * (Math.floor(Math.random() * 20000) + 5000);
        
        monthlyStats.unshift({
          month: months[monthIndex],
          bookings,
          revenue
        });
      }
      
      setStats({
        totalBookings,
        completedBookings,
        totalClients,
        totalRevenue,
        averageRating,
        monthlyStats
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour formater les montants en FCFA
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  // Calculer le taux de complétion des réservations
  const completionRate = stats.totalBookings > 0 
    ? Math.round((stats.completedBookings / stats.totalBookings) * 100) 
    : 0;

  // Trouver la valeur maximale pour les graphiques
  const maxBookings = Math.max(...stats.monthlyStats.map(stat => stat.bookings));
  const maxRevenue = Math.max(...stats.monthlyStats.map(stat => stat.revenue));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Statistiques</h2>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 rounded-md text-sm ${
              period === 'week' 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Semaine
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1 rounded-md text-sm ${
              period === 'month' 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            6 mois
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-3 py-1 rounded-md text-sm ${
              period === 'year' 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Année
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
        </div>
      ) : (
        <>
          {/* Cartes de statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Réservations</p>
                  <p className="text-2xl font-semibold">{stats.totalBookings}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {completionRate}% complétées
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Revenus</p>
                  <p className="text-2xl font-semibold">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    ~{formatCurrency(Math.round(stats.totalRevenue / (stats.completedBookings || 1)))} par service
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
                  <Star className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Note moyenne</p>
                  <p className="text-2xl font-semibold">{stats.averageRating.toFixed(1)}/5</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Basée sur {Math.floor(stats.completedBookings * 0.8)} avis
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Graphique des réservations */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium mb-4">Réservations</h3>
              <div className="h-64 flex items-end space-x-2">
                {stats.monthlyStats.map((stat, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t-sm" 
                      style={{ 
                        height: `${(stat.bookings / maxBookings) * 100}%`,
                        minHeight: stat.bookings > 0 ? '10%' : '0'
                      }}
                    ></div>
                    <p className="text-xs text-gray-600 mt-2">{stat.month}</p>
                    <p className="text-xs font-medium">{stat.bookings}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Graphique des revenus */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium mb-4">Revenus</h3>
              <div className="h-64 flex items-end space-x-2">
                {stats.monthlyStats.map((stat, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-green-500 rounded-t-sm" 
                      style={{ 
                        height: `${(stat.revenue / maxRevenue) * 100}%`,
                        minHeight: stat.revenue > 0 ? '10%' : '0'
                      }}
                    ></div>
                    <p className="text-xs text-gray-600 mt-2">{stat.month}</p>
                    <p className="text-xs font-medium">{formatCurrency(stat.revenue).split(' ')[0]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Conseils pour améliorer les performances */}
          <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-100">
            <h3 className="text-lg font-medium text-blue-800 mb-3">
              <TrendingUp className="h-5 w-5 inline mr-2" />
              Conseils pour améliorer vos performances
            </h3>
            <ul className="space-y-2 text-blue-700">
              <li className="flex items-start">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mt-1.5 mr-2"></span>
                Complétez votre profil à 100% pour augmenter votre visibilité.
              </li>
              <li className="flex items-start">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mt-1.5 mr-2"></span>
                Ajoutez plus de photos à votre portfolio pour montrer votre expertise.
              </li>
              <li className="flex items-start">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mt-1.5 mr-2"></span>
                Répondez rapidement aux demandes de réservation pour améliorer votre taux de conversion.
              </li>
              <li className="flex items-start">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mt-1.5 mr-2"></span>
                Demandez des avis à vos clients satisfaits pour renforcer votre réputation.
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default StatsSection;
