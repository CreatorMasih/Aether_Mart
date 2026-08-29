import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase2() {
  console.log('=== PHASE 2 — CUSTOMER LOCATION QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Test 1: Serviceability check for PIN 493445 (Mahasamund)
  console.log('1. Testing PIN 493445 (Mahasamund Service Area)...');
  const pinRes = await request(app)
    .get('/api/location/serviceability?pincode=493445');

  console.log(`   HTTP ${pinRes.status}: ${JSON.stringify(pinRes.body.data)}`);
  if (pinRes.status !== 200 || !pinRes.body.data.isServiceable) {
    console.error('FAIL: PIN 493445 should be serviceable');
    process.exit(1);
  }
  console.log('   PASS: PIN 493445 accepted and marked serviceable!');

  // Test 2: Reverse geocode Mahasamund coordinates (lat: 21.1085, lon: 82.0965)
  console.log('\n2. Testing Reverse Geocode for Mahasamund coordinates (21.1085, 82.0965)...');
  const geoRes = await request(app)
    .post('/api/location/reverse-geocode')
    .send({ latitude: 21.1085, longitude: 82.0965 });

  console.log(`   HTTP ${geoRes.status}: isServiceable=${geoRes.body.data?.isServiceable}, area=${geoRes.body.data?.serviceArea}`);
  if (geoRes.status !== 200 || !geoRes.body.data.isServiceable) {
    console.error('FAIL: Mahasamund coordinates must resolve as serviceable');
    process.exit(1);
  }
  console.log('   PASS: Mahasamund coordinates resolved as serviceable!');

  // Test 3: Test outside service area (PIN 110001 - New Delhi or Delhi coordinates 28.6139, 77.2090)
  console.log('\n3. Testing Location Outside Service Area (Delhi - PIN 110001)...');
  const outsidePinRes = await request(app)
    .get('/api/location/serviceability?pincode=110001');

  console.log(`   HTTP ${outsidePinRes.status}: isServiceable=${outsidePinRes.body.data?.isServiceable}, msg="${outsidePinRes.body.data?.message}"`);
  if (outsidePinRes.status !== 200 || outsidePinRes.body.data.isServiceable !== false) {
    console.error('FAIL: Location outside Mahasamund must be marked UNSERVICEABLE');
    process.exit(1);
  }
  console.log('   PASS: Outside location correctly rejected with UNSERVICEABLE state!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 2 CUSTOMER LOCATION PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase2().catch((err) => {
  console.error('Phase 2 Location Test Failure:', err);
  process.exit(1);
});
