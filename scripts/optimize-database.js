#!/usr/bin/env node

/**
 * Database optimization script
 * Run this script to create indexes and optimize database performance
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createDatabaseIndexes } = require('../src/lib/database-optimization');

async function main() {
  
  try {
    await createDatabaseIndexes();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

main();
