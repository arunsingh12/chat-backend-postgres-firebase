import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.js';

describe('messages', () => {
  let t: ReturnType<typeof buildTestApp>;
  let alice: string;
  let bob: string;
  let chatId: string;

  beforeEach(async () => {
    t = buildTestApp();
    alice = await t.createUser('Alice');
    bob = await t.createUser('Bob');
    chatId = await t.createDirectChat(alice, bob);
  });

  it('sends a message and returns it with a timestamp and the sender receipt', async () => {
    const message = await t.sendMessage(chatId, alice, '  Hello Bob  ');
    expect(message).toMatchObject({ text: 'Hello Bob', senderId: alice });
    expect(Date.parse(message.createdAt)).not.toBeNaN();
    expect(Object.keys(message.readBy)).toEqual([alice]);
  });

  it('rejects senders who are not members', async () => {
    const mallory = await t.createUser('Mallory');
    await t
      .as(mallory)
      .post(`/chat/${chatId}/message/send`)
      .send({ senderId: mallory, text: 'hi' })
      .expect(403);
  });

  it('rejects sending as someone else', async () => {
    const res = await t
      .as(bob)
      .post(`/chat/${chatId}/message/send`)
      .send({ senderId: alice, text: 'impersonation' })
      .expect(403);
    expect(res.body.error.message).toMatch(/senderId/);
  });

  it('hides messages from non-members', async () => {
    const mallory = await t.createUser('Mallory');
    await t.as(mallory).get(`/chat/${chatId}/messages`).expect(403);
  });

  it('lists messages oldest → newest and paginates backwards with a cursor', async () => {
    for (const text of ['one', 'two', 'three']) await t.sendMessage(chatId, alice, text);

    const latest = await t.as(bob).get(`/chat/${chatId}/messages?limit=2`).expect(200);
    expect(latest.body.data.messages.map((m: { text: string }) => m.text)).toEqual([
      'two',
      'three',
    ]);
    expect(latest.body.data.hasMore).toBe(true);

    const older = await t
      .as(bob)
      .get(`/chat/${chatId}/messages?limit=2&before=${latest.body.data.nextCursor}`)
      .expect(200);
    expect(older.body.data.messages.map((m: { text: string }) => m.text)).toEqual(['one']);
    expect(older.body.data.hasMore).toBe(false);
  });

  it('caps the page size', async () => {
    await t.as(alice).get(`/chat/${chatId}/messages?limit=500`).expect(422);
  });

  it('marks a message as read idempotently', async () => {
    const message = await t.sendMessage(chatId, alice, 'ping');

    const first = await t
      .as(bob)
      .post(`/chat/${chatId}/message/${message.id}/read`)
      .send({ userId: bob })
      .expect(200);
    const readAt = first.body.data.readBy[bob];
    expect(readAt).toBeDefined();

    const second = await t
      .as(bob)
      .post(`/chat/${chatId}/message/${message.id}/read`)
      .send({ userId: bob })
      .expect(200);
    expect(second.body.data.readBy[bob]).toBe(readAt);
  });

  it('tracks last seen per user and never moves it backwards', async () => {
    const older = await t.sendMessage(chatId, alice, 'first');
    const newer = await t.sendMessage(chatId, alice, 'second');

    await t
      .as(bob)
      .post(`/chat/${chatId}/lastseen`)
      .send({ userId: bob, messageId: newer.id })
      .expect(200);
    const stale = await t
      .as(bob)
      .post(`/chat/${chatId}/lastseen`)
      .send({ userId: bob, messageId: older.id })
      .expect(200);
    expect(stale.body.data.lastSeenMessageId).toBe(newer.id);

    const states = await t.as(alice).get(`/chat/${chatId}/lastseen`).expect(200);
    expect(states.body.data).toEqual([
      expect.objectContaining({ userId: bob, lastSeenMessageId: newer.id }),
    ]);
  });

  it('returns 404 for last seen on an unknown message', async () => {
    await t
      .as(bob)
      .post(`/chat/${chatId}/lastseen`)
      .send({ userId: bob, messageId: 'missing' })
      .expect(404);
  });

  it('only lets the sender edit or delete, and updates the chat preview', async () => {
    const message = await t.sendMessage(chatId, alice, 'typo');

    await t
      .as(bob)
      .patch(`/chat/${chatId}/message/${message.id}`)
      .send({ senderId: bob, text: 'hijack' })
      .expect(403);

    const edited = await t
      .as(alice)
      .patch(`/chat/${chatId}/message/${message.id}`)
      .send({ senderId: alice, text: 'fixed' })
      .expect(200);
    expect(edited.body.data).toMatchObject({ text: 'fixed', editedAt: expect.any(String) });

    const deleted = await t
      .as(alice)
      .delete(`/chat/${chatId}/message/${message.id}`)
      .send({ senderId: alice })
      .expect(200);
    expect(deleted.body.data).toMatchObject({ text: '', deletedAt: expect.any(String) });

    const chats = await t.as(alice).get(`/user/${alice}/chats`).expect(200);
    expect(chats.body.data[0].lastMessage.preview).toBe('Message deleted');

    await t
      .as(alice)
      .patch(`/chat/${chatId}/message/${message.id}`)
      .send({ senderId: alice, text: 'again' })
      .expect(409);
  });
});
