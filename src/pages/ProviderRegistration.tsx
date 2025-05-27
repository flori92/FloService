import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Upload, Calendar, ShieldCheck, CheckCircle, ChevronRight, Lock, User, Loader } from 'lucide-react';
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
}

type FormStep = 'personal-info' | 'professional-info' | 'identity-verification' | 'biometric-check' | 'auto-validation' | 'set-password' | 'completed';

const ProviderRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, getValues } = useForm<RegistrationForm>();
  const [categories, setCategories] = useState<{id: string, name: string, subcategories: {id: string, name: string}[]}[]>([]);
  const [loading, setLoading] = useState(false);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [biometricSelfie, setBiometricSelfie] = useState<string | null>(null);
  const [showLivenessCheck, setShowLivenessCheck] = useState(false);
  const [currentStep, setCurrentStep] = useState<FormStep>('personal-info');
  const [autoValidationProgress, ] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const uploadFile = async (file: File | string | null, storagePath: string): Promise<string | null> => {
    if (!file) return null;
    if (typeof file === 'string') {
      const response = await fetch(file);
      const blob = await response.blob();
      const actualFile = new File([blob], "biometric_selfie.jpg", { type: blob.type });
      const fileName = `${Date.now()}-${actualFile.name}`;
      const { data, error } = await supabase.storage.from('provider-documents').upload(`${storagePath}/${fileName}`, actualFile);
      if (error) {
        console.error('Error uploading data URL file:', error);
        toast.error(`Erreur d'upload pour ${fileName}: ${error.message}`);
        return null;
      }
      return data?.path ? supabase.storage.from('provider-documents').getPublicUrl(data.path).data.publicUrl : null;
    }
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('provider-documents').upload(`${storagePath}/${fileName}`, file);
    if (error) {
      console.error('Error uploading file:', error);
      toast.error(`Erreur d'upload pour ${fileName}: ${error.message}`);
      return null;
    }
    return data?.path ? supabase.storage.from('provider-documents').getPublicUrl(data.path).data.publicUrl : null;
  };

  const handleSubmitLogic: SubmitHandler<RegistrationForm> = async (formData) => {
    try {
      setLoading(true);

      if (currentStep !== 'biometric-check') {
        setLoading(false);
        return;
      }

      if (!biometricVerified || !biometricSelfie) {
        toast.error("Veuillez compléter la vérification biométrique.");
        setLoading(false);
        return;
      }

      if (!idFront || !idBack || !addressProof) {
        toast.error("Veuillez télécharger tous les documents d'identité requis.");
        setLoading(false);
        return;
      }
      
      let effectiveUserId = userId;

      if (!effectiveUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          effectiveUserId = user.id;
        } else {
            toast.error("Utilisateur non identifié. Veuillez vous reconnecter.");
            setLoading(false);
            return;
        }
      }

      const idFrontUrl = await uploadFile(idFront, `identity/${effectiveUserId}/id_front`);
      const idBackUrl = await uploadFile(idBack, `identity/${effectiveUserId}/id_back`);
      const addressProofUrl = await uploadFile(addressProof, `identity/${effectiveUserId}/address_proof`);
      const biometricSelfieUrl = await uploadFile(biometricSelfie, `identity/${effectiveUserId}/biometric_selfie`);

      if (!idFrontUrl || !idBackUrl || !addressProofUrl || !biometricSelfieUrl) {
        toast.error("Erreur lors du téléversement d'un ou plusieurs documents d'identité.");
        setLoading(false);
        return;
      }

      const portfolioUrls = await Promise.all(
        portfolioFiles.map((file: File) => 
          uploadFile(file, `portfolios/${effectiveUserId}/${file.name}`)
        )
      );

      const { error: applicationError } = await supabase
        .from('provider_applications')
        .insert({
          user_id: effectiveUserId,
          full_name: formData.fullName,
          date_of_birth: formData.dateOfBirth,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          specialties: formData.specialties,
          experience_years: formData.experienceYears,
          id_front_url: idFrontUrl,
          id_back_url: idBackUrl,
          address_proof_url: addressProofUrl,
          biometric_selfie_url: biometricSelfieUrl,
          portfolio_urls: portfolioUrls.filter(url => url !== null) as string[],
          status: 'pending',
        })
        .select()
        .single();

      if (applicationError) throw applicationError;

      setCurrentStep('auto-validation');

    } catch (error: any) {
      console.error('Erreur lors de la soumission finale:', error);
      toast.error(error.message || "Une erreur est survenue lors de la soumission.");
    } finally {
      setLoading(false);
    }
  };

  const finalizeRegistration = async () => {
    setLoading(true);
    setPasswordError(''); // Réinitialiser les erreurs de mot de passe

    if (password.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères.');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    if (!userId) {
      toast.error("L'identifiant de l'utilisateur est manquant. Impossible de finaliser l'inscription.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('set_provider_password', {
        p_user_id: userId,
        p_password: password
      });

      if (error) throw error;

      if (data === true) { // La fonction RPC retourne un booléen
        toast.success('Votre compte prestataire a été créé avec succès!');
        setCurrentStep('completed');
        
        setTimeout(() => {
          navigate('/dashboard'); // Utilisation de navigate ici
        }, 3000);
      } else {
        toast.error('Une erreur inattendue est survenue lors de la finalisation.'); 
      }

    } catch (error: any) {
      console.error('Erreur lors de la finalisation de l’inscription:', error);
      const errorMessage = error.message || 'Une erreur est survenue lors de la définition du mot de passe.';
      if (error.details && typeof error.message === 'string' && error.details.includes(error.message)) {
        toast.error(error.message); 
      } else {
        toast.error(errorMessage);
      }
      setPasswordError(errorMessage); 
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select(`id, name, subcategories (id, name)`)
        .order('name', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error: unknown) {
      console.error('Erreur lors du chargement des catégories:', error);
      toast.error('Impossible de charger les catégories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
        }
    };
    if (!userId) {
        getCurrentUser();
    }
  }, [userId]);

  const goToNextStep = () => {
    switch (currentStep) {
      case 'personal-info':
        if (getValues('fullName') && getValues('dateOfBirth') && getValues('address') && getValues('phone') && getValues('email')) {
          setCurrentStep('professional-info');
        } else {
          toast.error('Veuillez remplir tous les champs personnels.');
        }
        break;
      case 'professional-info':
        if (getValues('specialties')?.length > 0 && getValues('experienceYears') !== undefined) {
          setCurrentStep('identity-verification');
        } else {
          toast.error('Veuillez remplir les informations professionnelles.');
        }
        break;
      case 'identity-verification':
        if (idFront && idBack && addressProof && biometricVerified) {
          setCurrentStep('biometric-check');
        } else {
          toast.error('Veuillez télécharger tous les documents et compléter la vérification biométrique.');
        }
        break;
      case 'biometric-check':
        handleSubmit(handleSubmitLogic)();
        break;
      default:
        break;
    }
  };

  const renderProgressSteps = () => {
    const steps = [
      { id: 'personal-info', name: 'Informations personnelles', icon: User },
      { id: 'professional-info', name: 'Informations professionnelles', icon: Calendar },
      { id: 'identity-verification', name: 'Vérification d\'identité', icon: Upload },
      { id: 'biometric-check', name: 'Vérification biométrique', icon: ShieldCheck },
      { id: 'set-password', name: 'Création du mot de passe', icon: Lock },
    ];

    return (
      <nav aria-label="Progress" className="mb-8">
        <ol className="space-y-4 md:flex md:space-y-0 md:space-x-8">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            let status = 'upcoming';
            
            if (currentStep === step.id) {
              status = 'current';
            } else if (
              (currentStep === 'professional-info' && step.id === 'personal-info') ||
              (currentStep === 'identity-verification' && ['personal-info', 'professional-info'].includes(step.id)) ||
              (currentStep === 'biometric-check' && ['personal-info', 'professional-info', 'identity-verification'].includes(step.id)) ||
              (currentStep === 'auto-validation' && ['personal-info', 'professional-info', 'identity-verification', 'biometric-check'].includes(step.id)) ||
              (currentStep === 'set-password' && ['personal-info', 'professional-info', 'identity-verification', 'biometric-check'].includes(step.id)) ||
              (currentStep === 'completed')
            ) {
              status = 'complete';
            }

            return (
              <li key={step.id} className="md:flex-1">
                <div className="group flex flex-col border-l-4 border-teal-600 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
                  <span className={`text-sm font-medium ${status === 'complete' ? 'text-teal-600' : status === 'current' ? 'text-teal-600' : 'text-gray-500'}`}>
                    Étape {index + 1}
                  </span>
                  <span className="text-sm font-medium flex items-center">
                    {status === 'complete' ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-teal-600 mr-2" />
                        {step.name}
                      </>
                    ) : (
                      <>
                        <StepIcon className="h-5 w-5 mr-2 text-gray-500" />
                        {step.name}
                      </>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumbs can go here if any */}
          <h1 className="text-3xl font-bold mb-6">Inscription Prestataire</h1>

          {renderProgressSteps()}

          <React.Fragment>
            {currentStep === 'auto-validation' && (
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <h2 className="text-xl font-semibold mb-6 text-center">Validation automatique en cours</h2>
                
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader className="animate-spin h-12 w-12 text-teal-600" />
                  
                  <div className="w-full max-w-md">
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-teal-600 bg-teal-200">
                            Progression
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold inline-block text-teal-600">
                            {autoValidationProgress}%
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-teal-200">
                        <div 
                          style={{ width: `${autoValidationProgress}%` }} 
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-teal-500 transition-all duration-500"
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-center max-w-md">
                    Nous vérifions votre identité et validons automatiquement votre compte...
                    <br/>Cette opération peut prendre jusqu'à 30 secondes.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 'set-password' && (
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Création de votre mot de passe</h2>
                <p className="mb-6 text-gray-600">
                  Votre identité a été vérifiée et votre compte est validé ! 
                  Veuillez créer un mot de passe pour finaliser votre inscription.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Confirmer le mot de passe
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                  
                  {passwordError && (
                    <p className="text-sm text-red-600">{passwordError}</p>
                  )}
                  
                  <button
                    type="button"
                    onClick={finalizeRegistration}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    disabled={loading}
                  >
                    {loading ? 'Finalisation...' : "Finaliser l'inscription"}
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'completed' && (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-4">Félicitations !</h2>
                <p className="mb-6 text-gray-600">
                  Votre compte prestataire a été créé avec succès. Vous allez être redirigé vers votre tableau de bord.
                </p>
                <div className="w-full max-w-md mx-auto">
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-teal-200">
                      <div className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-teal-500 w-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {['personal-info', 'professional-info', 'identity-verification', 'biometric-check'].includes(currentStep) && (
              <form onSubmit={handleSubmit(handleSubmitLogic)} className="space-y-8">
                {currentStep === 'personal-info' && (
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
                        {errors.phone && (
                          <p className="mt-1 text-sm text-red-600">Ce champ est requis</p>
                        )}
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
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">Ce champ est requis</p>
                        )}
                      </div>
                      
                      <div className="pt-5 flex justify-end">
                        <button
                          type="button"
                          onClick={goToNextStep}
                          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                        >
                          Continuer
                          <ChevronRight className="ml-2 -mr-1 h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 'identity-verification' && (
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Vérification d'identité</h2>
                    
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
                              PNG, JPG, PDF jusqu'à 5MB
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 'professional-info' && (
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
                          {categories.map(category => (
                            <optgroup key={category.id} label={category.name}>
                              {category.subcategories.map(subcategory => (
                                <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
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
                )}

                <div className="flex justify-between mt-8">
                  {currentStep !== 'personal-info' && (
                    <button
                      type="button"
                      onClick={() => {
                        switch (currentStep) {
                          case 'professional-info':
                            setCurrentStep('personal-info');
                            break;
                          case 'identity-verification':
                            setCurrentStep('professional-info');
                            break;
                          case 'biometric-check':
                            setCurrentStep('identity-verification');
                            break;
                        }
                      }}
                      className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                      Précédent
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="ml-auto px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                  >
                    {loading ? 'Chargement...' : currentStep === 'biometric-check' ? 'Valider et continuer' : 'Suivant'}
                  </button>
                </div>
              </form>
            )}
          </React.Fragment>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default ProviderRegistration;