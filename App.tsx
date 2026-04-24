/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, get } from 'firebase/database';
import { db } from './firebaseConfig';
import StartScreen from './components/StartScreen';
import { StylistResult, Crew, ChatMessage, SharedWishlistItem, WardrobeItem, AnalysisResult, CartItem, SavedOutfit, ChatbotContext, GeneratedOutfit } from './types';
import { allWardrobeItems } from './wardrobe';
import Header from './components/Header';
import { getFriendlyErrorMessage, searchProductsAndCategories } from './lib/utils';
import { getStylistRecommendations } from './services/geminiService';
import CrewSetup from './components/CrewSetup';
import CrewStudio from './components/CrewStudio';
import MagicMirrorView from './components/MagicMirrorView';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import { HeartIcon, HeartIconFilled, XIcon, SparklesIcon, MessageSquareIcon, PaperAirplaneIcon, ImageIcon, StarIcon, ShoppingBagIcon, Trash2Icon, PlusIcon, ChevronDownIcon, SearchIcon, UsersIcon, DressIcon, AccessoriesIcon } from './components/icons';
import FeatureHero from './components/FeatureHero';
import Chatbot from './components/Chatbot';
import OutfitsView from './components/OutfitsView';
import BagSidepanel from './components/BagSidepanel';
import { cn } from './lib/utils';
import { ProductCard } from './components/ProductCard';
import EventStylistView from './components/EventStylistView';

// --- PersonalizedRecommendationBar Component ---
const PersonalizedRecommendationBar = ({ analysis, onFilterChange }: {
    analysis: AnalysisResult;
    onFilterChange: (filters: { colors: string[]; categories: string[] }) => void;
}) => {
    const [colorFilterActive, setColorFilterActive] = useState(false);
    const [bodyTypeFilterActive, setBodyTypeFilterActive] = useState(false);

    const handleColorFilterToggle = () => {
        const newState = !colorFilterActive;
        setColorFilterActive(newState);
        
        if (newState) {
            // Apply color filter
            const recommendedColorNames = analysis.recommendedColors.map(color => color.name);
            onFilterChange({ colors: recommendedColorNames, categories: [] });
            setBodyTypeFilterActive(false); // Disable other filter
        } else {
            // Remove filter
            onFilterChange({ colors: [], categories: [] });
        }
    };

    const handleBodyTypeFilterToggle = () => {
        const newState = !bodyTypeFilterActive;
        setBodyTypeFilterActive(newState);
        
        if (newState) {
            // Apply body type filter
            const bodyTypeToCategories: { [key: string]: string[] } = {
                'rectangle': ['blazers', 'tops', 'dresses'],
                'pear': ['tops', 'blazers', 'dresses'],
                'apple': ['dresses', 'tops', 'blazers'],
                'hourglass': ['dresses', 'tops', 'blazers'],
                'inverted triangle': ['pants', 'skirts', 'dresses'],
            };
            
            const categories = bodyTypeToCategories[analysis.bodyType.toLowerCase()] || [];
            onFilterChange({ colors: [], categories });
            setColorFilterActive(false); // Disable other filter
        } else {
            // Remove filter
            onFilterChange({ colors: [], categories: [] });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200"
        >
            <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-bold text-primary-800">Your AI Style Profile</h2>
            </div>
            
            {/* Body Type and Skin Tone Row */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Body Type</h3>
                    <p className="text-sm text-gray-800 font-semibold">{analysis.bodyType}</p>
                </div>
                <div>
                    <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Skin Tone</h3>
                    <p className="text-sm text-gray-800 font-semibold">{analysis.skinTone}</p>
                </div>
            </div>

            {/* Smart Filters Section */}
            <div className="border-t border-gray-200 pt-3">
                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">Smart Filters</h3>
                
                <div className="grid grid-cols-2 gap-6">
                    {/* Complements my skin filter */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                type="checkbox"
                                id="colorFilter"
                                checked={colorFilterActive}
                                onChange={handleColorFilterToggle}
                                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                            />
                            <label htmlFor="colorFilter" className="text-sm text-gray-700 cursor-pointer">
                                Complements my skin
                            </label>
                        </div>
                        <div className="flex gap-2 ml-6">
                            {analysis.recommendedColors.slice(0, 6).map(colorInfo => (
                                <div
                                    key={colorInfo.hex}
                                    className="w-5 h-5 rounded-full border border-gray-300"
                                    style={{ backgroundColor: colorInfo.hex }}
                                    title={colorInfo.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Filter according to body shape */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                type="checkbox"
                                id="bodyTypeFilter"
                                checked={bodyTypeFilterActive}
                                onChange={handleBodyTypeFilterToggle}
                                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                            />
                            <label htmlFor="bodyTypeFilter" className="text-sm text-gray-700 cursor-pointer">
                                Filter according to body shape
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};


export type View =
    'welcome' |
    'products' |
    'magic_mirror' |
    'wishlist' |
    'search' |
    'crew_setup' |
    'crew_studio' |
    'outfits' |
    'accessories' |
    'event_stylist';

// --- Sub-Components for Different Views ---

const WelcomeView = ({ onSelectGender, onNavigate, promptForGender }: { onSelectGender: (gender: 'men' | 'women') => void; onNavigate: (view: View) => void; promptForGender?: boolean }) => (
  <div className="w-full flex-grow flex flex-col items-center bg-white">
    <FeatureHero onNavigate={onNavigate} />
    <div 
      className="w-full flex flex-col items-center justify-center p-4 py-20 relative bg-ajio-cream"
    >
      <AnimatePresence>
        {promptForGender && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-8 p-4 bg-white border border-primary-200 text-center"
            >
                <p className="text-sm font-semibold text-primary-900 uppercase tracking-wider">Please select a collection to continue.</p>
            </motion.div>
        )}
      </AnimatePresence>
      <div className="text-center mb-14 relative z-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary-900 leading-tight tracking-tight uppercase">
          Start Exploring
        </h1>
        <p className="mt-3 text-base text-gray-500 tracking-wide">Pick a collection to begin your journey.</p>
      </div>
      <div className="flex flex-col md:flex-row gap-6 relative z-10">
        <motion.div 
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden cursor-pointer border border-gray-200 hover:border-primary-900 transition-colors"
          onClick={() => onSelectGender('women')}
        >
          <img src="https://i.postimg.cc/5NjjPddL/women.jpg-full" className="md:w-80 h-96 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">Women</h2>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden cursor-pointer border border-gray-200 hover:border-primary-900 transition-colors"
          onClick={() => onSelectGender('men')}
        >
          <img src="https://i.postimg.cc/g28z5GMz/men.jpg" alt="Men's Collection" className="w-full md:w-80 h-96 object-cover" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">Men</h2>
          </div>
        </motion.div>
      </div>
    </div>
  </div>
);

const AccessoriesView = ({ products, onAddToWishlist, wishlist, onAddToBag, cartItems, onRemoveFromBag }: {
    products: WardrobeItem[],
    onAddToWishlist: (item: WardrobeItem) => void,
    wishlist: WardrobeItem[],
    onAddToBag: (item: WardrobeItem) => void,
    cartItems: CartItem[],
    onRemoveFromBag: (itemId: string) => void,
}) => {
    const [filters, setFilters] = useState<{ colors: string[]; categories: string[] }>({ colors: [], categories: [] });
    const [sortOption, setSortOption] = useState('default');
    const wishlistIds = useMemo(() => new Set(wishlist.map(item => item.id)), [wishlist]);

    const filteredProducts = useMemo(() => {
        let filtered = products.filter(p => p.category === 'accessories');

        if (filters.colors.length > 0) {
            filtered = filtered.filter(p => filters.colors.includes(p.color));
        }
        if (filters.categories.length > 0) {
            filtered = filtered.filter(p => p.subcategory && filters.categories.includes(p.subcategory));
        }

        return filtered.sort((a, b) => {
            if (sortOption === 'price-asc') return parseFloat(a.price.replace('₹', '')) - parseFloat(b.price.replace('₹', ''));
            if (sortOption === 'price-desc') return parseFloat(b.price.replace('₹', '')) - parseFloat(a.price.replace('₹', ''));
            if (sortOption === 'rating-desc') return (b.rating?.value ?? 0) - (a.rating?.value ?? 0);
            return 0;
        });
    }, [products, filters, sortOption]);

    return (
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold font-serif text-gray-900">Accessories</h1>
            <FilterPanel products={products} filters={filters} onFilterChange={setFilters} sortOption={sortOption} onSortChange={setSortOption} categorySourceKey="subcategory" />
            <motion.div
                layout
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10"
            >
                <AnimatePresence>
                    {filteredProducts.map(item => (
                        <ProductCard
                            key={item.id}
                            item={item}
                            isWishlisted={wishlistIds.has(item.id)}
                            onAddToWishlist={onAddToWishlist}
                            onAddToBag={onAddToBag}
                            onRemoveFromBag={onRemoveFromBag}
                            cartItems={cartItems}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

// --- WishlistView Component ---
const WishlistView = ({ wishlist, onRemoveFromWishlist, onMoveToCart, cartItems, onRemoveFromBag }: {
    wishlist: WardrobeItem[],
    onRemoveFromWishlist: (item: WardrobeItem) => void,
    onMoveToCart: (item: WardrobeItem) => void,
    cartItems: CartItem[],
    onRemoveFromBag: (itemId: string) => void,
}) => (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold font-serif text-gray-900">My Wishlist</h1>
        {wishlist.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 mt-8">
                {wishlist.map((item) => (
                    <ProductCard
                        key={item.id}
                        item={item}
                        isWishlisted={true}
                        onAddToWishlist={onRemoveFromWishlist}
                        onMoveToCart={onMoveToCart}
                        onRemoveFromBag={onRemoveFromBag}
                        cartItems={cartItems}
                    />
                ))}
            </div>
        ) : (
            <div className="text-center py-20">
                 <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                    <HeartIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="mt-4 text-lg font-medium text-gray-900">Your wishlist is empty</h2>
                <p className="mt-1 text-sm text-gray-500">Add your favorite items to your wishlist to see them here.</p>
            </div>
        )}
    </div>
);


// --- SearchResultsView component ---
const SearchResultsView = ({ query, products, onAddToWishlist, wishlist, onAddToBag, cartItems, onRemoveFromBag }: {
    query: string,
    products: WardrobeItem[],
    onAddToWishlist: (item: WardrobeItem) => void,
    wishlist: WardrobeItem[],
    onAddToBag: (item: WardrobeItem) => void,
    cartItems: CartItem[],
    onRemoveFromBag: (itemId: string) => void,
}) => {
    const wishlistIds = useMemo(() => new Set(wishlist.map(item => item.id)), [wishlist]);
    const { products: searchResults } = searchProductsAndCategories(query, products, 100);

    return (
         <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold font-serif text-gray-900">Search results for "{query}"</h1>
            <p className="text-sm text-gray-500 mt-1">{searchResults.length} items found</p>
            {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 mt-8">
                    {searchResults.map((item) => (
                        <ProductCard
                            key={item.id}
                            item={item}
                            isWishlisted={wishlistIds.has(item.id)}
                            onAddToWishlist={onAddToWishlist}
                            onAddToBag={onAddToBag}
                            onRemoveFromBag={onRemoveFromBag}
                            cartItems={cartItems}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <p>No products found matching your search.</p>
                </div>
            )}
        </div>
    )
};


const ProductsView = ({ products, onAddToWishlist, wishlist, onAddToBag, cartItems, onRemoveFromBag, analysis }: {
    products: WardrobeItem[],
    onAddToWishlist: (item: WardrobeItem) => void,
    wishlist: WardrobeItem[],
    onAddToBag: (item: WardrobeItem) => void,
    cartItems: CartItem[],
    onRemoveFromBag: (itemId: string) => void,
    analysis?: AnalysisResult | null,
}) => {
    const [filters, setFilters] = useState<{ colors: string[]; categories: string[] }>({ colors: [], categories: [] });
    const [sortOption, setSortOption] = useState('default');
    const wishlistIds = useMemo(() => new Set(wishlist.map(item => item.id)), [wishlist]);

    const filteredProducts = useMemo(() => {
        let filtered = products;

        if (filters.colors.length > 0) {
            filtered = filtered.filter(p => filters.colors.includes(p.color));
        }
        if (filters.categories.length > 0) {
            filtered = filtered.filter(p => filters.categories.includes(p.category));
        }

        return filtered.sort((a, b) => {
            if (sortOption === 'price-asc') return parseFloat(a.price.replace('₹', '')) - parseFloat(b.price.replace('₹', ''));
            if (sortOption === 'price-desc') return parseFloat(b.price.replace('₹', '')) - parseFloat(a.price.replace('₹', ''));
            if (sortOption === 'rating-desc') return (b.rating?.value ?? 0) - (a.rating?.value ?? 0);
            return 0;
        });
    }, [products, filters, sortOption]);

    return (
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold font-serif text-gray-900 capitalize">{products[0]?.gender}'s Collection</h1>
            
            {analysis && (
                <PersonalizedRecommendationBar 
                    analysis={analysis} 
                    onFilterChange={setFilters}
                />
            )}
            
            <FilterPanel products={products} filters={filters} onFilterChange={setFilters} sortOption={sortOption} onSortChange={setSortOption}/>
            <motion.div
                layout
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10"
            >
                <AnimatePresence>
                    {filteredProducts.map(item => (
                        <ProductCard
                            key={item.id}
                            item={item}
                            isWishlisted={wishlistIds.has(item.id)}
                            onAddToWishlist={onAddToWishlist}
                            onAddToBag={onAddToBag}
                            onRemoveFromBag={onRemoveFromBag}
                            cartItems={cartItems}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

// --- Toast Component ---

// FIX: Define a type for the Toast component's props and explicitly type it as a React.FC
// This resolves a TypeScript error where the special 'key' prop was not recognized.
interface ToastProps {
  message: string;
  onUndo?: () => void;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onUndo, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.5 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-4"
        >
            <span>{message}</span>
            {onUndo && <button onClick={() => { onUndo(); onDismiss(); }} className="font-bold text-primary-300 hover:underline">Undo</button>}
        </motion.div>
    );
};


// --- Main App Component ---

export const App = () => {
    const [view, setView] = useState<View>('welcome');
    const [currentGender, setCurrentGender] = useState<'men' | 'women' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [wishlist, setWishlist] = useState<WardrobeItem[]>([]);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isBagOpen, setIsBagOpen] = useState(false);
    const [crew, setCrew] = useState<Crew | null>(null);
    const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>(() => {
        try {
            const stored = localStorage.getItem('savedOutfits');
            if (stored) {
                const parsed = JSON.parse(stored);
                // If the stored data is too large, clear it and start fresh
                if (stored.length > 4000000) { // ~4MB
                    console.warn('⚠️ Clearing large savedOutfits from localStorage');
                    localStorage.removeItem('savedOutfits');
                    return [];
                }
                
                // Validate each outfit structure
                const validOutfits = parsed.filter((outfit: any) => {
                    return outfit && 
                           outfit.id && 
                           typeof outfit.name === 'string' &&
                           Array.isArray(outfit.items) && 
                           outfit.items.length > 0 &&
                           outfit.items.every((item: any) => 
                               item && item.id && item.name && item.url && item.gender
                           );
                });
                
                if (validOutfits.length === 0) {
                    console.log('⚠️ No valid outfits found, starting fresh');
                    localStorage.removeItem('savedOutfits');
                    return [];
                }
                
                // Add a fallback preview URL using the first item's image
                return validOutfits.map((outfit: any) => ({
                    ...outfit,
                    previewUrl: outfit.previewUrl || (outfit.items && outfit.items[0] ? outfit.items[0].url : '')
                }));
            }
            return [];
        } catch (e) {
            console.error('Failed to load saved outfits from localStorage', e);
            // Clear corrupted data
            localStorage.removeItem('savedOutfits');
            return [];
        }
    });
    const [outfitToLoad, setOutfitToLoad] = useState<SavedOutfit | null>(null);
    const [itemToTryOn, setItemToTryOn] = useState<WardrobeItem | null>(null);
    const [eventStylistTryOnOutfit, setEventStylistTryOnOutfit] = useState<GeneratedOutfit | null>(null);
    const [forceMagicMirrorReset, setForceMagicMirrorReset] = useState(false);

    // Chatbot state
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [chatbotContext, setChatbotContext] = useState<ChatbotContext | null>(null);
    const [showAccessoryNudge, setShowAccessoryNudge] = useState(false);

    const [toast, setToast] = useState<{ id: number, message: string, onUndo?: () => void } | null>(null);

    // Clean initialization - ensure fresh builds start properly
    useEffect(() => {
        // Check for development/fresh build indicators
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const hasAnalysisData = localStorage.getItem('userAnalysis');
        const hasModelData = localStorage.getItem('userModel') || localStorage.getItem('modelImageUrl');
        
        // If we have stale analysis but no model, clean up
        if (hasAnalysisData && !hasModelData) {
            console.log('🧹 Cleaning stale analysis data...');
            localStorage.removeItem('userAnalysis');
            setAnalysis(null);
        }
        
        // Validate savedOutfits structure
        const storedOutfits = localStorage.getItem('savedOutfits');
        if (storedOutfits) {
            try {
                const parsed = JSON.parse(storedOutfits);
                // Check if outfits have proper structure
                const validOutfits = parsed.filter((outfit: any) => 
                    outfit && 
                    outfit.id && 
                    outfit.name && 
                    Array.isArray(outfit.items) && 
                    outfit.items.length > 0 &&
                    outfit.items.every((item: any) => item.id && item.name && item.url)
                );
                
                if (validOutfits.length !== parsed.length) {
                    console.log('🧹 Cleaning invalid outfits...');
                    localStorage.setItem('savedOutfits', JSON.stringify(validOutfits));
                    setSavedOutfits(validOutfits);
                }
            } catch (e) {
                console.log('🧹 Clearing corrupted outfits...');
                localStorage.removeItem('savedOutfits');
                setSavedOutfits([]);
            }
        }
    }, []); // Run only on mount

    // Handle incoming crew share links
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const crewSession = params.get('crew_session');

        if (crewSession) {
            try {
                // Use decodeURIComponent instead of atob to handle Unicode characters
                const decodedCrew = JSON.parse(decodeURIComponent(crewSession));
                // Basic validation
                if (decodedCrew && decodedCrew.name && Array.isArray(decodedCrew.members)) {
                    setCrew(decodedCrew);
                    setView('crew_studio');
                    // Clean up the URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } catch (e) {
                console.error("Failed to parse crew session from URL", e);
                // Optional: show a toast/error message to the user
            }
        }
    }, []); // Run only on mount

    // Persist saved outfits to localStorage
    useEffect(() => {
        try {
            // Don't persist preview URLs (they're too large for localStorage)
            // Only persist the outfit metadata
            const outfitsToStore = savedOutfits.map(outfit => ({
                id: outfit.id,
                name: outfit.name,
                items: outfit.items,
                // Omit previewUrl to avoid QuotaExceededError
            }));
            localStorage.setItem('savedOutfits', JSON.stringify(outfitsToStore));
            console.log('✅ Saved', savedOutfits.length, 'outfits to localStorage (without preview images)');
        } catch (e) {
            console.error('Failed to save outfits to localStorage', e);
        }
    }, [savedOutfits]);

    // Keep the main user's crew wishlist in sync with the app's wishlist
    useEffect(() => {
        if (crew && crew.members.length > 0) {
          if (JSON.stringify(crew.members[0].wishlist) !== JSON.stringify(wishlist)) {
            setCrew(prevCrew => {
              if (!prevCrew) return null;
              const newMembers = [...prevCrew.members];
              newMembers[0] = { ...newMembers[0], wishlist: wishlist };
              return { ...prevCrew, members: newMembers };
            });
          }
        }
    }, [wishlist, crew]);


    const showToast = (message: string, onUndo?: () => void) => {
        setToast({ id: Date.now(), message, onUndo });
    };

    const handleNavigate = (targetView: View, options: { gender?: 'men' | 'women'; query?: string; resetMirror?: boolean } = {}) => {
        if (options.gender) {
            setCurrentGender(options.gender);
        }
        if (options.query) {
            setSearchQuery(options.query);
        }
        
        // Only force-reset Magic Mirror when explicitly requested (e.g. from FeatureHero)
        // Normal navigation (Header, returning from Event Stylist, etc.) preserves the session
        if (targetView === 'magic_mirror' && options.resetMirror) {
            setForceMagicMirrorReset(true);
        }
        
        setView(targetView);
    };

    const handleSelectGender = (gender: 'men' | 'women') => {
        setCurrentGender(gender);
        setView('products');
    };

    const handleAnalysisComplete = (result: AnalysisResult) => {
        setAnalysis(result);
        if (result.gender) {
            setCurrentGender(result.gender);
        }
    };
    
    // Wishlist handlers
    const handleAddToWishlist = (item: WardrobeItem) => {
        setWishlist(prev => {
            if (prev.find(i => i.id === item.id)) {
                return prev.filter(i => i.id !== item.id); // Remove if exists
            } else {
                return [...prev, item]; // Add if not
            }
        });
    };

    const handleRemoveFromWishlist = (itemToRemove: WardrobeItem) => {
        setWishlist(prev => prev.filter(item => item.id !== itemToRemove.id));
    };

    const handleMoveToCart = (item: WardrobeItem) => {
        handleAddToCart(item);
        handleRemoveFromWishlist(item);
    };
    
    // Cart Handlers
    const handleAddToCart = (item: WardrobeItem) => {
        setCartItems(prev => {
            const existingItem = prev.find(i => i.id === item.id);
            if (existingItem) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const handleUpdateCartQuantity = (itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            handleRemoveFromCart(itemId);
            return;
        }
        setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
    };

    const handleRemoveFromCart = (itemId: string) => {
        setCartItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleAddOutfitToBag = (outfit: SavedOutfit | GeneratedOutfit) => {
        outfit.items.forEach(item => {
            const isInCart = cartItems.some(cartItem => cartItem.id === item.id);
            if (!isInCart) {
                handleAddToCart(item);
            }
        });
        setIsBagOpen(true);
        showToast(`Outfit added to bag!`);
    };

    const handleWishlistOutfit = (outfit: SavedOutfit | GeneratedOutfit) => {
        let itemsAddedCount = 0;
        const currentWishlistIds = new Set(wishlist.map(i => i.id));
        
        outfit.items.forEach(item => {
            if (!currentWishlistIds.has(item.id)) {
                handleAddToWishlist(item);
                itemsAddedCount++;
            }
        });
    
        if (itemsAddedCount > 0) {
            showToast(`${itemsAddedCount} item(s) added to wishlist.`);
        } else {
            showToast("All items are already in your wishlist.");
        }
    };

    // Crew Handlers
    const handleCreateCrew = async (name: string, vibe: string, crewId?: string, memberId?: string, isJoining?: boolean) => {
        if (crewId && memberId) {
            // Firebase-based crew - fetch real crew data and convert to local format
            try {
                const crewRef = ref(db, `crews/${crewId}`);
                const snapshot = await get(crewRef);
                const firebaseCrewData = snapshot.val();
                
                if (firebaseCrewData) {
                    // Convert Firebase crew structure to local crew structure
                    const members = Object.entries(firebaseCrewData.members || {}).map(([id, memberData]: [string, any]) => ({
                        id,
                        name: memberData.name,
                        modelImageUrl: memberData.modelImageUrl || null,
                        hasCreatedModel: memberData.hasCreatedModel ?? false,
                        outfitHistory: [],
                        poseIndex: 0,
                        wishlist: id === memberId ? wishlist : [], // Only current user gets the wishlist
                    }));
                    
                    const newCrew: Crew = {
                        id: crewId,
                        name: firebaseCrewData.name,
                        vibe: firebaseCrewData.vibe,
                        members,
                        messages: [],
                        sharedWishlist: [],
                    };
                    setCrew(newCrew);
                    setView('crew_studio');
                }
            } catch (error) {
                console.error('Failed to fetch crew data:', error);
                // Fallback to local crew creation
                createLocalCrew(name, vibe);
            }
        } else {
            // Local crew creation
            createLocalCrew(name, vibe);
        }
    };

    const createLocalCrew = (name: string, vibe: string) => {
        const newCrew: Crew = {
            name,
            vibe,
            members: [{
                id: 'member-1',
                name: 'Me',
                modelImageUrl: null,
                hasCreatedModel: false,
                outfitHistory: [],
                poseIndex: 0,
                wishlist: wishlist,
            }],
            messages: [],
            sharedWishlist: [],
        };
        setCrew(newCrew);
        setView('crew_studio');
    };

    // Outfit Handlers
    const handleSaveOutfit = (items: WardrobeItem[], previewUrl: string) => {
        // Validate items before saving
        if (!items || items.length === 0) {
            console.warn('⚠️ Cannot save empty outfit');
            return;
        }
        
        // Ensure all items have required properties
        const validItems = items.filter(item => 
            item && item.id && item.name && item.url && item.gender
        );
        
        if (validItems.length === 0) {
            console.warn('⚠️ No valid items to save in outfit');
            return;
        }
        
        if (validItems.length !== items.length) {
            console.warn('⚠️ Some invalid items filtered out from outfit');
        }
        
        const newOutfit: SavedOutfit = {
            id: `outfit-${Date.now()}`,
            name: `Styled Look ${savedOutfits.length + 1}`,
            items: validItems,
            previewUrl,
        };
        console.log('💾 Saving outfit:', newOutfit);
        setSavedOutfits(prev => {
            const updated = [newOutfit, ...prev];
            console.log('📦 Updated savedOutfits:', updated);
            return updated;
        });
    };
    
    const handleUpdateOutfitName = (outfitId: string, newName: string) => {
        setSavedOutfits(prev => prev.map(o => o.id === outfitId ? { ...o, name: newName } : o));
    };

    const handleDeleteOutfit = (outfitId: string) => {
        setSavedOutfits(prev => prev.filter(o => o.id !== outfitId));
    };
    
    const handleTryOnOutfit = (outfit: SavedOutfit) => {
        setOutfitToLoad(outfit);
        // Don't reset — load outfit into existing session
        setView('magic_mirror');
    };

    const handleEventStylistQuickTryOn = (outfit: GeneratedOutfit) => {
        setEventStylistTryOnOutfit(outfit);
        // Don't reset — Event Stylist flow manages its own state
        setView('magic_mirror');
    };
    
    useEffect(() => {
        let timer: number | undefined;
        if (showAccessoryNudge) {
            timer = window.setTimeout(() => {
                setShowAccessoryNudge(false);
            }, 12000);
        }
        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [showAccessoryNudge]);


    const renderCurrentView = () => {
        const props = {
            onNavigate: handleNavigate,
            onSelectGender: handleSelectGender,
            wishlist: wishlist,
            onAddToWishlist: handleAddToWishlist,
            cartItems: cartItems,
            onAddToBag: handleAddToCart,
            onRemoveFromBag: handleRemoveFromCart,
        };

        switch (view) {
            case 'welcome':
                return <WelcomeView {...props} />;
            case 'products':
                if (!currentGender) {
                    setView('welcome');
                    return <WelcomeView {...props} promptForGender={true} />;
                }
                const productsForGender = allWardrobeItems.filter(item => item.gender === currentGender && item.category !== 'accessories');
                return <ProductsView products={productsForGender} analysis={analysis} {...props} />;
            case 'accessories':
                return <AccessoriesView products={allWardrobeItems} {...props} />;
            case 'wishlist':
                return <WishlistView wishlist={wishlist} onRemoveFromWishlist={handleRemoveFromWishlist} onMoveToCart={handleMoveToCart} {...props} />;
            case 'search':
                return <SearchResultsView query={searchQuery} products={allWardrobeItems} {...props} />;
            case 'crew_setup':
                return <CrewSetup onCreateCrew={handleCreateCrew} />;
            case 'crew_studio':
                return <CrewStudio
                    crew={crew}
                    setCrew={setCrew}
                    wishlist={wishlist}
                    poseInstructions={["Front-facing, neutral stance", "Slightly turned, 3/4 view", "Walking towards camera", "Hands on hips", "Side profile view"]}
                    onSaveOutfit={handleSaveOutfit}
                />;
            case 'outfits':
                 return <OutfitsView 
                    outfits={savedOutfits}
                    onUpdateName={handleUpdateOutfitName}
                    onDelete={handleDeleteOutfit}
                    onTryOn={handleTryOnOutfit}
                    onAddOutfitToBag={handleAddOutfitToBag}
                    onContinueShopping={() => handleNavigate('products', { gender: currentGender || 'women' })}
                    onAddToCart={handleAddToCart}
                    {...props}
                />;
            default:
                if (view === 'magic_mirror' || view === 'event_stylist') return null;
                return <WelcomeView {...props} />;
        }
    };
    
    const sharedProps = {
        onNavigate: handleNavigate,
        onSelectGender: handleSelectGender,
        wishlist: wishlist,
        onAddToWishlist: handleAddToWishlist,
        cartItems: cartItems,
        onAddToBag: handleAddToCart,
        onRemoveFromBag: handleRemoveFromCart,
    };

    return (
        <div className="min-h-screen w-full flex flex-col font-sans bg-gray-50">
            <Header
                onNavigate={handleNavigate}
                wishlistCount={wishlist.length}
                bagCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                onToggleBag={() => setIsBagOpen(!isBagOpen)}
                currentGender={currentGender}
                currentView={view}
            />
            <main className="flex-grow flex flex-col relative w-full h-full">
                {/* Persistent Background-capable Views */}
                <div className="flex-grow flex flex-col" style={{ display: view === 'magic_mirror' ? 'flex' : 'none' }}>
                    <MagicMirrorView
                        {...sharedProps}
                        poseInstructions={["Front-facing, neutral stance", "Slightly turned, 3/4 view", "Walking towards camera", "Hands on hips", "Side profile view"]}
                        gender={currentGender}
                        onAnalysisComplete={handleAnalysisComplete}
                        onSaveOutfit={handleSaveOutfit}
                        outfitToLoad={outfitToLoad}
                        onOutfitLoaded={() => setOutfitToLoad(null)}
                        onChatbotContextUpdate={setChatbotContext}
                        setIsChatbotOpen={setIsChatbotOpen}
                        itemToTryOn={itemToTryOn}
                        onItemTriedOn={() => setItemToTryOn(null)}
                        showToast={showToast}
                        setShowAccessoryNudge={setShowAccessoryNudge}
                        forceReset={forceMagicMirrorReset}
                        onResetProcessed={() => setForceMagicMirrorReset(false)}
                        currentView={view}
                        eventStylistTryOnOutfit={eventStylistTryOnOutfit}
                        onQuickTryOnComplete={() => setEventStylistTryOnOutfit(null)}
                    />
                </div>
                
                <div className="flex-grow flex flex-col" style={{ display: view === 'event_stylist' ? 'flex' : 'none' }}>
                    <EventStylistView
                        analysis={analysis}
                        onTryOnOutfit={handleEventStylistQuickTryOn}
                        onAddOutfitToBag={handleAddOutfitToBag}
                        onWishlistOutfit={handleWishlistOutfit}
                        {...sharedProps}
                    />
                </div>

                <AnimatePresence mode="wait">
                    {!['magic_mirror', 'event_stylist'].includes(view) && (
                        <motion.div
                            key={view}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="flex-grow flex flex-col w-full"
                        >
                            {renderCurrentView()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
            <Chatbot 
                analysis={analysis}
                wardrobe={allWardrobeItems}
                isOpen={isChatbotOpen}
                setIsOpen={setIsChatbotOpen}
                magicMirrorContext={chatbotContext}
                onNavigate={handleNavigate}
                onTryOnItem={(item) => {
                    setView('magic_mirror');
                    setItemToTryOn(item);
                }}
                onAddToWishlist={handleAddToWishlist}
                wishlist={wishlist}
                gender={currentGender}
                showAccessoryNudge={showAccessoryNudge}
                setShowAccessoryNudge={setShowAccessoryNudge}
                currentView={view}
            />
             <BagSidepanel
                isOpen={isBagOpen}
                onClose={() => setIsBagOpen(false)}
                cartItems={cartItems}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveFromCart}
            />
            <AnimatePresence>
                {toast && (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        onUndo={toast.onUndo}
                        onDismiss={() => setToast(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};