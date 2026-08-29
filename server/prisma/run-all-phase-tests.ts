import { execSync } from 'child_process';

async function runAllPhaseTests() {
  console.log('===============================================================');
  console.log('🚀 RUNNING FINAL FULL SYSTEM RE-VERIFICATION (PHASES 0 - 24)');
  console.log('===============================================================\n');

  const testScripts = [
    { phase: 'Phase 0', script: 'prisma/verify-phase0.ts' },
    { phase: 'Phase 1', script: 'prisma/test-phase1-auth.ts' },
    { phase: 'Phase 2', script: 'prisma/test-phase2-location.ts' },
    { phase: 'Phase 3', script: 'prisma/test-phase3-store-discovery.ts' },
    { phase: 'Phase 4', script: 'prisma/test-phase4-product-catalog.ts' },
    { phase: 'Phase 5', script: 'prisma/test-phase5-cart.ts' },
    { phase: 'Phase 6', script: 'prisma/test-phase6-checkout.ts' },
    { phase: 'Phase 7', script: 'prisma/test-phase7-cod-order.ts' },
    { phase: 'Phase 8', script: 'prisma/test-phase8-online-payment.ts' },
    { phase: 'Phase 9', script: 'prisma/test-phase9-merchant-alerts.ts' },
    { phase: 'Phase 10', script: 'prisma/test-phase10-rider-assignment.ts' },
    { phase: 'Phase 11', script: 'prisma/test-phase11-fulfillment-flow.ts' },
    { phase: 'Phase 12', script: 'prisma/test-phase12-live-tracking.ts' },
    { phase: 'Phase 13', script: 'prisma/test-phase13-rider-earnings.ts' },
    { phase: 'Phase 14', script: 'prisma/test-phase14-store-ops.ts' },
    { phase: 'Phase 15', script: 'prisma/test-phase15-split-orders.ts' },
    { phase: 'Phase 16', script: 'prisma/test-phase16-inventory-mgmt.ts' },
    { phase: 'Phase 17', script: 'prisma/test-phase17-cancellation-refunds.ts' },
    { phase: 'Phase 18', script: 'prisma/test-phase18-promo-discounts.ts' },
    { phase: 'Phase 19', script: 'prisma/test-phase19-profile-addresses.ts' },
    { phase: 'Phase 20', script: 'prisma/test-phase20-loyalty-rewards.ts' },
    { phase: 'Phase 21', script: 'prisma/test-phase21-ratings-reviews.ts' },
    { phase: 'Phase 22', script: 'prisma/test-phase22-search-filters.ts' },
    { phase: 'Phase 23', script: 'prisma/test-phase23-admin-dashboard.ts' },
    { phase: 'Phase 24', script: 'prisma/test-phase24-split-orders.ts' },
  ];

  let passed = 0;
  let failed = 0;

  for (const item of testScripts) {
    console.log(`\n---------------------------------------------------------------`);
    console.log(`▶ Running ${item.phase} Test Script (${item.script})...`);
    try {
      execSync(`npx tsx ${item.script}`, { encoding: 'utf-8', stdio: 'inherit' });
      console.log(`✅ ${item.phase} PASSED!`);
      passed++;
    } catch (err: any) {
      console.error(`❌ ${item.phase} FAILED!`);
      failed++;
    }
  }

  console.log('\n===============================================================');
  console.log(`🎉 SUMMARY: ${passed} PASSED, ${failed} FAILED OUT OF ${testScripts.length} PHASES`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllPhaseTests();
