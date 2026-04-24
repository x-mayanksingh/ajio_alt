/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WardrobeItem, CartItem } from '../types';
import { HeartIcon, HeartIconFilled, StarIcon, ShoppingBagIcon, Trash2Icon, DressIcon } from './icons';
import { cn } from '../lib/utils';

// --- AddToBagButton Component (AJIO style: flat, sharp, no shadows) ---

interface AddToBagButtonProps {
  item: WardrobeItem;
  cartItems: CartItem[];
  onClick: (item: WardrobeItem) => void;
  onRemove?: (itemId: string) => void;
  disabled?: boolean;
}

const AddToBagButton: React.FC<AddToBagButtonProps> = ({ item, cartItems, onClick, onRemove, disabled = false }) => {
  const cartItem = cartItems.find(cartItem => cartItem.id === item.id);
  const qty = cartItem?.quantity || 0;
  const inBag = qty > 0;
  
  const isOnePiece = item.category === 'dresses';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled) {
      onClick(item);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "w-full mt-2 text-xs font-bold py-2.5 px-3 uppercase tracking-wider transition-all duration-200 border flex items-center justify-center gap-2 relative",
        {
          'bg-white text-primary-900 border-primary-900 hover:bg-primary-900 hover:text-white': !inBag && !disabled,
          'bg-primary-900 text-white border-primary-900': inBag && !disabled,
          'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed': disabled,
        }
      )}
      aria-pressed={inBag}
      aria-label={inBag ? `In Bag, quantity ${qty}` : 'Add to Bag'}
    >
      <AnimatePresence mode="wait">
        <motion.div
            key={inBag ? 'inBag' : 'default'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center gap-2"
        >
            {!inBag && <ShoppingBagIcon className="w-3.5 h-3.5" />}
            {inBag && isOnePiece && <DressIcon className="w-3.5 h-3.5" />}
            <span>{inBag ? 'In Bag' : 'Add to Bag'}</span>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {inBag && (
            <motion.div 
                className="flex items-center gap-1.5 ml-auto"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
            >
                {onRemove && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(item.id);
                        }}
                        className="p-0.5 hover:opacity-70 transition-opacity"
                        aria-label={`Remove ${item.name} from bag`}
                    >
                        <Trash2Icon className="w-3.5 h-3.5" />
                    </button>
                )}
                <span className="bg-white text-primary-900 text-[10px] font-bold h-4 w-4 flex items-center justify-center">
                    {qty}
                </span>
            </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};


const ProductImageRenderer = ({ url, alt }: { url: string, alt: string }) => {
    const isPinterestEmbed = url.includes('pinterest.com/ext/embed');

    if (isPinterestEmbed) {
        return (
            <iframe
                src={url}
                title={alt}
                className="h-full w-full object-cover object-center pointer-events-none"
                frameBorder="0"
                scrolling="no"
                loading="lazy"
            ></iframe>
        );
    }

    return (
        <img
            src={url}
            alt={alt}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
    );
};

interface ProductCardProps {
    item: WardrobeItem;
    onAddToWishlist: (item: WardrobeItem) => void;
    isWishlisted: boolean;
    onMoveToCart?: (item: WardrobeItem) => void;
    onAddToBag?: (item: WardrobeItem) => void;
    onRemoveFromBag: (itemId: string) => void;
    cartItems: CartItem[];
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, onAddToWishlist, isWishlisted, onMoveToCart, onAddToBag, onRemoveFromBag, cartItems }) => (
    <motion.div 
        className="group relative flex flex-col"
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
    >
        {/* Image container — sharp edges, subtle hover zoom, no shadow */}
        <div className="w-full overflow-hidden bg-gray-100 aspect-[2/3] relative">
            <ProductImageRenderer url={item.url} alt={item.name} />
            {/* Wishlist button — appears on hover, top-right like AJIO */}
            <button
                onClick={() => onAddToWishlist(item)}
                className={cn(
                    "absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm transition-all duration-200",
                    isWishlisted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
                {isWishlisted 
                    ? <HeartIconFilled className="w-4 h-4 text-red-500" /> 
                    : <HeartIcon className="w-4 h-4 text-gray-600" />
                }
            </button>
        </div>
        
        {/* Product info — AJIO-style: brand bold, name lighter, price prominent */}
        <div className="mt-2.5 px-0.5">
            {item.brand && (
                <p className="text-xs font-bold text-primary-900 uppercase tracking-wide truncate">{item.brand}</p>
            )}
            <h3 className="text-xs text-gray-500 font-normal truncate mt-0.5 leading-snug">
                {item.name}
            </h3>
            {item.rating && (
                <div className="mt-1 flex items-center gap-1" title={`${item.rating.value.toFixed(1)} stars`}>
                    <div className="flex items-center bg-green-700 text-white text-[10px] font-bold px-1.5 py-0.5 gap-0.5">
                        <span>{item.rating.value.toFixed(1)}</span>
                        <StarIcon className="h-2.5 w-2.5 fill-current" />
                    </div>
                    {item.rating.count && <span className="text-[10px] text-gray-400">({item.rating.count})</span>}
                </div>
            )}
            <p className="text-sm font-bold text-primary-900 mt-1">{item.price}</p>
        </div>
        
        {/* Add to Bag button */}
        {onAddToBag && (
            <div className="px-0.5">
                <AddToBagButton item={item} cartItems={cartItems} onClick={onAddToBag} onRemove={onRemoveFromBag} />
            </div>
        )}
        {onMoveToCart && (
            <div className="px-0.5">
                <AddToBagButton item={item} cartItems={cartItems} onClick={onMoveToCart} onRemove={onRemoveFromBag} />
            </div>
        )}
    </motion.div>
);
