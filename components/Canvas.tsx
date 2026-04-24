/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { RotateCcwIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from './icons';
import Spinner from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';
import { Compare } from './ui/compare';
import { OutfitSlotMachineLoader } from './EngagingLoader';

interface CanvasProps {
  displayImageUrl: string | null;
  onStartOver: () => void;
  isLoading: boolean;
  loadingMessage: string;
  onSelectPose: (index: number) => void;
  poseInstructions: string[];
  currentPoseIndex: number;
  availablePoseKeys: string[];
  isComparing: boolean;
  comparisonImageUrl: string | null;
  onExitCompare: () => void;
}

const Canvas: React.FC<CanvasProps> = ({ 
  displayImageUrl, 
  onStartOver, 
  isLoading, 
  loadingMessage, 
  onSelectPose, 
  poseInstructions, 
  currentPoseIndex, 
  availablePoseKeys,
  isComparing,
  comparisonImageUrl,
  onExitCompare
}) => {
  const [isPoseMenuOpen, setIsPoseMenuOpen] = useState(false);
  
  const handlePreviousPose = () => {
    if (isLoading || availablePoseKeys.length <= 1) return;

    const currentPoseInstruction = poseInstructions[currentPoseIndex];
    const currentIndexInAvailable = availablePoseKeys.indexOf(currentPoseInstruction);
    
    // Fallback if current pose not in available list (shouldn't happen)
    if (currentIndexInAvailable === -1) {
        onSelectPose((currentPoseIndex - 1 + poseInstructions.length) % poseInstructions.length);
        return;
    }

    const prevIndexInAvailable = (currentIndexInAvailable - 1 + availablePoseKeys.length) % availablePoseKeys.length;
    const prevPoseInstruction = availablePoseKeys[prevIndexInAvailable];
    const newGlobalPoseIndex = poseInstructions.indexOf(prevPoseInstruction);
    
    if (newGlobalPoseIndex !== -1) {
        onSelectPose(newGlobalPoseIndex);
    }
  };

  const handleNextPose = () => {
    if (isLoading) return;

    const currentPoseInstruction = poseInstructions[currentPoseIndex];
    const currentIndexInAvailable = availablePoseKeys.indexOf(currentPoseInstruction);

    // Fallback or if there are no generated poses yet
    if (currentIndexInAvailable === -1 || availablePoseKeys.length === 0) {
        onSelectPose((currentPoseIndex + 1) % poseInstructions.length);
        return;
    }
    
    const nextIndexInAvailable = currentIndexInAvailable + 1;
    if (nextIndexInAvailable < availablePoseKeys.length) {
        // There is another generated pose, navigate to it
        const nextPoseInstruction = availablePoseKeys[nextIndexInAvailable];
        const newGlobalPoseIndex = poseInstructions.indexOf(nextPoseInstruction);
        if (newGlobalPoseIndex !== -1) {
            onSelectPose(newGlobalPoseIndex);
        }
    } else {
        // At the end of generated poses, generate the next one from the master list
        const newGlobalPoseIndex = (currentPoseIndex + 1) % poseInstructions.length;
        onSelectPose(newGlobalPoseIndex);
    }
  };
  
  return (
    <div className="w-full flex-grow flex items-center justify-center p-4 relative animate-zoom-in group">
      {/* Start Over Button */}
      <button 
          onClick={onStartOver}
          className="absolute top-4 left-4 z-30 flex items-center justify-center text-center bg-white border border-primary-900 text-primary-900 font-bold py-2.5 px-4 transition-all duration-200 ease-in-out hover:bg-primary-900 hover:text-white active:scale-95 text-xs uppercase tracking-widest"
      >
          <RotateCcwIcon className="w-4 h-4 mr-2" />
          Start Over
      </button>

      <AnimatePresence mode="wait">
        {isComparing && comparisonImageUrl && displayImageUrl ? (
          <motion.div
            key="comparison-view"
            className="w-full h-full flex flex-col items-center justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={onExitCompare}
              className="absolute top-4 right-4 z-30 flex items-center justify-center text-center bg-white border border-primary-900 text-primary-900 font-bold py-2.5 px-4 transition-all duration-200 ease-in-out hover:bg-primary-900 hover:text-white active:scale-95 text-xs uppercase tracking-widest"
            >
              <XIcon className="w-4 h-4 mr-2" />
              Exit Compare
            </button>
            <div className="w-full h-full max-w-5xl aspect-[16/9] relative">
              <Compare
                firstImage={comparisonImageUrl}
                secondImage={displayImageUrl}
                className="w-full h-full bg-gray-200 border border-gray-200"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="single-view"
            className="relative w-full h-full flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {displayImageUrl ? (
              <AnimatePresence mode="wait">
                <motion.div
                    key={displayImageUrl}
                    className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden rounded-lg group/canvas cursor-default"
                    initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.98 }}
                    animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                    exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.98 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                    <img
                        src={displayImageUrl}
                        alt="Virtual try-on model"
                        className="max-w-full max-h-full object-contain shadow-2xl relative z-0"
                    />
                    
                    {/* Magical Swishing Mist Transition Layers */}
                    <motion.div 
                        className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-transparent via-white/40 to-transparent backdrop-blur-[2px]"
                        initial={{ x: '-100%', opacity: 1, skewX: -20 }}
                        animate={{ x: '150%', opacity: 0, skewX: -20 }}
                        transition={{ duration: 1.4, ease: 'easeInOut' }}
                    />
                    <motion.div 
                        className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-tr from-transparent via-primary-100/20 to-transparent"
                        initial={{ y: '100%', opacity: 0.8 }}
                        animate={{ y: '-100%', opacity: 0 }}
                        transition={{ duration: 1.8, ease: 'easeOut', delay: 0.1 }}
                    />
                </motion.div>
              </AnimatePresence>
            ) : (
                <div className="w-[400px] h-[600px] bg-gray-100 border border-gray-200 rounded-lg flex flex-col items-center justify-center">
                  <Spinner />
                  <p className="text-md font-serif text-gray-600 mt-4">Loading Model...</p>
                </div>
            )}
            
            <AnimatePresence>
              {isLoading && (
                  <motion.div
                      className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                  >
                      <OutfitSlotMachineLoader message={loadingMessage} />
                  </motion.div>
              )}
            </AnimatePresence>

            {/* Pose Controls */}
            {displayImageUrl && !isLoading && (
              <div 
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                onMouseEnter={() => setIsPoseMenuOpen(true)}
                onMouseLeave={() => setIsPoseMenuOpen(false)}
              >
                {/* Pose popover menu */}
                <AnimatePresence>
                    {isPoseMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute bottom-full mb-2 w-64 bg-white p-2 border border-primary-200"
                        >
                            <div className="grid grid-cols-2 gap-2">
                                {poseInstructions.map((pose, index) => (
                                    <button
                                        key={pose}
                                        onClick={() => onSelectPose(index)}
                                        disabled={isLoading || index === currentPoseIndex}
                                        className="w-full text-left text-xs font-bold uppercase text-primary-900 border border-gray-200 p-2 hover:bg-primary-900 hover:text-white disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {pose}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <div className="flex items-center justify-center gap-2 bg-white p-1.5 border border-primary-200">
                  <button 
                    onClick={handlePreviousPose}
                    aria-label="Previous pose"
                    className="p-2 border border-transparent hover:border-primary-900 active:bg-gray-100 transition-all disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <ChevronLeftIcon className="w-4 h-4 text-primary-900" />
                  </button>
                  <span className="text-xs font-bold uppercase text-primary-900 w-48 text-center truncate" title={poseInstructions[currentPoseIndex]}>
                    {poseInstructions[currentPoseIndex]}
                  </span>
                  <button 
                    onClick={handleNextPose}
                    aria-label="Next pose"
                    className="p-2 border border-transparent hover:border-primary-900 active:bg-gray-100 transition-all disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <ChevronRightIcon className="w-4 h-4 text-primary-900" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Canvas;