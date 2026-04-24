/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloudIcon, UserIcon, SparklesIcon } from './icons';
import { Compare } from './ui/compare';
import { generateModelImage } from '../services/geminiService';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';

interface StartScreenProps {
  onModelFinalized: (modelUrl: string, modelFile: File, isResumed?: boolean) => void;
  onImageUpload?: () => void;
  allowPreviousModel?: boolean;
}

const SparkleReveal = () => null; // AJIO doesn't use sparkles or magical gradients

const StartScreen: React.FC<StartScreenProps> = ({ onModelFinalized, onImageUpload, allowPreviousModel = true }) => {
  const [userImageFile, setUserImageFile] = useState<File | null>(null);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousModelUrl, setPreviousModelUrl] = useState<string | null>(null);
  
  useEffect(() => {
    try {
      const savedModel = localStorage.getItem('previousModelUrl');
      if (savedModel) {
        setPreviousModelUrl(savedModel);
      }
    } catch (error) {
      console.error("Could not read from localStorage", error);
    }
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
    }

    onImageUpload?.();
    setUserImageFile(file);
    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setUserImageUrl(dataUrl);
        setIsGenerating(true);
        setGeneratedModelUrl(null);
        setError(null);
        try {
            const result = await generateModelImage(file);
            setGeneratedModelUrl(result);
        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Failed to create model'));
            setUserImageUrl(null);
        } finally {
            setIsGenerating(false);
        }
    };
    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const usePreviousModel = async () => {
    if (previousModelUrl) {
        try {
            const response = await fetch(previousModelUrl);
            const blob = await response.blob();
            const file = new File([blob], 'previous-model.png', { type: blob.type });
            onModelFinalized(previousModelUrl, file, true);
        } catch (err) {
            setError("Could not load the previous model. Please upload a new photo.");
            localStorage.removeItem('previousModelUrl');
            setPreviousModelUrl(null);
        }
    }
  };

  const handleFinalize = () => {
      if (generatedModelUrl && userImageFile) {
          onModelFinalized(generatedModelUrl, userImageFile, false);
      }
  }

  const reset = () => {
    setUserImageFile(null);
    setUserImageUrl(null);
    setGeneratedModelUrl(null);
    setIsGenerating(false);
    setError(null);
  };

  const screenVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
    exit: { opacity: 0, x: 20 },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } },
  };

  const titleText = "Ajio’s Magical Mirror";
  const titleVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.5, // Stagger between lines
      },
    },
  };

  const lineVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05, // Stagger characters within a line
      },
    },
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'tween' as const,
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const sparkleSweepVariant = {
      hidden: { left: '-10%', opacity: 0 },
      visible: { 
          left: '110%', 
          opacity: [0, 1, 0.5, 0],
          transition: { duration: 1.2, ease: 'easeInOut' as const, delay: 1.35 }
      }
  }

  return (
    <AnimatePresence mode="wait">
      {!userImageUrl ? (
        <motion.div
          key="uploader"
          className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 lg:gap-16 p-8 lg:p-12 bg-white border border-gray-200"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          <div className="lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="max-w-lg">
              <div className="relative">
                <h1 className="text-4xl md:text-5xl font-extrabold text-primary-900 leading-tight tracking-tight uppercase">
                  AJIO<br/>Magic Mirror
                </h1>
              </div>
              <motion.p variants={itemVariants} className="mt-4 text-sm tracking-wide text-gray-600 uppercase">
                Step into a personalized styling experience. Create your AI model to get personalized recommendations and try on outfits instantly.
              </motion.p>
              <motion.hr variants={itemVariants} className="my-8 border-gray-200 w-full" />
              <motion.div variants={itemVariants} className="flex flex-col items-center lg:items-start w-full gap-4">
                <label
                    htmlFor="image-upload-start"
                    className="w-full relative flex items-center justify-center px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white bg-primary-900 cursor-pointer hover:bg-black transition-colors"
                >
                  <UploadCloudIcon className="w-5 h-5 mr-3" />
                  Upload Your Photo
                </label>
                {allowPreviousModel && previousModelUrl && (
                  <button
                    onClick={usePreviousModel}
                    className="w-full relative flex items-center justify-center px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-primary-900 bg-white border border-primary-900 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <UserIcon className="w-5 h-5 mr-3" />
                    Use Previous Model
                  </button>
                )}
                <input id="image-upload-start" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                <p className="text-gray-500 text-xs mt-2">Select a clear, full-body photo for the best results.</p>
                {error && <p className="text-red-600 text-xs font-bold uppercase mt-2">{error}</p>}
              </motion.div>
            </div>
          </div>
          <motion.div variants={itemVariants} className="w-full lg:w-1/2 flex flex-col items-center justify-start lg:pt-2">
             <div 
              className="relative p-1 bg-gray-50 border border-gray-200"
            >
              <Compare
                firstImage="https://i.postimg.cc/DZHrTz4R/Generated-Image-September-22-2025-1-34-PM.png"
                secondImage="https://i.postimg.cc/gJVzYSxd/image-1.png"
                slideMode="hover"
                className="w-full max-w-md aspect-[2/3] bg-gray-200"
              />
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="compare"
          className="w-full max-w-6xl mx-auto h-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 p-8 border border-gray-200 bg-white"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          <div className="md:w-1/2 flex-shrink-0 flex flex-col items-center md:items-start tracking-wide">
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-extrabold text-primary-900 leading-tight uppercase">
                Your AI Model Is Ready
              </h1>
              <p className="mt-3 text-sm text-gray-600">
                Drag the slider to compare. When you're ready, enter the Magic Mirror.
              </p>
            </div>
            
            {isGenerating && (
              <div className="flex items-center gap-3 text-sm text-primary-900 font-bold uppercase mt-8 border border-primary-200 bg-primary-50 p-4">
                <Spinner />
                <span>Generating your model...</span>
              </div>
            )}

            {error && 
              <div className="text-center md:text-left text-red-600 max-w-md mt-6 border border-red-200 bg-red-50 p-4">
                <p className="font-bold uppercase text-sm mb-1">Generation Failed</p>
                <p className="text-xs mb-3">{error}</p>
                <button onClick={reset} className="text-xs font-bold uppercase underline">Try Again</button>
              </div>
            }
            
            <AnimatePresence>
              {generatedModelUrl && !isGenerating && !error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full"
                >
                  <button 
                    onClick={reset}
                    className="w-full sm:w-auto px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-primary-900 bg-white border border-gray-300 hover:border-primary-900 hover:bg-gray-50 transition-colors"
                  >
                    Try Another Photo
                  </button>
                  <button 
                    onClick={handleFinalize}
                    className="w-full sm:w-auto px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white bg-primary-900 border border-primary-900 hover:bg-black transition-colors"
                  >
                    Enter Magic Mirror
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="md:w-1/2 w-full flex items-center justify-center">
            <div 
              className="relative p-1 border border-gray-200 bg-gray-50"
            >
              <Compare
                firstImage={userImageUrl}
                secondImage={generatedModelUrl ?? userImageUrl}
                slideMode="drag"
                className="w-[280px] h-[420px] sm:w-[320px] sm:h-[480px] lg:w-[400px] lg:h-[600px] bg-gray-200"
              />
              <AnimatePresence>
                {isGenerating && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px]"
                    >
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StartScreen;