# Supabase Authentication Setup Guide

## 1. Supabase Project Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or use existing one
3. Go to Settings > API to get your project URL and anon key
4. Add these to your `.env` file:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## 2. Google OAuth Setup

1. In Supabase Dashboard, go to Authentication > Providers
2. Enable Google provider
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Set redirect URL to: `https://your-project.supabase.co/auth/v1/callback`

## 3. Database Setup

Run the SQL commands from `supabase.sql` in your Supabase SQL editor to:
- Create the `ptice` table
- Create the `rezultati_kviza` table with user email field
- Set up proper RLS policies

## 4. Google OAuth App Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:3000` (for development)

## 5. Features Added

- ✅ Google OAuth authentication
- ✅ Protected quiz access (only logged users)
- ✅ User email saved with quiz results
- ✅ Logout functionality
- ✅ Loading states and error handling
