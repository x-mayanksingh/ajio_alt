/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserIcon, HeartIcon, ShoppingBagIcon, UsersIcon, SparklesIcon, AccessoriesIcon, HangerIcon, CalendarIcon, SearchIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchTypeahead } from './Search';
import { View } from '../App';


interface HeaderProps {
    onNavigate: (view: View, options?: { gender?: 'men' | 'women'; query?: string; resetMirror?: boolean }) => void;
    wishlistCount: number;
    bagCount: number;
    onToggleBag: () => void;
    currentGender: 'men' | 'women' | null;
    currentView: View;
}

const NavItem: React.FC<{
    children: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}> = ({ children, isActive, onClick }) => (
  <button 
    onClick={onClick}
    className={`relative text-sm font-semibold tracking-wide uppercase py-1 transition-colors duration-200 ${isActive ? 'text-primary-900' : 'text-gray-600 hover:text-primary-900'}`}
  >
    {children}
    {isActive && (
        <motion.div
            className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-primary-900"
            layoutId="ajio-underline"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
    )}
  </button>
);

const Header: React.FC<HeaderProps> = ({ onNavigate, wishlistCount, bagCount, onToggleBag, currentGender, currentView }) => {
  const [prevWishlistCount, setPrevWishlistCount] = useState(wishlistCount);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (wishlistCount !== prevWishlistCount) {
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), 300);
        setPrevWishlistCount(wishlistCount);
        return () => clearTimeout(timer);
    }
  }, [wishlistCount, prevWishlistCount]);

  return (
    <header className="w-full bg-white sticky top-0 z-40 border-b border-gray-200">
      {/* Top utility bar — like AJIO's "Sign In / Join AJIO | Customer Care | Visit AJIOLUXE" */}
      <div className="hidden md:flex items-center justify-end gap-6 px-8 py-1.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
        <span className="hover:text-primary-900 cursor-pointer transition-colors">Sign In / Join AJIO</span>
        <span className="hover:text-primary-900 cursor-pointer transition-colors">Customer Care</span>
        <span className="px-2 py-0.5 border border-primary-900 text-primary-900 font-bold hover:bg-primary-900 hover:text-white cursor-pointer transition-all text-[10px] tracking-widest uppercase">Visit AJIOLUXE</span>
      </div>

      {/* Main header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 max-w-screen-2xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-10">
          <button onClick={() => onNavigate('welcome')} aria-label="Home" className="flex items-center">
            <span className="text-3xl font-black tracking-[0.2em] text-primary-900 font-sans leading-none">
                AJIO
            </span>
          </button>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-7">
            <NavItem isActive={currentView === 'products' && currentGender === 'men'} onClick={() => onNavigate('products', { gender: 'men' })}>Men</NavItem>
            <NavItem isActive={currentView === 'products' && currentGender === 'women'} onClick={() => onNavigate('products', { gender: 'women' })}>Women</NavItem>
            <NavItem isActive={currentView === 'accessories'} onClick={() => onNavigate('accessories')}>
                Accessories
            </NavItem>
            <NavItem isActive={currentView === 'event_stylist'} onClick={() => onNavigate('event_stylist')}>
                <span className="flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4" />
                    Event Stylist
                </span>
            </NavItem>
            <NavItem isActive={currentView === 'outfits'} onClick={() => onNavigate('outfits')}>
                <span className="flex items-center gap-1.5">
                    <HangerIcon className="w-4 h-4 mt-0.5" />
                    Outfits
                </span>
            </NavItem>
            <NavItem isActive={currentView === 'magic_mirror'} onClick={() => onNavigate('magic_mirror')}>
                <span className="flex items-center gap-1.5">
                    <SparklesIcon className="w-3.5 h-3.5" />
                    Magic Mirror
                </span>
            </NavItem>
            <NavItem isActive={currentView.startsWith('crew')} onClick={() => onNavigate('crew_setup')}>
                <span className="flex items-center gap-1.5">
                    <UsersIcon className="w-4 h-4" />
                    Style Crew
                </span>
            </NavItem>
          </nav>
        </div>

        {/* Right side: Search + Actions */}
        <div className="flex items-center gap-5">
          <SearchTypeahead onNavigate={onNavigate} />
          <div className="flex items-center gap-4">
            {/* Wishlist */}
            <button 
                onClick={() => onNavigate('wishlist')}
                className={`relative flex items-center justify-center w-9 h-9 transition-colors ${currentView === 'wishlist' ? 'text-primary-900' : 'text-gray-600 hover:text-primary-900'}`}
                aria-label="Wishlist"
            >
                <HeartIcon className="w-5 h-5" />
                <AnimatePresence>
                    {wishlistCount > 0 && (
                        <motion.span
                            key={wishlistCount}
                            className="absolute -top-0.5 -right-0.5 text-white bg-primary-900 text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: isAnimating ? [1, 1.3, 1] : 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        >
                            {wishlistCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>
            
            {/* Bag */}
            <button 
                onClick={onToggleBag}
                className="relative flex items-center justify-center w-9 h-9 text-gray-600 hover:text-primary-900 transition-colors"
                aria-label="Shopping Bag"
            >
                <ShoppingBagIcon className="w-5 h-5" />
                <AnimatePresence>
                    {bagCount > 0 && (
                        <motion.span
                            key={bagCount}
                            className="absolute -top-0.5 -right-0.5 text-white bg-primary-900 text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        >
                            {bagCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;