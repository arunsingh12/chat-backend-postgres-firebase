import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildDirectKey } from '../src/modules/chats/chat.service.js';
import { buildTestApp } from './helpers.js';

describe('buildDirectKey', () => {
  it('is independent of argument order', () => {
    expect(buildDirectKey('b', 'a')).toBe(buildDirectKey('a', 'b'));
  });
});

describe('POST /chat/create', () => {
  let t: ReturnType<typeof buildTestApp>;
  let alice: string;
  let bob: string;

  beforeEach(async () => {
    t = buildTestApp();
    alice = await t.createUser('Alice');
    bob = await t.createUser('Bob');
  });

  it('creates a chat and then returns the same chat for either member order', async () => {
    const first = await t
      .as(alice)
      .post('/chat/create')
      .send({ userAId: alice, userBId: bob })
      .expect(201);
    expect(first.body.data.created).toBe(true);
    expect(first.body.data.chat.memberIds).toEqual(expect.arrayContaining([alice, bob]));

    const second = await t
      .as(bob)
      .post('/chat/create')
      .send({ userAId: bob, userBId: alice })
      .expect(200);
    expect(second.body.data.created).toBe(false);
    expect(second.body.data.chatId).toBe(first.body.data.chatId);
  });

  it('rejects a chat with yourself', async () => {
    const res = await t
      .as(alice)
      .post('/chat/create')
      .send({ userAId: alice, userBId: alice })
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects creating a chat between two other people', async () => {
    const carol = await t.createUser('Carol');
    await t.as(carol).post('/chat/create').send({ userAId: alice, userBId: bob }).expect(403);
  });

  it('validates the payload', async () => {
    const res = await t.as(alice).post('/chat/create').send({ userAId: 'nope' }).expect(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'userAId' })]),
    );
  });

  it('returns 404 when a user does not exist', async () => {
    await t
      .as(alice)
      .post('/chat/create')
      .send({ userAId: alice, userBId: randomUUID() })
      .expect(404);
  });
});

describe('GET /user/:userId/chats', () => {
  it('lists only chats the user belongs to, with member ids', async () => {
    const t = buildTestApp();
    const [alice, bob, carol] = await Promise.all(
      ['Alice', 'Bob', 'Carol'].map((name) => t.createUser(name)),
    );
    const aliceBob = await t.createDirectChat(alice!, bob!);
    await t.createDirectChat(bob!, carol!);

    const res = await t.as(alice!).get(`/user/${alice}/chats`).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: aliceBob, type: 'direct' });
    expect(res.body.data[0].memberIds).toEqual(expect.arrayContaining([alice, bob]));
  });

  it("does not expose another user's chats", async () => {
    const t = buildTestApp();
    const alice = await t.createUser('Alice');
    const bob = await t.createUser('Bob');
    await t.as(alice).get(`/user/${bob}/chats`).expect(403);
  });
});

describe('group chats', () => {
  it('lets the owner manage members and blocks plain members', async () => {
    const t = buildTestApp();
    const [owner, member, outsider] = await Promise.all(
      ['Owner', 'Member', 'Outsider'].map((name) => t.createUser(name)),
    );

    const created = await t
      .as(owner!)
      .post('/chat/group')
      .send({ creatorId: owner, name: 'Team', memberIds: [member] })
      .expect(201);
    const chatId = created.body.data.chatId as string;

    await t
      .as(member!)
      .post(`/chat/${chatId}/members`)
      .send({ requesterId: member, userIds: [outsider] })
      .expect(403);

    const added = await t
      .as(owner!)
      .post(`/chat/${chatId}/members`)
      .send({ requesterId: owner, userIds: [outsider] })
      .expect(200);
    expect(added.body.data.memberIds).toHaveLength(3);

    await t
      .as(owner!)
      .patch(`/chat/${chatId}`)
      .send({ requesterId: owner, name: 'Core team' })
      .expect(200);

    // A member may leave on their own.
    const left = await t
      .as(member!)
      .delete(`/chat/${chatId}/members/${member}`)
      .send({ requesterId: member })
      .expect(200);
    expect(left.body.data.memberIds).not.toContain(member);
  });
});
