/**
 * Composant pour vérifier si les migrations Supabase ont été appliquées
 * et afficher une notification à l'utilisateur si nécessaire
 * Créé le 02/06/2025
 */

import { useEffect, useState } from 'react';
import { checkMigrationStatus, showMigrationRequiredNotification } from '../utils/migrationChecker';
import { useAuthStore } from '../store/authStore';
import { Alert, AlertTitle } from './ui/Alert';
import { Button } from './ui/Button';

interface MigrationCheckerProps {
  onStatusChange?: (status: 'ok' | 'migration_required') => void;
}

export default function MigrationChecker({ onStatusChange }: MigrationCheckerProps) {
  const [migrationRequired, setMigrationRequired] = useState<boolean>(false);
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [missingFunctions, setMissingFunctions] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean>(false);
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');

  useEffect(() => {
    const checkMigrations = async () => {
      try {
        const result = await checkMigrationStatus();
        
        if (result.status === 'migration_required') {
          setMigrationRequired(true);
          setMissingTables(result.missingTables);
          setMissingFunctions(result.missingFunctions);
          showMigrationRequiredNotification();
          
          if (onStatusChange) {
            onStatusChange('migration_required');
          }
        } else {
          setMigrationRequired(false);
          
          if (onStatusChange) {
            onStatusChange('ok');
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des migrations:', error);
      } finally {
        setChecked(true);
      }
    };

    // Vérifier les migrations uniquement si l'utilisateur est connecté
    const user = useAuthStore.getState().user;
    if (user) {
      checkMigrations();
    } else {
      setChecked(true);
    }
  }, [onStatusChange]);

  // Si la vérification n'a pas encore été effectuée ou si aucune migration n'est requise, ne rien afficher
  if (!checked || !migrationRequired) {
    return null;
  }

  return (
    <div className="mb-4">
      <Alert variant="destructive">
        <AlertTitle>Base de données non à jour</AlertTitle>
        <p className="mt-2">
          Certaines tables ou fonctions requises sont manquantes dans la base de données.
          Certaines fonctionnalités de l'application peuvent ne pas fonctionner correctement.
        </p>
        
        {isAdmin && (
          <div className="mt-4">
            <details>
              <summary className="cursor-pointer font-semibold">Détails techniques (admin uniquement)</summary>
              <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                {missingTables.length > 0 && (
                  <div className="mb-2">
                    <strong>Tables manquantes:</strong>
                    <ul className="list-disc pl-5">
                      {missingTables.map((table) => (
                        <li key={table}>{table}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {missingFunctions.length > 0 && (
                  <div>
                    <strong>Fonctions manquantes:</strong>
                    <ul className="list-disc pl-5">
                      {missingFunctions.map((func) => (
                        <li key={func}>{func}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mt-3 text-xs">
                  <p>Pour résoudre ce problème, exécutez les migrations Supabase:</p>
                  <pre className="bg-gray-800 text-white p-2 rounded mt-1 overflow-x-auto">
                    npx supabase db push
                  </pre>
                </div>
              </div>
            </details>
            
            <div className="mt-4 flex space-x-2">
              <Button variant="destructive" size="sm" onClick={() => window.location.reload()}>
                Rafraîchir l'application
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMigrationRequired(false)}>
                Ignorer
              </Button>
            </div>
          </div>
        )}
      </Alert>
    </div>
  );
}
