import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Upload, Camera, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface RegistrationForm {
  fullName: string;
  dateOfBirth: string;
  address: string;
  phone: string;
  email: string;
  specialties: string[];
  experienceYears: number;
}

const ProviderRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<RegistrationForm>();
  const [loading, setLoading] = useState(false);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);

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
        uploadFile(addressProof, 'address-proofs'),
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
    } catch (error) {
      toast.error(error.message);
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
              <h2 className="text-xl font-semibold mb-4">Vérification d'Identité</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pièce d'identité (Recto)
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
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pièce d'identité (Verso)
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
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700">
                  Selfie avec pièce d'identité
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Camera className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer rounded-md font-medium text-teal-600 hover:text-teal-500">
                        <span>Prendre une photo</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          capture="user"
                          onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                        />
                      </label>
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
                            accept="image/*,.pdf"
                            onChange={(e) => setAddressProof(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
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
                    Spécialités
                  </label>
                  <select
                    multiple
                    {...register('specialties', { required: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  >
                    <option value="plomberie">Plomberie</option>
                    <option value="electricite">Électricité</option>
                    <option value="menuiserie">Menuiserie</option>
                    <option value="peinture">Peinture</option>
                    <option value="maconnerie">Maçonnerie</option>
                  </select>
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
                disabled={loading}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
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