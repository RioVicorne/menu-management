# Supabase Setup Guide

## Current Status

The app is currently running in **mock data mode** because Supabase environment variables are not configured.

## Complete Setup Instructions:

### Step 1: Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Choose your organization
4. Enter project name: `menu-management`
5. Enter database password (save this securely!)
6. Choose region closest to you
7. Click **"Create new project"**
8. Wait for the project to be ready (2-3 minutes)

### Step 2: Set up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `database-schema.sql` file
4. Paste it into the SQL editor
5. Click **"Run"** to execute the schema
6. You should see "Success. No rows returned" message

### Step 3: Get API Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon/public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Step 4: Create Environment File

Create a `.env.local` file in your project root (`menu-management/.env.local`):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Replace the values with your actual credentials from Step 3.**

### Step 5: Restart Development Server

```bash
npm run dev
# or
yarn dev
# or
bun dev
```

### Step 6: Verify Setup

1. Open [http://localhost:3000](http://localhost:3000)
2. Check the browser console - you should NOT see the "Supabase environment variables are not set" warning
3. Navigate to the menu pages - they should now show real data from the database
4. Try adding a dish to a menu - it should persist after page refresh

## Troubleshooting

### Common Issues:

1. **"Supabase environment variables are not set" warning:**
   - Make sure `.env.local` file exists in the project root
   - Check that variable names are exactly `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Restart your development server after creating the file

2. **Database connection errors:**
   - Verify your Supabase URL and key are correct
   - Check that the database schema was created successfully
   - Ensure your Supabase project is not paused

3. **Data not persisting:**
   - Check browser console for errors
   - Verify RLS policies are set up correctly
   - Make sure you're using the correct table names

### Database Schema Created:

The `database-schema.sql` file creates these tables with sample data:

- `mon_an` (dishes) - 10 sample Vietnamese dishes
- `thuc_don` (menu items) - for daily menu planning
- `nguyen_lieu` (ingredients) - 10 sample ingredients with inventory
- `thanh_phan` (recipe components) - linking dishes to ingredients

### Features After Setup:

- ✅ **Persistent Data Storage** - All data saved to database
- ✅ **Real Menu Management** - Add/edit/delete menu items
- ✅ **Ingredient Tracking** - Track inventory and costs
- ✅ **Recipe Management** - Link dishes to ingredients
- ✅ **Calendar Integration** - View menu data by date
- ✅ **Full CRUD Operations** - Complete data management
- ✅ **Sample Data** - Pre-loaded with Vietnamese dishes and ingredients
