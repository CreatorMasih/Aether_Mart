/**
 * Vitest global test setup.
 * Runs before all test files.
 */
import 'dotenv/config';

// Override env for testing
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_for_vitest_suite_only';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_for_vitest_suite_only';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.REDIS_ENABLED = 'false';
process.env.PORT = '5001';
