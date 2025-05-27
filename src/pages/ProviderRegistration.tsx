import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Upload, Calendar, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LivenessCheck from '../components/LivenessCheck';

interface RegistrationForm {
  fullName: string;
  dateOfBirth: string;
  address: string;
  phone: string;
  email: string;
  specialties: string[];
  experienceYears: number;
  biometricVerified: boolean;
}

const ProviderRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<RegistrationForm>();
  const [loading, setLoading] = useState(false);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string, subcategories: {id: string, name: string}[]}[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [biometricSelfie, setBiometricSelfie] = useState<string | null>(null);
  const [showLivenessCheck, setShowLivenessCheck] = useState(false);
  
  // Charger les catégories depuis la base de données
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select(`
            id, 
            name,
            subcategories:service_subcategories(id, name)
          `);
          
        if (error) throw error;
        setCategories(data || []);
      } catch (error: unknown) {
        console.error('Erreur lors du chargement des catégories:', error);
        toast.error('Impossible de charger les catégories');
      } finally {
        setLoadingCategories(false);
      }
    };
    
    fetchCategories();
  }, []);

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('provider-verification')
      .upload(`${path}/${Date.now()}-${file.name}`, file);

    if (error) throw error;
    return data.path;
  };

  const onSubmit = async (data: RegistrationForm) => {
    try {
      setLoading(true);

      if (!idFront || !idBack || !selfie || !addressProof) {
        throw new Error('Veuillez télécharger tous les documents requis');
      }

      // Upload all files
      const [
        idFrontUrl,
        idBackUrl,
        selfieUrl,
        addressProofUrl,
        ...portfolioUrls
      ] = await Promise.all([
        uploadFile(idFront, 'id-documents'),
        uploadFile(idBack, 'id-documents'),
        uploadFile(selfie, 'selfies'),
        await uploadFile(addressProof, 'address-proof'),
        // Enregistrer le selfie biométrique s'il existe
        biometricSelfie ? (
          new Promise(async (resolve) => {
            const response = await fetch(biometricSelfie);
            const blob = await response.blob();
            const file = new File([blob], 'biometric-selfie.jpg', { type: 'image/jpeg' });
            resolve(await uploadFile(file, 'biometric-verification'));
          })
        ) : Promise.resolve(),
        ...portfolioFiles.map(file => uploadFile(file, 'portfolio'))
      ]);

      // Save verification data
      const { error } = await supabase
        .from('provider_verifications')
        .insert({
          full_name: data.fullName,
          date_of_birth: data.dateOfBirth,
          id_document_front: idFrontUrl,
          id_document_back: idBackUrl,
          selfie_with_id: selfieUrl,
          address: data.address,
          address_proof: addressProofUrl,
          phone: data.phone,
          email: data.email,
          specialties: data.specialties,
          experience_years: data.experienceYears,
          portfolio_urls: portfolioUrls
        });

      if (error) throw error;

      toast.success('Votre demande a été soumise avec succès');
      navigate('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Inscription Prestataire
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Informations Personnelles</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    {...register('fullName', { required: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date de naissance
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="date"
                      {...register('dateOfBirth', { required: true })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Identity Verification */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Vérification d'identité</h2>
              
              {/* Vérification biométrique */}
              <div className="mb-6 border-b pb-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
                  <ShieldCheck className="mr-2 h-5 w-5 text-teal-600" />
                  Vérification biométrique
                </h3>
                
                {biometricVerified ? (
                  <div className="bg-green-50 p-4 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Vérification biométrique réussie</h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>Votre identité a été vérifiée avec succès.</p>
                        </div>
                        {biometricSelfie && (
                          <div className="mt-2">
                            <img 
                              src={biometricSelfie} 
                              alt="Selfie vérifié" 
                              className="h-20 w-20 object-cover rounded-md" 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-600 text-sm">
                      Pour garantir la sécurité de notre plateforme, nous devons vérifier que vous êtes bien une personne réelle.
                      Cette vérification est effectuée directement dans votre navigateur et aucune donnée n'est envoyée à des serveurs externes.
                    </p>
                    
                    {showLivenessCheck ? (
                      <LivenessCheck 
                        onVerificationComplete={({ success, imageData }) => {
                          if (success && imageData) {
                            setBiometricVerified(true);
                            setBiometricSelfie(imageData);
                            setShowLivenessCheck(false);
                            toast.success("Vérification biométrique réussie !");
                          } else {
                            setBiometricVerified(false);
                            setShowLivenessCheck(false);
                            toast.error("La vérification biométrique a échoué. Veuillez réessayer.");
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowLivenessCheck(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                      >
                        Démarrer la vérification biométrique
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Documents d'identité */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pièce d'identité (recto)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer rounded-md font-medium text-teal-600 hover:text-teal-500">
                          <span>Télécharger un fichier</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => setIdFront(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG jusqu'à 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pièce d'identité (verso)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer rounded-md font-medium text-teal-600 hover:text-teal-500">
                          <span>Télécharger un fichier</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => setIdBack(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG jusqu'à 5MB
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Justificatif de domicile
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer rounded-md font-medium text-teal-600 hover:text-teal-500">
                          <span>Télécharger un fichier</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*,application/pdf"
                            onChange={(e) => setAddressProof(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        Facture d'électricité, eau, etc. (PDF, PNG, JPG)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Coordonnées</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Adresse
                  </label>
                  <input
                    type="text"
                    {...register('address', { required: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    {...register('phone', { required: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register('email', { required: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Informations Professionnelles</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Catégories et spécialités
                  </label>
                  {loadingCategories ? (
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-teal-500 rounded-full"></div>
                      Chargement des catégories...
                    </div>
                  ) : (
                    <div className="mt-2 space-y-4 max-h-60 overflow-y-auto border rounded-md p-3">
                      {categories.length === 0 ? (
                        <p className="text-sm text-gray-500">Aucune catégorie disponible</p>
                      ) : (
                        categories.map(category => (
                          <div key={category.id} className="space-y-2">
                            <div className="font-medium text-gray-700">{category.name}</div>
                            <div className="ml-4 grid grid-cols-2 gap-2">
                              {category.subcategories?.map(subcat => (
                                <label key={subcat.id} className="flex items-center space-x-2">
                                  <input 
                                    type="checkbox"
                                    value={subcat.id}
                                    {...register('specialties')}
                                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                  />
                                  <span className="text-sm text-gray-700">{subcat.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {errors.specialties && (
                    <p className="mt-1 text-sm text-red-600">Veuillez sélectionner au moins une spécialité</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Années d'expérience
                  </label>
                  <input
                    type="number"
                    {...register('experienceYears', { required: true, min: 0 })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Portfolio
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer rounded-md font-medium text-teal-600 hover:text-teal-500">
                          <span>Télécharger des fichiers</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            multiple
                            onChange={(e) => setPortfolioFiles(Array.from(e.target.files || []))}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !idFront || !idBack || !biometricVerified}
                className="w-full mt-6 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
              >
                {loading ? 'Envoi en cours...' : 'Soumettre la demande'}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderRegistration;