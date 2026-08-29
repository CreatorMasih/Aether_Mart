import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase3() {
  console.log('=== PHASE 3 — STORE DISCOVERY QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Verify PostgreSQL Store Record exists
  console.log('1. Checking PostgreSQL Stores...');
  const dbStores = await prisma.store.findMany({
    where: { isOpen: true, isPaused: false },
    include: { merchant: true }
  });

  console.log(`   Found ${dbStores.length} active store(s) in PostgreSQL database.`);
  if (dbStores.length === 0) {
    console.error('FAIL: No active store found in PostgreSQL database');
    process.exit(1);
  }

  const uatStore = dbStores[0];
  console.log(`   Sample Store in DB: id="${uatStore.id}", name="${uatStore.name}", address="${uatStore.address}", deliveryFee=₹${uatStore.deliveryFee}`);

  // Step 2: Query Home Feed API with Customer Coordinates in Mahasamund (21.1085, 82.0965)
  console.log('\n2. Querying Store Discovery API for Mahasamund Customer Coordinates (21.1085, 82.0965)...');
  const feedRes = await request(app)
    .get('/api/customer/home?lat=21.1085&lng=82.0965');

  console.log(`   HTTP ${feedRes.status}`);
  if (feedRes.status !== 200 || !feedRes.body.data || !feedRes.body.data.nearbyStores) {
    console.error('FAIL: Home Feed API response invalid:', feedRes.body);
    process.exit(1);
  }

  const nearbyStores = feedRes.body.data.nearbyStores;
  console.log(`   Discovered ${nearbyStores.length} store(s) via API.`);

  if (nearbyStores.length === 0) {
    console.error('FAIL: No stores returned in nearbyStores');
    process.exit(1);
  }

  const discoveredStore = nearbyStores[0];
  console.log('   Primary Discovered Store Details:');
  console.log(`   - ID: ${discoveredStore.id}`);
  console.log(`   - Name: ${discoveredStore.name}`);
  console.log(`   - Address: ${discoveredStore.address}`);
  console.log(`   - Distance: ${discoveredStore.distance} km`);
  console.log(`   - Delivery Fee: ₹${discoveredStore.deliveryFee}`);
  console.log(`   - Open Status: isOpen=${discoveredStore.isOpen}, isPaused=${discoveredStore.isPaused}`);

  // Verify DB Match
  if (discoveredStore.id !== uatStore.id) {
    console.error(`FAIL: Discovered store ID (${discoveredStore.id}) does not match DB store ID (${uatStore.id})`);
    process.exit(1);
  }

  // Verify distance sorting if multiple stores exist
  if (nearbyStores.length > 1) {
    let sortedCorrectly = true;
    for (let i = 0; i < nearbyStores.length - 1; i++) {
      if (nearbyStores[i].distance > nearbyStores[i + 1].distance) {
        sortedCorrectly = false;
        break;
      }
    }
    console.log(`   Distance Sorting Check: ${sortedCorrectly ? 'PASS (nearest store first)' : 'FAIL'}`);
    if (!sortedCorrectly) process.exit(1);
  }

  console.log('\n===============================================');
  console.log('🎉 PHASE 3 STORE DISCOVERY PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase3().catch((err) => {
  console.error('Phase 3 Store Discovery Failure:', err);
  process.exit(1);
});
