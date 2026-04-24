/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisResult, WardrobeItem, GeneratedOutfit, CartItem } from '../types';
import { View } from '../App';
import { generateOutfitsForEvent, generateOutfitImage } from '../services/geminiService';
import { allWardrobeItems } from '../wardrobe';
import { getFriendlyErrorMessage } from '../lib/utils';
import { StitchCardLoader } from './EngagingLoader';
import { SparklesIcon, ShoppingBagIcon, HeartIcon, XIcon, RotateCcwIcon } from './icons';
import { ProductCard } from './ProductCard';

// --- Outfit Detail Modal ---
interface OutfitDetailModalProps {
    outfit: GeneratedOutfit;
    onClose: () => void;
    wishlist: WardrobeItem[];
    cartItems: CartItem[];
    onAddToWishlist: (item: WardrobeItem) => void;
    onAddToCart: (item: WardrobeItem) => void;
    onRemoveFromBag: (itemId: string) => void;
}

const OutfitDetailModal: React.FC<OutfitDetailModalProps> = ({ outfit, onClose, ...productCardProps }) => {
    const wishlistIds = useMemo(() => new Set(productCardProps.wishlist.map(item => item.id)), [productCardProps.wishlist]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 relative flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-gray-800">{outfit.outfitName}</h2>
                        <p className="text-sm text-gray-500">{outfit.items.length} items &bull; Total: ₹{outfit.totalCost.toLocaleString('en-IN')}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto p-1">
                    {outfit.items.map(item => (
                        <ProductCard
                            key={item.id}
                            item={item}
                            isWishlisted={wishlistIds.has(item.id)}
                            onAddToWishlist={productCardProps.onAddToWishlist}
                            onAddToBag={productCardProps.onAddToCart}
                            onRemoveFromBag={productCardProps.onRemoveFromBag}
                            cartItems={productCardProps.cartItems}
                        />
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};


// --- Generated Outfit Card ---

interface GeneratedOutfitCardProps {
    outfit: GeneratedOutfit;
    onSelect: () => void;
    onAddOutfitToBag: (outfit: GeneratedOutfit) => void;
    onWishlistOutfit: (outfit: GeneratedOutfit) => void;
    onTryOnOutfit: (outfit: GeneratedOutfit) => void;
}

const GeneratedOutfitCard: React.FC<GeneratedOutfitCardProps> = ({ outfit, onSelect, onAddOutfitToBag, onWishlistOutfit, onTryOnOutfit }) => {
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="rounded-lg shadow-lg border border-gray-200/80 overflow-hidden bg-white"
        >
            <div className="relative aspect-square w-full bg-gray-100 flex items-center justify-center cursor-pointer group" onClick={onSelect}>
                {outfit.generatingPreview ? (
                    <StitchCardLoader message="Styling..." />
                ) : outfit.previewUrl ? (
                    <img src={outfit.previewUrl} alt={outfit.outfitName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="text-center text-gray-500 p-4">Image not available.</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                 {outfit.isHighlyRecommended && (
                    <div className="absolute top-3 left-3 bg-primary-900 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        <SparklesIcon className="w-3 h-3"/> Stylist Pick
                    </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="text-lg font-serif font-bold">{outfit.outfitName}</h3>
                    <p className="text-sm font-semibold">₹{outfit.totalCost.toLocaleString('en-IN')}</p>
                </div>
            </div>
            <div className="p-4 bg-white">
                <p className="text-sm text-gray-600 italic mb-3">&ldquo;{outfit.stylistNotes}&rdquo;</p>
                 <div className="flex flex-col gap-2">
                    <button
                        onClick={() => onAddOutfitToBag(outfit)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-primary-900 rounded-md hover:bg-black transition-colors"
                    >
                        <ShoppingBagIcon className="w-4 h-4" /> Add All to Bag
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onTryOnOutfit(outfit)}
                            className="flex-grow flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                        >
                             <SparklesIcon className="w-4 h-4"/> Try On
                        </button>
                        <button
                             onClick={() => onWishlistOutfit(outfit)}
                            className="flex-grow flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                        >
                            <HeartIcon className="w-4 h-4" /> Wishlist All
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};


// --- Main Component ---

interface EventStylistViewProps {
    analysis: AnalysisResult | null;
    onNavigate: (view: View) => void;
    wishlist: WardrobeItem[];
    onAddToWishlist: (item: WardrobeItem) => void;
    cartItems: CartItem[];
    onAddToBag: (item: WardrobeItem) => void;
    onRemoveFromBag: (itemId: string) => void;
    onTryOnOutfit: (outfit: GeneratedOutfit) => void;
    onAddOutfitToBag: (outfit: GeneratedOutfit) => void;
    onWishlistOutfit: (outfit: GeneratedOutfit) => void;
}

const EventStylistView: React.FC<EventStylistViewProps> = (props) => {
    const [theme, setTheme] = useState('');
    const [budget, setBudget] = useState<number | string>(5000);
    const [userPreferences, setUserPreferences] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedOutfits, setGeneratedOutfits] = useState<GeneratedOutfit[]>([]);
    const [selectedOutfit, setSelectedOutfit] = useState<GeneratedOutfit | null>(null);
    
    const suggestedThemes = ["Beach Vacation", "Formal Wedding", "Casual Brunch", "Office Party"];

    const handleGenerateOutfits = async () => {
        if (!theme || !props.analysis || !budget) return;
        
        setIsLoading(true);
        setError(null);
        setGeneratedOutfits([]);
        setSelectedOutfit(null);

        try {
            const budgetNumber = typeof budget === 'string' ? parseFloat(budget) : budget;
            if (isNaN(budgetNumber)) {
                setError("Please enter a valid budget amount.");
                setIsLoading(false);
                return;
            }

            const outfitCompositions = await generateOutfitsForEvent(theme, budgetNumber, props.analysis, allWardrobeItems, userPreferences);
            
            const outfitsWithPlaceholders = outfitCompositions.map((comp, index) => {
                const items = comp.itemIds.map(id => allWardrobeItems.find(item => item.id === id)).filter((i): i is WardrobeItem => !!i);
                return {
                    ...comp,
                    id: `outfit-${Date.now()}-${index}`,
                    items,
                    previewUrl: null,
                    generatingPreview: true,
                };
            });
            setGeneratedOutfits(outfitsWithPlaceholders);
            
            // Unblock the main UI immediately so the user can see the text/product suggestions 
            // while the heavy image generation runs in the background.
            setIsLoading(false);

            // Run the image generations sequentially to prevent crushing the API, 
            // which often hangs when handling 4 simultaneous parallel generation requests.
            for (const outfit of outfitsWithPlaceholders) {
                try {
                    if (outfit.items.length === 0) throw new Error("No items to generate image for.");
                    const imageUrl = await generateOutfitImage(outfit.items);
                    setGeneratedOutfits(prev => prev.map(o => o.id === outfit.id ? { ...o, previewUrl: imageUrl, generatingPreview: false } : o));
                } catch (imgErr) {
                    console.error(`Failed to generate image for outfit ${outfit.outfitName}:`, imgErr);
                    setGeneratedOutfits(prev => prev.map(o => o.id === outfit.id ? { ...o, generatingPreview: false } : o));
                }
            }

        } catch (err) {
            setError(getFriendlyErrorMessage(err, "Failed to generate outfits"));
            setIsLoading(false);
        }
    };

    if (!props.analysis) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-8 bg-white">
                <SparklesIcon className="w-16 h-16 text-primary-300 mb-4" />
                <h1 className="text-3xl font-serif font-bold text-gray-800">Unlock Your Personal Stylist</h1>
                <p className="mt-2 text-gray-600 max-w-md">
                    To get outfits tailored just for you, please complete your AI Style Profile in the Magic Mirror first.
                </p>
                <button
                    onClick={() => props.onNavigate('magic_mirror')}
                    className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-semibold rounded-md shadow-sm text-white bg-primary-900 hover:bg-black"
                >
                    Go to Magic Mirror
                </button>
            </div>
        );
    }

    return (
        <div className="w-full bg-gray-50 flex-grow relative">
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        key="loading-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center"
                    >
                        <StitchCardLoader message="Curating outfits just for you..." />
                    </motion.div>
                )}
            </AnimatePresence>
             <AnimatePresence>
                {selectedOutfit && (
                    <OutfitDetailModal
                        outfit={selectedOutfit}
                        onClose={() => setSelectedOutfit(null)}
                        wishlist={props.wishlist}
                        cartItems={props.cartItems}
                        onAddToWishlist={props.onAddToWishlist}
                        onAddToCart={props.onAddToBag}
                        onRemoveFromBag={props.onRemoveFromBag}
                    />
                )}
            </AnimatePresence>

            <div className={`w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 transition-all duration-300 ${isLoading ? 'blur-sm pointer-events-none' : ''}`}>
                
                {/* Show start form only when no outfits are generated */}
                {generatedOutfits.length === 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
                    
                        <div className="lg:col-span-1">
                            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200/80">
                                <h2 className="text-2xl font-serif font-bold text-gray-800 mb-6">Create Your Look</h2>
                                <div className="space-y-6">
                                    <div>
                                        <label htmlFor="event-theme" className="text-sm font-semibold text-gray-700 mb-1.5 block">What's the occasion?</label>
                                        <input
                                            id="event-theme"
                                            type="text"
                                            value={theme}
                                            onChange={(e) => setTheme(e.target.value)}
                                            placeholder="e.g., Summer beach wedding"
                                            className="block w-full rounded-md bg-white text-gray-800 placeholder-gray-400 px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-primary-500"
                                        />
                                        <div className="pt-3 flex flex-wrap gap-2">
                                            {suggestedThemes.map((suggestion) => (
                                                <button key={suggestion} onClick={() => setTheme(suggestion)} className="px-3 py-1 text-xs font-medium text-primary-700 bg-primary-100/60 border border-primary-200 rounded-full hover:bg-primary-100 transition-colors">
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="event-budget" className="text-sm font-semibold text-gray-700 mb-1.5 block">What's your budget? (₹)</label>
                                        <input
                                            id="event-budget"
                                            type="number"
                                            value={budget}
                                            onChange={(e) => setBudget(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                }
                                            }}
                                            placeholder="e.g., 15000"
                                            className="block w-full rounded-md bg-white text-gray-800 placeholder-gray-400 px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="user-preferences" className="text-sm font-semibold text-gray-700 mb-1.5 block">Any specific requests?</label>
                                        <textarea
                                            id="user-preferences"
                                            value={userPreferences}
                                            onChange={(e) => setUserPreferences(e.target.value)}
                                            placeholder="e.g., I don't like hats, prefer muted colors..."
                                            rows={2}
                                            className="block w-full rounded-md bg-white text-gray-800 placeholder-gray-400 px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleGenerateOutfits}
                                    disabled={isLoading || !theme.trim() || !budget}
                                    className="w-full mt-8 flex items-center justify-center gap-2 px-8 py-3 text-base font-semibold text-white bg-primary-900 rounded-md hover:bg-black transition-all duration-300 transform hover:scale-105 disabled:bg-primary-300 disabled:cursor-not-allowed disabled:scale-100 shadow-lg"
                                >
                                    <SparklesIcon className="w-5 h-5"/>
                                    Generate My Outfits
                                </button>
                            </div>
                        </div>

                        <div className="lg:col-span-1 flex flex-col justify-center">
                            <motion.div
                                className="w-full max-w-md mx-auto"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                            >
                                <img 
                                    src="https://thumbs2.imgbox.com/fe/42/xzNCyy9m_t.png" 
                                    alt="Stylish outfits on a clothing rack" 
                                    className="rounded-lg shadow-xl mb-6 w-full max-h-64 object-cover"
                                />
                            </motion.div>
                            <motion.div
                                className="w-full max-w-md mx-auto"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                            >
                                <h2 className="text-3xl font-serif font-medium text-gray-900 leading-tight">
                                    The Perfect Outfit<br/>
                                    for Every Occasion.<br/>
                                    And Every Wallet.
                                </h2>
                                <p className="mt-4 text-base text-gray-700 leading-relaxed">
                                    Wedding guest on a budget? Brunch date with nothing to wear? Stop the stress. Just set your event and price point, and we'll deliver a personalized style edit in seconds.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                )}

                {/* Show context panel and outfits when generated */}
                {!isLoading && generatedOutfits.length > 0 && (
                    <>
                        <div className="mb-8 bg-white border-2 border-primary-200 rounded-lg p-6 flex items-start justify-between shadow-sm">
                            <div className="flex-1">
                                <h3 className="text-xl font-serif font-bold text-gray-900 mb-3 tracking-tight">Your Personalized Outfits</h3>
                                <div className="space-y-1.5 text-sm text-gray-700">
                                    <p className="flex items-start">
                                        <span className="font-semibold text-gray-800 min-w-[100px]">Occasion:</span>
                                        <span className="text-gray-600">{theme}</span>
                                    </p>
                                    <p className="flex items-start">
                                        <span className="font-semibold text-gray-800 min-w-[100px]">Budget:</span>
                                        <span className="text-gray-600">Under ₹{typeof budget === 'string' ? parseFloat(budget).toLocaleString('en-IN') : budget.toLocaleString('en-IN')}</span>
                                    </p>
                                    {userPreferences && (
                                        <p className="flex items-start">
                                            <span className="font-semibold text-gray-800 min-w-[100px]">Preferences:</span>
                                            <span className="text-gray-600">{userPreferences}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setGeneratedOutfits([]);
                                    setSelectedOutfit(null);
                                    setError(null);
                                }}
                                className="ml-6 flex items-center justify-center bg-white border border-gray-300 text-gray-800 font-bold py-2.5 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-gray-100 hover:border-gray-400 active:scale-95 text-xs uppercase tracking-wider"
                            >
                                <RotateCcwIcon className="w-4 h-4 mr-2" />
                                Start Over
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {generatedOutfits.map(outfit => (
                                <GeneratedOutfitCard
                                    key={outfit.id}
                                    outfit={outfit}
                                    onSelect={() => setSelectedOutfit(outfit)}
                                    onAddOutfitToBag={props.onAddOutfitToBag}
                                    onWishlistOutfit={props.onWishlistOutfit}
                                    onTryOnOutfit={props.onTryOnOutfit}
                                />
                            ))}
                        </div>
                    </>
                )}
                
                {error && (
                    <div className="text-center py-16 text-red-600 bg-red-50 p-4 rounded-lg">
                        <h3 className="font-bold">Oops! Something went wrong.</h3>
                        <p>{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventStylistView;
