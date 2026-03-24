import React from 'react';
import { Shield, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useVerificationStore } from '../store/verificationStore';

const VerificationStatus: React.FC = () => {
  const { status, progress, pendingRequirements, lastCheck } = useVerificationStore();

  const getStatusColor = () => {
    switch (status) {
      case 'unverified': return 'text-red-500';
      case 'basic': return 'text-yellow-500';
      case 'advanced': return 'text-blue-500';
      case 'verified': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'unverified': return <AlertCircle className="w-6 h-6" />;
      case 'basic': return <Clock className="w-6 h-6" />;
      case 'advanced': return <Shield className="w-6 h-6" />;
      case 'verified': return <CheckCircle className="w-6 h-6" />;
      default: return <AlertCircle className="w-6 h-6" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Statut de vérification</h2>
        <span className={`flex items-center ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="ml-2 font-medium capitalize">{status}</span>
        </span>
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">Progression</span>
          <span className="text-sm font-medium">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-teal-600 rounded-full h-2 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {pendingRequirements.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Vérifications en attente
          </h3>
          <ul className="space-y-2">
            {pendingRequirements.map((req, index) => (
              <li key={index} className="flex items-center text-sm text-gray-600">
                <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-xs text-gray-500">
        Dernière vérification: {lastCheck ? new Date(lastCheck).toLocaleString() : 'Jamais'}
      </div>
    </div>
  );
};

export default VerificationStatus;