import request from 'supertest';
import { createApp } from '../src/app.js';
import { createContainer } from '../src/container.js';
import { logger } from '../src/lib/logger.js';
import { createInMemoryRepositories } from './fakes/in-memory-repositories.js';

export const TEST_PASSWORD = 'Secret123';

export const buildTestApp = () => {
  const app = createApp(createContainer(createInMemoryRepositories(), logger));
  const api = request(app);
  const tokens = new Map<string, string>();

  /** Registers an account and remembers its token for `as(userId)`. */
  const createUser = async (name: string): Promise<string> => {
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@test.dev`;
    const res = await api
      .post('/auth/register')
      .send({ name, email, password: TEST_PASSWORD })
      .expect(201);
    tokens.set(res.body.data.user.id, res.body.data.token);
    return res.body.data.user.id as string;
  };

  /** Requests authenticated as the given user. */
  const as = (userId: string) => {
    const header = `Bearer ${tokens.get(userId)}`;
    return {
      get: (url: string) => api.get(url).set('Authorization', header),
      post: (url: string) => api.post(url).set('Authorization', header),
      patch: (url: string) => api.patch(url).set('Authorization', header),
      delete: (url: string) => api.delete(url).set('Authorization', header),
    };
  };

  const createDirectChat = async (userAId: string, userBId: string): Promise<string> => {
    const res = await as(userAId).post('/chat/create').send({ userAId, userBId });
    return res.body.data.chatId as string;
  };

  const sendMessage = async (chatId: string, senderId: string, text: string) => {
    const res = await as(senderId)
      .post(`/chat/${chatId}/message/send`)
      .send({ senderId, text })
      .expect(201);
    return res.body.data as { id: string; createdAt: string; readBy: Record<string, string> };
  };

  return { api, as, createUser, createDirectChat, sendMessage };
};
