import request from 'supertest';
import { createApp } from '../src/app.js';
import { testDb, initSchema } from './setup.js';
import { hashPasswordSync, generateToken } from '../src/utils/crypto.js';

const app = createApp();

describe('Auth API', () => {
  beforeEach(() => {
    const db = testDb;
    // Insert test users
    const founderHash = hashPasswordSync('TheCompany2025!', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@thecompany.de', founderHash, 'Gruender', 'founder', 1);

    const adminHash = hashPasswordSync('admin123', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-admin', 'admin@thecompany.de', adminHash, 'Admin', 'admin', 1);

    const viewerHash = hashPasswordSync('viewer123', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-viewer', 'viewer@thecompany.de', viewerHash, 'Viewer', 'viewer', 1);
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials and return token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'founder@thecompany.de', password: 'TheCompany2025!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('founder@thecompany.de');
      expect(res.body.data.user.role).toBe('founder');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'founder@thecompany.de', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid');
    });

    it('should reject login for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'password' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const token = generateToken(
        { userId: 'user-founder', email: 'founder@thecompany.de', role: 'founder' },
        process.env.JWT_SECRET!
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('founder@thecompany.de');
    });

    it('should reject access without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject access with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const token = generateToken(
        { userId: 'user-founder', email: 'founder@thecompany.de', role: 'founder' },
        process.env.JWT_SECRET!
      );

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
