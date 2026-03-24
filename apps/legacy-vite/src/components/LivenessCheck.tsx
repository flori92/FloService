import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, Check, AlertTriangle } from 'lucide-react';

interface LivenessCheckProps {
  onVerificationComplete: (result: { success: boolean; imageData?: string; }) => void;
}

const LivenessCheck: React.FC<LivenessCheckProps> = ({ onVerificationComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  // Le state detections est utilisé indirectement via setDetections dans la fonction detectFace
  const [, setDetections] = useState<any>(null);
  const [verificationStep, setVerificationStep] = useState<string>('waiting'); // 'waiting', 'blink', 'turn_left', 'turn_right', 'success', 'failed'
  const [blinkCount, setBlinkCount] = useState(0);
  // faceAngle est utilisé indirectement via setFaceAngle
  const [, setFaceAngle] = useState<number | null>(null);
  const [hasCompletedLeft, setHasCompletedLeft] = useState(false);
  // Explicitement lire hasCompletedRight pour éviter l'avertissement TypeScript
  const [hasCompletedRight, setHasCompletedRight] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = hasCompletedRight; // Forcer TypeScript à considérer la variable comme utilisée
  const [countdown, setCountdown] = useState(3);
  const [message, setMessage] = useState('Cliquez sur "Commencer" pour démarrer la vérification');

  // Charger les modèles nécessaires
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        
        // S'assurer que les modèles sont chargés une seule fois
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        
        setIsModelLoaded(true);
        console.log('Modèles chargés avec succès');
      } catch (error) {
        console.error('Erreur lors du chargement des modèles:', error);
      }
    };

    loadModels();

    // Nettoyer la vidéo quand le composant est démonté
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Démarrer la caméra
  const startVideo = async () => {
    if (!videoRef.current) return;
    
    try {
      const constraints = {
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: 'user'
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      setIsStarted(true);
      setVerificationStep('blink');
      setMessage('Veuillez cligner des yeux');
      
      // Démarrer la détection
      startDetection();
    } catch (error) {
      console.error('Erreur lors de l\'accès à la caméra:', error);
      setMessage('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
  };

  // Détecter le visage et les mouvements
  const startDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsChecking(true);
    
    const detectFace = async () => {
      if (!videoRef.current || !canvasRef.current || !isStarted) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      
      // Ajuster la taille du canvas à la vidéo
      faceapi.matchDimensions(canvas, displaySize);
      
      try {
        // Détecter le visage avec les landmarks et expressions
        const detections = await faceapi.detectSingleFace(video, 
          new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();
        
        if (detections) {
          setDetections(detections);
          
          // Dessiner les détections sur le canvas
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          
          // Vérifier les étapes de validation
          handleVerificationSteps(detections);
        } else {
          setDetections(null);
        }
      } catch (error) {
        console.error('Erreur lors de la détection:', error);
      }
      
      // Continuer la détection
      if (isChecking) {
        requestAnimationFrame(detectFace);
      }
    };
    
    detectFace();
  };

  // Gérer les différentes étapes de la vérification
  const handleVerificationSteps = (detection: any) => {
    // Vérification du clignement des yeux
    if (verificationStep === 'blink') {
      const leftEye = detection.landmarks.getLeftEye();
      const rightEye = detection.landmarks.getRightEye();
      
      // Calculer la hauteur et largeur des yeux pour détecter le clignement
      const leftEyeHeight = Math.abs(leftEye[1].y - leftEye[5].y);
      const leftEyeWidth = Math.abs(leftEye[0].x - leftEye[3].x);
      const rightEyeHeight = Math.abs(rightEye[1].y - rightEye[5].y);
      const rightEyeWidth = Math.abs(rightEye[0].x - rightEye[3].x);
      
      const leftEyeRatio = leftEyeHeight / leftEyeWidth;
      const rightEyeRatio = rightEyeHeight / rightEyeWidth;
      const eyeRatio = (leftEyeRatio + rightEyeRatio) / 2;
      
      // Si le ratio est inférieur à un seuil, les yeux sont fermés (clignement)
      if (eyeRatio < 0.2) {
        setBlinkCount(prev => prev + 1);
        
        // Si l'utilisateur a cligné 2 fois ou plus, passer à l'étape suivante
        if (blinkCount >= 2) {
          setVerificationStep('turn_left');
          setMessage('Tournez lentement la tête vers la gauche');
        }
      }
    }
    
    // Vérification de la rotation de la tête vers la gauche
    else if (verificationStep === 'turn_left') {
      // Obtenir les points du visage
      const jawline = detection.landmarks.getJawOutline();
      const nose = detection.landmarks.getNose();
      
      // Calculer l'angle de la tête en utilisant la position du nez par rapport à la mâchoire
      const jawCenter = {
        x: (jawline[0].x + jawline[jawline.length - 1].x) / 2,
        y: (jawline[0].y + jawline[jawline.length - 1].y) / 2
      };
      
      const nosePosition = nose[3]; // Point au milieu du nez
      
      // Calculer l'angle entre la verticale et la ligne nez-mâchoire
      const angle = Math.atan2(nosePosition.x - jawCenter.x, nosePosition.y - jawCenter.y) * (180 / Math.PI);
      setFaceAngle(angle);
      
      // Si l'angle dépasse un certain seuil négatif, l'utilisateur a tourné la tête vers la gauche
      if (angle < -15) {
        setHasCompletedLeft(true);
        setVerificationStep('turn_right');
        setMessage('Maintenant, tournez lentement la tête vers la droite');
      }
    }
    
    // Vérification de la rotation de la tête vers la droite
    else if (verificationStep === 'turn_right') {
      // Même calcul que pour la gauche
      const jawline = detection.landmarks.getJawOutline();
      const nose = detection.landmarks.getNose();
      
      const jawCenter = {
        x: (jawline[0].x + jawline[jawline.length - 1].x) / 2,
        y: (jawline[0].y + jawline[jawline.length - 1].y) / 2
      };
      
      const nosePosition = nose[3];
      const angle = Math.atan2(nosePosition.x - jawCenter.x, nosePosition.y - jawCenter.y) * (180 / Math.PI);
      setFaceAngle(angle);
      
      // Si l'angle dépasse un certain seuil positif, l'utilisateur a tourné la tête vers la droite
      if (angle > 15) {
        setHasCompletedRight(true);
        
        // Toutes les étapes sont complétées, vérification réussie
        if (hasCompletedLeft) {
          completeVerification(true);
        }
      }
    }
  };

  // Finaliser la vérification
  const completeVerification = (success: boolean) => {
    setIsChecking(false);
    
    if (success) {
      setVerificationStep('success');
      setMessage('Vérification réussie !');
      
      // Prendre une capture de la vidéo pour l'enregistrement
      const canvas = document.createElement('canvas');
      if (videoRef.current) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(
          videoRef.current, 0, 0, canvas.width, canvas.height
        );
        
        // Convertir le canvas en image data URL
        const imageData = canvas.toDataURL('image/jpeg');
        
        // Déclencher le callback avec le résultat
        onVerificationComplete({ success: true, imageData });
        
        // Lancer un compte à rebours pour fermer la vérification
        let count = 3;
        setCountdown(count);
        
        const timer = setInterval(() => {
          count--;
          setCountdown(count);
          
          if (count <= 0) {
            clearInterval(timer);
            stopCamera();
          }
        }, 1000);
      }
    } else {
      setVerificationStep('failed');
      setMessage('La vérification a échoué. Veuillez réessayer.');
      onVerificationComplete({ success: false });
    }
  };

  // Arrêter la caméra
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      
      videoRef.current.srcObject = null;
      setIsStarted(false);
      setIsChecking(false);
    }
  };

  // Réinitialiser et redémarrer la vérification
  const restartVerification = () => {
    setVerificationStep('waiting');
    setBlinkCount(0);
    setFaceAngle(null);
    setHasCompletedLeft(false);
    setHasCompletedRight(false);
    setMessage('Cliquez sur "Commencer" pour démarrer la vérification');
    stopCamera();
  };

  return (
    <div className="relative flex flex-col items-center justify-center border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-medium text-gray-900">Vérification d'identité</h3>
        <p className="text-sm text-gray-600 mt-1">
          {message}
        </p>
      </div>
      
      <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden">
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted
          className={`w-full h-full object-cover ${!isStarted ? 'hidden' : ''}`}
          onPlay={() => setIsStarted(true)}
        />
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 left-0 w-full h-full"
        />
        
        {!isStarted && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="text-white opacity-50 w-20 h-20" />
          </div>
        )}
        
        {verificationStep === 'success' && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-50">
            <div className="text-white text-center">
              <Check className="mx-auto w-16 h-16 mb-2" />
              <p className="text-xl font-bold">Vérification réussie!</p>
              <p>Fermeture dans {countdown}s...</p>
            </div>
          </div>
        )}
        
        {verificationStep === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-50">
            <div className="text-white text-center">
              <AlertTriangle className="mx-auto w-16 h-16 mb-2" />
              <p className="text-xl font-bold">Échec de la vérification</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex space-x-3">
        {!isStarted ? (
          <button
            type="button"
            onClick={startVideo}
            disabled={!isModelLoaded}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isModelLoaded ? 'Commencer' : 'Chargement...'}
          </button>
        ) : (
          <>
            {verificationStep === 'failed' && (
              <button
                type="button"
                onClick={restartVerification}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                Réessayer
              </button>
            )}
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Annuler
            </button>
          </>
        )}
      </div>
      
      {/* Aide et instructions */}
      <div className="mt-4 text-sm text-gray-500 p-3 bg-gray-100 rounded-md">
        <p className="font-medium mb-1">Instructions :</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Assurez-vous d'être dans un environnement bien éclairé</li>
          <li>Placez votre visage clairement dans le cadre</li>
          <li>Suivez les instructions à l'écran (cligner des yeux, tourner la tête)</li>
          <li>Restez immobile pendant la vérification</li>
        </ol>
      </div>
    </div>
  );
};

export default LivenessCheck;
