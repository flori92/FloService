import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface MigrationNoticeProps {
  onClose: () => void;
}

const MigrationNotice: React.FC<MigrationNoticeProps> = ({ onClose }) => {
  return (
    <div className="fixed bottom-20 right-6 w-80 bg-white rounded-lg shadow-lg border border-amber-300 p-4 z-50">
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-800">
            Migration requise
          </h3>
          <div className="mt-1 text-sm text-gray-600">
            <p>
              Le système de messagerie nécessite l'application des migrations dans la base de données.
              Veuillez contacter l'administrateur pour appliquer les migrations.
            </p>
          </div>
          <div className="mt-3 flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-amber-700 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
            >
              Compris
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationNotice;