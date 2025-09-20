#!/usr/bin/env tsx

/**
 * Database Connection Test Script
 * 
 * This script tests the Supabase connection and verifies that all tables are accessible.
 * Run this after setting up your Supabase project to ensure everything is working.
 * 
 * Usage: tsx scripts/test-db-connection.ts
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testDatabaseConnection() {
  console.log('🔍 Testing Supabase Database Connection...\n');

  // Check environment variables
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Supabase environment variables not found!');
    console.log('Please make sure you have created .env.local file with:');
    console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Check if we can connect to Supabase
    console.log('\n🔗 Testing basic connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('mon_an')
      .select('count')
      .limit(1);

    if (healthError) {
      throw new Error(`Connection failed: ${healthError.message}`);
    }
    console.log('✅ Successfully connected to Supabase');

    // Test 2: Check all required tables exist and have data
    const tables = [
      { name: 'mon_an', description: 'Dishes' },
      { name: 'nguyen_lieu', description: 'Ingredients' },
      { name: 'thuc_don', description: 'Menu Items' },
      { name: 'thanh_phan', description: 'Recipe Components' }
    ];

    console.log('\n📊 Checking database tables...');
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table.name)
          .select('*', { count: 'exact' })
          .limit(1);

        if (error) {
          console.log(`❌ Table ${table.name} (${table.description}): ${error.message}`);
        } else {
          console.log(`✅ Table ${table.name} (${table.description}): ${count} records`);
        }
      } catch (err) {
        console.log(`❌ Table ${table.name} (${table.description}): ${err}`);
      }
    }

    // Test 3: Test sample data retrieval
    console.log('\n🍽️  Testing sample data retrieval...');
    
    const { data: dishes, error: dishesError } = await supabase
      .from('mon_an')
      .select('*')
      .limit(5);

    if (dishesError) {
      console.log(`❌ Error fetching dishes: ${dishesError.message}`);
    } else {
      console.log(`✅ Found ${dishes?.length || 0} dishes:`);
      dishes?.forEach((dish, index) => {
        console.log(`   ${index + 1}. ${dish.ten_mon_an}`);
      });
    }

    // Test 4: Test menu items functionality
    console.log('\n📅 Testing menu functionality...');
    
    const today = new Date().toISOString().split('T')[0];
    const { data: menuItems, error: menuError } = await supabase
      .from('thuc_don')
      .select('*')
      .eq('ngay', today);

    if (menuError) {
      console.log(`❌ Error fetching menu items: ${menuError.message}`);
    } else {
      console.log(`✅ Menu items for today (${today}): ${menuItems?.length || 0} items`);
    }

    console.log('\n🎉 Database connection test completed successfully!');
    console.log('\nYour menu management app should now work with persistent data storage.');
    console.log('You can now:');
    console.log('  - Add dishes to your menu');
    console.log('  - View calendar with real data');
    console.log('  - Manage ingredients and inventory');
    console.log('  - All data will persist between sessions');

  } catch (error) {
    console.error('\n❌ Database connection test failed:');
    console.error(error);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check your Supabase URL and API key');
    console.log('2. Make sure you ran the database-schema.sql script');
    console.log('3. Verify your Supabase project is not paused');
    console.log('4. Check your internet connection');
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection().catch(console.error);
