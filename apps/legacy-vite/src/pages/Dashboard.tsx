import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { User, FileText, Bell, CreditCard } from 'lucide-react';
import ClientOffersList from '../components/offers/ClientOffersList';

function Dashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Onglets du dashboard client
  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <User className="h-5 w-5" /> },
    { id: 'offers', label: 'Mes offres', icon: <CreditCard className="h-5 w-5" /> },
    { id: 'bookings', label: 'Mes réservations', icon: <FileText className="h-5 w-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-5 w-5" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* En-tête du dashboard */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900">
              Bienvenue sur votre espace client
            </h1>
            <p className="text-gray-600 mt-2">
              Bonjour, {user?.user_metadata?.full_name || user?.email}! Gérez vos réservations et suivez vos offres de service.
            </p>
          </div>
          
          {/* Navigation par onglets */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-6 flex items-center space-x-2 font-medium text-sm border-b-2 ${activeTab === tab.id
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          {/* Contenu de l'onglet actif */}
          <div className="p-6">
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h2 className="text-xl font-semibold text-blue-900 mb-2">Statistiques</h2>
                  <p className="text-blue-600">Vos statistiques et métriques apparaîtront ici.</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h2 className="text-xl font-semibold text-green-900 mb-2">Activité récente</h2>
                  <p className="text-green-600">Vos activités récentes seront affichées ici.</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h2 className="text-xl font-semibold text-purple-900 mb-2">Notifications</h2>
                  <p className="text-purple-600">Vos dernières notifications apparaîtront ici.</p>
                </div>
              </div>
            )}
            
            {activeTab === 'offers' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Mes offres de service</h2>
                <ClientOffersList />
              </div>
            )}
            
            {activeTab === 'bookings' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Mes réservations</h2>
                <p className="text-gray-600">La liste de vos réservations apparaîtra ici.</p>
              </div>
            )}
            
            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Notifications</h2>
                <p className="text-gray-600">Vos notifications apparaîtront ici.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;