import { jest } from '@jest/globals';

export const getRedisService = jest.fn();

export class UpstashRedisService {
  constructor(...args: any[]) {
    return getRedisService(...args) as any;
  }
}
