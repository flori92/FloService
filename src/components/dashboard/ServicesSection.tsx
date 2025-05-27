import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, DollarSign, Clock, Tag } from 'lucide-react';

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: number;
  category_id: string;
  subcategory_id: string | null;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

interface ServicesSectionProps {
  userId: string | undefined;
}

const ServicesSection: React.FC<ServicesSectionProps> = ({ userId }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    duration: '',
    category_id: '',
    subcategory_id: '',
    is_active: true
  });

  useEffect(() => {
    if (userId) {
      fetchServices();
      fetchCategories();
    }
  }, [userId]);

  const fetchServices = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setServices(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des services:', error);
      toast.error('Impossible de charger vos services');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // Récupérer les catégories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (categoriesError) throw categoriesError;
      
      // Pour chaque catégorie, récupérer ses sous-catégories
      const categoriesWithSubcategories = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { data: subcategoriesData, error: subcategoriesError } = await supabase
            .from('subcategories')
            .select('id, name')
            .eq('category_id', category.id)
            .order('name', { ascending: true });
          
          if (subcategoriesError) {
            console.error(`Erreur lors du chargement des sous-catégories pour la catégorie ${category.id}:`, subcategoriesError);
            return { ...category, subcategories: [] };
          }
          
          return {
            ...category,
            subcategories: subcategoriesData || []
          };
        })
      );
      
      setCategories(categoriesWithSubcategories);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      toast.error('Impossible de charger les catégories');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: target.checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      duration: '',
      category_id: '',
      subcategory_id: '',
      is_active: true
    });
    setEditingService(null);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description,
      price: service.price.toString(),
      duration: service.duration.toString(),
      category_id: service.category_id,
      subcategory_id: service.subcategory_id || '',
      is_active: service.is_active
    });
    setShowForm(true);
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setServices(prev => prev.filter(service => service.id !== id));
      toast.success('Service supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression du service:', error);
      toast.error('Impossible de supprimer le service');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const serviceData = {
        provider_id: userId,
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration),
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id || null,
        is_active: formData.is_active
      };
      
      if (editingService) {
        // Mise à jour d'un service existant
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
        
        setServices(prev => prev.map(service => 
          service.id === editingService.id 
            ? { ...service, ...serviceData } 
            : service
        ));
        
        toast.success('Service mis à jour avec succès');
      } else {
        // Création d'un nouveau service
        const { data, error } = await supabase
          .from('services')
          .insert(serviceData)
          .select();

        if (error) throw error;
        
        if (data && data.length > 0) {
          setServices(prev => [data[0], ...prev]);
        }
        
        toast.success('Service créé avec succès');
      }
      
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du service:', error);
      toast.error('Impossible d\'enregistrer le service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Mes Services</h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center"
        >
          {showForm ? 'Annuler' : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un service
            </>
          )}
        </button>
      </div>
      
      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h3 className="text-lg font-medium mb-4">
            {editingService ? 'Modifier le service' : 'Ajouter un nouveau service'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Titre du service *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="Ex: Réparation plomberie, Cours de cuisine..."
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="Décrivez en détail ce que vous proposez..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Prix (FCFA) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    required
                    min="0"
                    step="100"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                    placeholder="5000"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Durée (minutes) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="duration"
                    name="duration"
                    required
                    min="5"
                    step="5"
                    value={formData.duration}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                    placeholder="60"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="category_id"
                    name="category_id"
                    required
                    value={formData.category_id}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Sélectionnez une catégorie</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="subcategory_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Sous-catégorie
                </label>
                <select
                  id="subcategory_id"
                  name="subcategory_id"
                  value={formData.subcategory_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  disabled={!formData.category_id}
                >
                  <option value="">Sélectionnez une sous-catégorie</option>
                  {formData.category_id && categories
                    .find(c => c.id === formData.category_id)
                    ?.subcategories.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Service actif (visible par les clients)
              </label>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : (editingService ? 'Mettre à jour' : 'Ajouter')}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loading && services.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de vos services...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Vous n'avez pas encore ajouté de services. Cliquez sur "Ajouter un service" pour commencer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {services.map(service => (
            <div 
              key={service.id} 
              className={`border rounded-lg overflow-hidden shadow-sm ${
                service.is_active ? 'border-gray-200' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{service.title}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditService(service)}
                      className="p-1 text-gray-500 hover:text-teal-600"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-2">{service.description}</p>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="inline-flex items-center text-gray-700">
                    <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                    {service.price.toLocaleString()} FCFA
                  </span>
                  <span className="inline-flex items-center text-gray-700">
                    <Clock className="h-4 w-4 mr-1 text-gray-500" />
                    {service.duration} min
                  </span>
                  {!service.is_active && (
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700">
                      Inactif
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesSection;
