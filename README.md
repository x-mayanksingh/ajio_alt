# 🛍️ Ajio AI Fit Check: Next-Gen E-Commerce Prototype

> **An AI-powered fashion web application redefining e-commerce through intelligent virtual try-ons, real-time styling assistants, and a fluid, modern user experience.**

![Project Banner](https://via.placeholder.com/1000x400?text=Ajio+AI+Fit+Check+Cover)

## 📖 Overview
**Ajio AI Fit Check** is a feature-rich, front-end e-commerce prototype that bridges the gap between digital shopping and physical retail. Built entirely with React, TypeScript, and powered by Google's Gemini AI, this application aims to solve one of fashion e-commerce's biggest challenges: helping users visualize clothes on themselves *before* they buy. 

Designed with a sleek, premium Ajio-inspired aesthetic, the application prioritizes a seamless user journey—transitioning smoothly from product discovery to AI-driven virtual fitting.

## ✨ Key Features

### 👗 CrewStudio (AI Virtual Try-On)
A cutting-edge interactive fitting room. Users can snap or upload a photo, and seamlessly preview how specific garments will look on them using AI-generated visualizations—complete with pose variations and group photo generations.

### 🪞 Magic Mirror & Event Stylist
A dynamic module that provides contextual, occasion-based outfit recommendations. Whether it's a casual brunch, a wedding, or a business meeting, the internal styling engine curates head-to-toe looks dynamically.

### 🤖 Intelligent Styling Assistant (AI Chat)
An integrated natural language chatbot built on the Gemini API. Users can describe the look they want (e.g., *"I need a relaxed outfit for a beach vacation"*), and the assistant will scour the inventory to deliver highly relevant aesthetic recommendations.

### ⚡ Premium, Fluid User Interface
Built prioritizing modern aesthetics and micro-interactions:
- **Responsive Layout:** Perfectly scales from mobile devices to ultra-wide desktop monitors.
- **Glassmorphism & Rich Animations:** Smooth transitions and beautifully structured styling.
- **State Management:** Robust component logic handling outfit history, cart persistence, and dynamic user flows.

## 🛠️ Technology Stack

| Category | Technologies |
| --- | --- |
| **Frontend Framework** | React 18, Vite |
| **Language** | TypeScript |
| **Styling** | Custom modern CSS (Responsive, Grid/Flexbox, Animations) |
| **AI Integration** | Google Gemini API (`@google/generative-ai`) |
| **Backend & Hosting** | Firebase (Hosting & Realtime configuration) |
| **Icons & Assets** | Lucide React |

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- A Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/x-mayanksingh/ajio_alt.git
   cd ajio_alt
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add your credentials:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## 🧠 Architectural Insights (For Reviewers & Recruiters)
This project was constructed to demonstrate full-stack proficiency, particularly concentrating on **complex state management, API integration, and advanced UI design principles.**

- **AI-First Design:** Rather than treating AI as a tacked-on feature, the core UX revolves around conversational discovery and generative rendering.
- **Component Scalability:** Employs a modular and reusable component architecture (`components/` directory), establishing clear boundaries between presentation and data/business logic (`services/geminiService.ts`).
- **Performance Optimization:** Leverages Vite for instantaneous HMR during development and optimized tree-shaking for production builds alongside React hooks (`useMemo`, `useCallback`) to preserve smooth interface frame rates despite heavy DOM manipulation.

## 📸 Screenshots
*(To be added by user)*
- **Home Interface:** [Image here]
- **CrewStudio Virtual Try-On:** [Image here]
- **AI Chatbot Interaction:** [Image here]

---
*Disclaimer: This is a personal project intended as a prototype and portfolio piece. It is not officially affiliated with Ajio or Reliance Retail.*
