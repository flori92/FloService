import { supabase } from '../src/lib/supabase';
import { UserService } from '../src/services/userService';

// Types pour les réponses de la base de données
interface Profile {
  id: string;
  [key: string]: any;
}

interface TableColumn {
  column_name: string;
}

interface TableRow {
  [key: string]: any;
}

class UserMigrationService {
  // Liste des tables contenant des user_id
  private static readonly USER_TABLES = [
    'profiles',
    'provider_profiles',
    'bookings',
    'messages',
    'conversations',
    'reviews',
    'notifications',
    'payments'
  ];

  // Colonnes contenant des IDs utilisateur
  private static readonly USER_ID_COLUMNS = [
    'id',
    'user_id',
    'client_id',
    'provider_id',
    'created_by',
    'updated_by'
  ];

  /**
   * Point d'entrée du script de migration
   */
  static async run() {
    console.log('🚀 Début de la migration des IDs utilisateurs...');
    
    try {
      // 1. Sauvegarde des données actuelles
      console.log('💾 Création d\'une sauvegarde...');
      await this.createBackup();

      // 2. Migration des profils utilisateurs
      console.log('🔄 Migration des profils utilisateurs...');
      await this.migrateProfiles();

      // 3. Mise à jour des références dans les autres tables
      for (const table of this.USER_TABLES) {
        console.log(`🔄 Mise à jour des références dans la table ${table}...`);
        await this.updateTableReferences(table);
      }

      console.log('✅ Migration terminée avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error);
      console.log('⚠️  Une erreur est survenue. Vérifiez les logs et restaurez la sauvegarde si nécessaire.');
      process.exit(1);
    }
  }

  /**
   * Crée une sauvegarde des tables concernées
   */
  private static async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    
    for (const table of this.USER_TABLES) {
      const backupTable = `${table}_backup_${timestamp}`;
      
      const { error } = await supabase.rpc('pg_dump_table', {
        source_table: table,
        target_table: backupTable
      });

      if (error) {
        console.warn(`⚠️ Impossible de sauvegarder la table ${table}:`, error.message);
      } else {
        console.log(`✅ Sauvegarde de ${table} vers ${backupTable}`);
      }
    }
  }

  /**
   * Migre les profils utilisateurs
   */
  private static async migrateProfiles() {
    // Récupérer uniquement les IDs des profils
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .not('id', 'is', null);

    if (error) throw error;
    if (!data || !Array.isArray(data)) {
      console.log('ℹ️ Aucun profil à migrer ou format de données inattendu');
      return;
    }

    console.log(`📊 ${data.length} profils à migrer`);

    // Mettre à jour chaque profil
    for (const item of data) {
      const profile = item as unknown as { id: string };
      if (!profile || typeof profile !== 'object' || !('id' in profile)) {
        console.warn('Profil invalide ignoré:', profile);
        continue;
      }
      const oldId = profile.id;
      if (!oldId) continue;
      const newId = UserService.normalizeUserId(oldId);

      // Si l'ID n'a pas changé, on passe
      if (oldId === newId) continue;

      console.log(`🔄 Migration de ${oldId} vers ${newId}...`);

      // Mettre à jour l'ID du profil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ id: newId })
        .eq('id', oldId);

      if (updateError) {
        console.error(`❌ Erreur lors de la mise à jour du profil ${oldId}:`, updateError);
        continue;
      }
    }
  }

  /**
   * Met à jour les références dans une table
   */
  private static async updateTableReferences(table: string) {
    // Récupérer les colonnes de la table
    const { data: columnsData, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', table);

    if (columnsError) throw columnsError;
    if (!columnsData || !Array.isArray(columnsData)) {
      console.warn(`Aucune colonne trouvée pour la table ${table}`);
      return;
    }

    // Pour chaque colonne qui pourrait contenir un user_id
    for (const col of columnsData) {
      const column = col as unknown as { column_name: string };
      if (!column || typeof column !== 'object' || !('column_name' in column)) {
        console.warn('Colonne invalide ignorée:', column);
        continue;
      }
      const columnName = column.column_name;
      if (this.USER_ID_COLUMNS.some(col => columnName.toLowerCase().includes(col))) {
        await this.updateColumnReferences(table, columnName);
      }
    }
  }

  /**
   * Met à jour les références dans une colonne spécifique
   */
  private static async updateColumnReferences(table: string, column: string) {
    // Récupérer les valeurs uniques dans cette colonne
    const { data: values, error } = await supabase
      .from(table)
      .select(column)
      .not(column, 'is', null);

    if (error) {
      console.warn(`⚠️ Erreur lors de la lecture des ${column} de ${table}:`, error.message);
      return;
    }

    // Mettre à jour chaque valeur
    for (const item of values) {
      if (!item) continue;
      const oldId = item[column as keyof typeof item];
      if (!oldId || typeof oldId !== 'string') continue;

      const newId = UserService.normalizeUserId(oldId);
      if (oldId === newId) continue;

      // Mettre à jour les références
      const { error: updateError } = await supabase
        .from(table)
        .update({ [column]: newId })
        .eq(column, oldId);

      if (updateError) {
        console.warn(`⚠️ Erreur lors de la mise à jour de ${table}.${column}:`, updateError.message);
      }
    }
  }
}

// Exécuter la migration
UserMigrationService.run().catch(console.error);
