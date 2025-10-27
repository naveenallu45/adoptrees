#!/usr/bin/env node

/**
 * Database optimization script
 * Run this script to create indexes and optimize database performance
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createDatabaseIndexes } = require('../src/lib/database-optimization');

async function main() {
  console.log('🚀 Starting database optimization...');
  
  try {
    await createDatabaseIndexes();
    console.log('✅ Database optimization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    process.exit(1);
  }
}

main();
