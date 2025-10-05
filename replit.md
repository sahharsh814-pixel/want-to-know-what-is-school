# Royal Academy School Management System

## Overview

Royal Academy is a comprehensive school management web application built with React, TypeScript, and Vite. The system serves multiple user roles (Principal, Teachers, Students) and provides features for managing admissions, faculty, courses, galleries, announcements, and more. The application uses Supabase as its backend database with localStorage as a fallback for offline functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tool**
- **React 18.3.1** with TypeScript for type-safe component development
- **Vite** as the build tool and development server for fast hot-module replacement
- **React Router** for client-side routing with protected routes for authenticated users

**UI Framework & Styling**
- **Tailwind CSS** with custom theme extending base colors (royal, crimson, gold palettes)
- **shadcn/ui** component library built on Radix UI primitives for accessible components
- **Framer Motion** for animations and transitions throughout the application
- **next-themes** for dark/light mode theming

**State Management & Data Flow**
- Component-level state using React hooks (useState, useEffect)
- No global state management library - relies on localStorage and Supabase for persistence
- Custom hooks in `/src/hooks` directory (use-mobile, use-toast)

**Key Design Patterns**
- Protected routes using `ProtectedRoute` component that checks localStorage auth keys
- Manager components (TeacherManager, GalleryManager, etc.) follow a consistent CRUD pattern
- Dual persistence strategy: writes to both Supabase and localStorage simultaneously
- Realtime subscriptions for live data updates across browser tabs/sessions

### Backend Architecture

**Database & Storage**
- **Supabase** as the primary backend service
- Single table schema: `app_state` with key-value pairs (key: string, value: JSON)
- No traditional relational schema - all data stored as JSON in the value column
- Supabase Realtime used for cross-tab synchronization

**Data Persistence Strategy**
- `supaStorage.ts` implements a localStorage shim with Supabase backing
- Writes go to localStorage first (immediate), then asynchronously to Supabase
- Reads check localStorage first, fall back to Supabase on cache miss
- Sensitive auth keys (teacher/student credentials) excluded from cross-port sync

**Authentication Mechanism**
- Simple localStorage-based authentication (no JWT or session tokens)
- Auth keys: `principalAuth`, `teacherAuth`, `studentAuth`
- Protected routes check for these boolean flags in localStorage
- Teacher/student profiles stored with username/password in localStorage

### Data Architecture

**Key localStorage/Supabase Keys**
- `royal-academy-homepage` - Homepage editor data
- `royal-academy-about` - About page content
- `royal-academy-admissions` - Admissions form submissions
- `royal-academy-teachers` - Faculty directory with departments
- `royal-academy-auth-teachers` - Teacher login credentials
- `royal-academy-students` - Student profiles and enrollment
- `royal-academy-gallery` - Photo galleries with categories
- `royal-academy-announcements` - School announcements
- `royal-academy-courses` - Course catalog
- `royal-academy-top-scorers` - Student achievements
- `royal-academy-pricing` - Tuition pricing (monthly/yearly)

**Data Flow**
1. User action triggers state update in React component
2. Component calls `setSupabaseData()` or `supaStorage` method
3. Data written to localStorage immediately (synchronous)
4. Supabase write queued (asynchronous)
5. Realtime subscription broadcasts change to other tabs
6. Other tabs update their localStorage and re-render

### External Dependencies

**Core Libraries**
- `@supabase/supabase-js` (v2.58.0) - Backend database client
- `@tanstack/react-query` (v5.83.0) - Server state management (minimally used)
- `framer-motion` (v11.18.2) - Animation library
- `react-router-dom` - Client-side routing

**UI Component Libraries**
- `@radix-ui/*` - Headless UI primitives (accordion, dialog, dropdown, etc.)
- `lucide-react` (v0.462.0) - Icon library
- `class-variance-authority` & `clsx` - Utility for conditional classNames

**Form & Validation**
- `@hookform/resolvers` (v3.10.0) - Form validation
- `react-hook-form` - Form state management (implied by resolvers)
- `zod` - Schema validation (implied by resolvers)

**Payment Integrations** (declared but not actively used)
- Razorpay, PayPal, Stripe SDKs loaded in index.html
- Payment processing code exists in Admissions page but requires API keys

**Development Tools**
- ESLint with TypeScript support
- TypeScript strict mode disabled for flexibility
- Path aliases configured (@/ maps to ./src/)

**Hosting & Deployment**
- Vercel configuration (vercel.json) with SPA rewrite rules
- Static site deployment with client-side routing fallback