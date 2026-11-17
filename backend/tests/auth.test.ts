import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/password.js';
import { buildTestApp } from './helpers.js';

const account = { name: 'Ada Lovelace', email: 'Ada@Example.com', password: 'Analytical1' };

describe('password hashing', () => {
  it('verifies the right password and rejects the wrong one', async () => {
    const hash = await hashPassword('Correct-horse-1');
    expect(hash).not.toContain('Correct-horse-1');
    expect(await verifyPassword('Correct-horse-1', hash)).toBe(true);
    expect(await verifyPassword('wrong-password-1', hash)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same-password-1')).not.toBe(await hashPassword('same-password-1'));
  });
});

describe('POST /auth/register', () => {
  it('creates an account and returns a token, never the password hash', async () => {
    const { api } = buildTestApp();
    const res = await api.post('/auth/register').send(account).expect(201);

    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('rejects a duplicate email regardless of case', async () => {
    const { api } = buildTestApp();
    await api.post('/auth/register').send(account).expect(201);
    const res = await api
      .post('/auth/register')
      .send({ ...account, email: 'ADA@example.com' })
      .expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('validates name, email and password strength', async () => {
    const { api } = buildTestApp();
    const res = await api
      .post('/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' })
      .expect(422);
    const fields = res.body.error.details.map((d: { path: string }) => d.path);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });
});

describe('POST /auth/login', () => {
  it('logs in with the right credentials', async () => {
    const { api } = buildTestApp();
    await api.post('/auth/register').send(account).expect(201);

    const res = await api
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: account.password })
      .expect(200);
    expect(res.body.data.token).toEqual(expect.any(String));

    const me = await api
      .get('/auth/me')
      .set('Authorization', `Bearer ${res.body.data.token}`)
      .expect(200);
    expect(me.body.data.email).toBe('ada@example.com');
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const { api } = buildTestApp();
    await api.post('/auth/register').send(account).expect(201);

    const wrongPassword = await api
      .post('/auth/login')
      .send({ email: account.email, password: 'Nope12345' })
      .expect(401);
    const unknownEmail = await api
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'Nope12345' })
      .expect(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});

describe('protected routes', () => {
  it('reject requests without a valid token', async () => {
    const { api } = buildTestApp();
    await api.get('/user').expect(401);
    await api.get('/auth/me').set('Authorization', 'Bearer not-a-token').expect(401);
  });
});
