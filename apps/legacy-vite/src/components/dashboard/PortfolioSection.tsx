import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Upload, Trash2, Plus, Move, Edit } from 'lucide-react';

interface PortfolioItem {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  order_index: number;
}

interface PortfolioSectionProps {
  userId: string | undefined;
}

const PortfolioSection: React.FC<PortfolioSectionProps> = ({ userId }) => {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editItem, setEditItem] = useState<PortfolioItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchPortfolioItems = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('user_id', userId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      
      setPortfolioItems(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement du portfolio:', error);
      toast.error('Impossible de charger votre portfolio');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPortfolioItems();
  }, [fetchPortfolioItems]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0 || !userId) {
        return;
      }

      setUploading(true);
      const files = Array.from(event.target.files);
      
      // Traiter chaque fichier séquentiellement
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-portfolio-${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const filePath = `portfolio/${fileName}`;

        // Upload de l'image vers Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('provider-assets')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Récupération de l'URL publique
        const { data: urlData } = supabase.storage
          .from('provider-assets')
          .getPublicUrl(filePath);

        // Déterminer le prochain ordre d'index
        const nextIndex = portfolioItems.length > 0 
          ? Math.max(...portfolioItems.map(item => item.order_index)) + 1 
          : 0;

        // Ajouter l'élément au portfolio
        const { error: insertError } = await supabase
          .from('portfolio_items')
          .insert({
            user_id: userId,
            image_url: urlData.publicUrl,
            title: file.name.split('.')[0], // Utiliser le nom du fichier comme titre par défaut
            description: null,
            order_index: nextIndex
          });

        if (insertError) throw insertError;
      }

      // Rafraîchir la liste
      await fetchPortfolioItems();
      toast.success(files.length > 1 
        ? `${files.length} images ajoutées au portfolio` 
        : 'Image ajoutée au portfolio');
    } catch (error) {
      console.error('Erreur lors de l\'upload des images:', error);
      toast.error('Impossible d\'ajouter les images au portfolio');
    } finally {
      setUploading(false);
      // Réinitialiser l'input file
      const fileInput = document.getElementById('portfolio-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const handleRemoveItem = async (id: string, imageUrl: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette image de votre portfolio ?')) {
      return;
    }

    try {
      setLoading(true);
      
      // Supprimer l'élément de la base de données
      const { error: deleteError } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Extraire le chemin du fichier à partir de l'URL
      const filePath = imageUrl.split('/').pop();
      if (filePath) {
        // Supprimer le fichier du stockage
        await supabase.storage
          .from('provider-assets')
          .remove([`portfolio/${filePath}`]);
      }

      // Mettre à jour la liste locale
      setPortfolioItems(prev => prev.filter(item => item.id !== id));
      toast.success('Image supprimée du portfolio');
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'image:', error);
      toast.error('Impossible de supprimer l\'image');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (item: PortfolioItem) => {
    setEditItem(item);
    setEditTitle(item.title || '');
    setEditDescription(item.description || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('portfolio_items')
        .update({
          title: editTitle,
          description: editDescription
        })
        .eq('id', editItem.id);

      if (error) throw error;
      
      // Mettre à jour la liste locale
      setPortfolioItems(prev => prev.map(item => 
        item.id === editItem.id 
          ? { ...item, title: editTitle, description: editDescription } 
          : item
      ));
      
      setShowEditModal(false);
      toast.success('Image mise à jour');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'image:', error);
      toast.error('Impossible de mettre à jour l\'image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Mon Portfolio</h2>
      
      {/* Zone de drop pour l'upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-8 hover:border-teal-500 transition-colors">
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          id="portfolio-upload"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <label htmlFor="portfolio-upload" className="cursor-pointer block">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600">
            {uploading 
              ? 'Téléchargement en cours...' 
              : 'Glissez des images ou cliquez pour ajouter à votre portfolio'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Formats acceptés: JPG, PNG, GIF. Max 5MB par image.
          </p>
          <button 
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
            disabled={uploading}
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Sélectionner des images
          </button>
        </label>
      </div>
      
      {loading && portfolioItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de votre portfolio...</p>
        </div>
      ) : portfolioItems.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Votre portfolio est vide. Ajoutez des images pour montrer votre travail.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolioItems.map(item => (
            <div key={item.id} className="relative group overflow-hidden rounded-lg shadow-md">
              <img 
                src={item.image_url} 
                alt={item.title || 'Image portfolio'} 
                className="w-full h-64 object-cover"
              />
              
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-white font-medium truncate">{item.title || 'Sans titre'}</h3>
                  {item.description && (
                    <p className="text-white/80 text-sm line-clamp-2">{item.description}</p>
                  )}
                </div>
                
                <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button 
                    onClick={() => openEditModal(item)}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4 text-gray-700" />
                  </button>
                  <button 
                    onClick={() => handleRemoveItem(item.id, item.image_url)}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal d'édition */}
      {showEditModal && editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Modifier l'image</h3>
            
            <div className="mb-4">
              <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                Titre
              </label>
              <input
                type="text"
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="edit-description"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioSection;
