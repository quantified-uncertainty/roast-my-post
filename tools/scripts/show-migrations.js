#!/usr/bin/env node

/**
 * Script to show detailed migration information from the database
 * This helps track what migrations have been applied and when
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n📋 Database Migration Status\n');
  
  try {
    // Get all migrations from database
    const migrations = await prisma.$queryRaw`
      SELECT 
        id,
        migration_name, 
        finished_at,
        applied_steps_count,
        logs,
        rolled_back_at,
        started_at,
        checksum
      FROM _prisma_migrations
      ORDER BY finished_at DESC
    `;
    
    console.log(`Total migrations in database: ${migrations.length}\n`);
    
    // Show recent migrations
    console.log('🕐 Recent Migrations (last 10):');
    console.log('─'.repeat(80));
    
    migrations.slice(0, 10).forEach((migration, index) => {
      const finishedAt = migration.finished_at 
        ? new Date(migration.finished_at).toLocaleString()
        : 'Not finished';
      
      const duration = migration.started_at && migration.finished_at
        ? ((new Date(migration.finished_at) - new Date(migration.started_at)) / 1000).toFixed(2) + 's'
        : 'N/A';
      
      const status = migration.rolled_back_at 
        ? '⏪ Rolled back'
        : migration.applied_steps_count > 0 
          ? '✅ Applied' 
          : '⏳ Pending';
      
      console.log(`\n${index + 1}. ${migration.migration_name}`);
      console.log(`   Status: ${status}`);
      console.log(`   Applied: ${finishedAt}`);
      console.log(`   Duration: ${duration}`);
      console.log(`   Steps: ${migration.applied_steps_count}`);
      
      if (migration.rolled_back_at) {
        console.log(`   Rolled back: ${new Date(migration.rolled_back_at).toLocaleString()}`);
      }
      
      if (migration.logs) {
        console.log(`   Logs: ${migration.logs.substring(0, 100)}...`);
      }
    });
    
    console.log('\n' + '─'.repeat(80));
    
    // Check for pending migrations in filesystem
    const fs = require('fs');
    const path = require('path');
    const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
    
    if (fs.existsSync(migrationsDir)) {
      const filesystemMigrations = fs.readdirSync(migrationsDir)
        .filter(dir => /^\d{14}_/.test(dir))
        .sort()
        .reverse();
      
      const dbMigrationNames = new Set(migrations.map(m => m.migration_name));
      const pendingMigrations = filesystemMigrations.filter(m => !dbMigrationNames.has(m));
      
      if (pendingMigrations.length > 0) {
        console.log('\n⚠️  Pending migrations in filesystem:');
        pendingMigrations.forEach(m => {
          console.log(`   - ${m}`);
        });
        console.log('\nRun "npx prisma migrate deploy" to apply them.');
      } else {
        console.log('\n✅ All filesystem migrations have been applied to the database.');
      }
      
      console.log(`\n📁 Total migrations in filesystem: ${filesystemMigrations.length}`);
    }
    
    // Show migration statistics
    console.log('\n📊 Migration Statistics:');
    console.log('─'.repeat(80));
    
    const years = {};
    migrations.forEach(m => {
      if (m.finished_at) {
        const year = new Date(m.finished_at).getFullYear();
        years[year] = (years[year] || 0) + 1;
      }
    });
    
    Object.entries(years).sort().forEach(([year, count]) => {
      console.log(`   ${year}: ${count} migrations`);
    });
    
    // Show recent migration changes
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - 7);
    
    const recentMigrations = migrations.filter(m => 
      m.finished_at && new Date(m.finished_at) > recentCutoff
    );
    
    if (recentMigrations.length > 0) {
      console.log(`\n🆕 Migrations applied in the last 7 days: ${recentMigrations.length}`);
      recentMigrations.forEach(m => {
        console.log(`   - ${m.migration_name} (${new Date(m.finished_at).toLocaleDateString()})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error fetching migrations:', error.message);
    
    if (error.code === 'P2010') {
      console.error('\nThe _prisma_migrations table does not exist.');
      console.error('Run "npx prisma migrate dev" to initialize migrations.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);