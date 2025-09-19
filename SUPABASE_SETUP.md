# Supabase Setup Guide

## Current Status

The app is currently running in **mock data mode** because Supabase environment variables are not configured.

## To Connect to Supabase:

### 1. Create a `.env.local` file in the `web` directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Get your Supabase credentials:

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** > **API**
4. Copy the **Project URL** and **anon/public key**

### 3. Replace the placeholder values in `.env.local`:

- Replace `your_supabase_url_here` with your Project URL
- Replace `your_supabase_anon_key_here` with your anon key

### 4. Restart the development server:

```bash
npm run dev
```

## Current Features (Mock Data Mode):

- ✅ Calendar dashboard works
- ✅ Daily menu management works
- ✅ Add dishes works (stored in memory)
- ✅ Language switching works
- ✅ Dark/light mode works

## After Supabase Setup:

- ✅ All data will be persistent
- ✅ Calendar will show real menu data
- ✅ Dishes will be saved to database
- ✅ Full CRUD operations will work

## Database Schema Expected:

The app expects these tables in your Supabase project:

- `mon_an` (dishes)
- `thuc_don` (menu items)
- `nguyen_lieu` (ingredients)
- `thanh_phan` (recipe components)
