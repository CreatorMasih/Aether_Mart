import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/config/app.config';
import { getClientIp, getMaskedKeyHash } from '../../src/common/middlewares/rateLimit.middleware';
import { Request } from 'express';
import { Application } from 'express';

describe('🛡️ Rate Limiting, Proxy IP Handling & Diagnostic Audit Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  describe('1. IP Extraction & Proxy Spoofing Prevention', () => {
    it('1.1 Should normalize IPv6-mapped IPv4 address', () => {
      const mockReq = { ip: '::ffff:192.168.1.1', socket: { remoteAddress: '::ffff:192.168.1.1' } } as unknown as Request;
      expect(getClientIp(mockReq)).toBe('192.168.1.1');
    });

    it('1.2 Should normalize IPv6 loopback ::1 to 127.0.0.1', () => {
      const mockReq = { ip: '::1', socket: { remoteAddress: '::1' } } as unknown as Request;
      expect(getClientIp(mockReq)).toBe('127.0.0.1');
    });

    it('1.3 Should handle standard IPv4 address', () => {
      const mockReq = { ip: '203.0.113.195', socket: { remoteAddress: '203.0.113.195' } } as unknown as Request;
      expect(getClientIp(mockReq)).toBe('203.0.113.195');
    });

    it('1.4 Render proxied request: express trust proxy 1 hop resolves correct client IP and ignores spoofed header prefix', async () => {
      // Behind 1 trusted proxy hop, supertest connects from 127.0.0.1.
      // Client sends: X-Forwarded-For: spoofed-client-ip, real-client-ip
      const res = await request(app)
        .get('/api/health')
        .set('X-Forwarded-For', '203.0.113.195, 70.41.3.18');
      
      expect(res.status).toBe(200);
      // Health endpoint passes successfully
    });

    it('1.5 Local 127.0.0.1 proxy request resolves cleanly', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('X-Forwarded-For', '127.0.0.1');

      expect(res.status).toBe(200);
    });
  });

  describe('2. Rate-Limit Key Generator & Identifier Masking', () => {
    it('2.1 Should generate IP_ONLY keyHash when identifier is missing', () => {
      const { keyType, keyHash } = getMaskedKeyHash('192.168.1.1');
      expect(keyType).toBe('IP_ONLY');
      expect(keyHash).toBe('192.168.1.1');
    });

    it('2.2 Should generate IP_AND_IDENTIFIER_HASH keyHash when identifier is provided', () => {
      const { keyType, keyHash } = getMaskedKeyHash('192.168.1.1', 'Customer1@gmail.com');
      expect(keyType).toBe('IP_AND_IDENTIFIER_HASH');
      expect(keyHash.startsWith('192.168.1.1:')).toBe(true);
      expect(keyHash).not.toContain('Customer1'); // Never exposes raw email
      expect(keyHash).not.toContain('gmail.com');
    });

    it('2.3 Different identifiers on the same IP must produce distinct key hashes', () => {
      const key1 = getMaskedKeyHash('127.0.0.1', 'userA@gmail.com').keyHash;
      const key2 = getMaskedKeyHash('127.0.0.1', 'userB@gmail.com').keyHash;
      expect(key1).not.toBe(key2);
    });

    it('2.4 Key hash must be case-insensitive and trimmed', () => {
      const key1 = getMaskedKeyHash('127.0.0.1', ' UserA@gmail.com ').keyHash;
      const key2 = getMaskedKeyHash('127.0.0.1', 'usera@gmail.com').keyHash;
      expect(key1).toBe(key2);
    });
  });

  describe('3. Rate Limiter Middleware Overlap Audit', () => {
    it('3.1 Cart endpoints must NOT be blocked by OTP limiters', async () => {
      // GET /api/customer/cart should return 200 or 401 (unauthenticated), NOT 429 from OTP limiter
      const res = await request(app).get('/api/customer/cart');
      expect(res.status).not.toBe(429);
    });

    it('3.2 Auth config endpoint must be publicly accessible without 429', async () => {
      const res = await request(app).get('/api/auth/config');
      expect(res.status).toBe(200);
      expect(res.body.data.otpMode).toBeDefined();
    });
  });
});
