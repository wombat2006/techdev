import RedisMock from 'ioredis-mock';
import { SessionManager } from '../../src/services/session-manager';
import { getRedisService } from '../../src/services/redis-service';

// Mock Redis service
jest.mock('../../src/services/redis-service');

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockRedisService: any;

  beforeEach(() => {
    mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      keys: jest.fn(),
      expire: jest.fn(),
      smembers: jest.fn(),
      srem: jest.fn(),
      sadd: jest.fn(),
      setSession: jest.fn(),
      getSession: jest.fn(),
      deleteSession: jest.fn(),
    };
    
    (getRedisService as jest.Mock).mockReturnValue(mockRedisService);
    sessionManager = new SessionManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Creation and Retrieval', () => {
    test('should create a new session', async () => {
      const userId = 'user-123';
      const metadata = { test: 'data' };
      
      mockRedisService.setSession.mockResolvedValue(undefined);

      const sessionId = await sessionManager.createSession(userId, metadata);
      
      expect(typeof sessionId).toBe('string');
      expect(sessionId).toContain('sess_');
      expect(mockRedisService.setSession).toHaveBeenCalled();
    });

    test('should get existing session', async () => {
      const sessionId = 'session-456';
      const expectedSession = {
        userId: 'user-123',
        sessionId,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        metadata: { test: 'data' }
      };

      mockRedisService.getSession.mockResolvedValue(expectedSession);

      const session = await sessionManager.getSession(sessionId);
      
      expect(session).toEqual(expectedSession);
      expect(mockRedisService.getSession).toHaveBeenCalledWith(sessionId);
    });

    test('should return null for non-existent session', async () => {
      const sessionId = 'non-existent';
      
      mockRedisService.getSession.mockResolvedValue(null);

      const session = await sessionManager.getSession(sessionId);
      
      expect(session).toBeNull();
    });
  });

  describe('Session Updates', () => {
    test('should update session data', async () => {
      const sessionId = 'session-789';
      const updateData = { metadata: { updated: 'data' } };
      
      mockRedisService.getSession.mockResolvedValue({
        userId: 'user-123',
        sessionId,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        metadata: { original: 'data' }
      });
      
      mockRedisService.setSession.mockResolvedValue(undefined);

      await sessionManager.updateSession(sessionId, updateData);
      
      expect(mockRedisService.setSession).toHaveBeenCalled();
    });

    test('should throw error when updating non-existent session', async () => {
      const sessionId = 'non-existent';
      
      mockRedisService.getSession.mockResolvedValue(null);

      await expect(sessionManager.updateSession(sessionId, {}))
        .rejects.toThrow('Session non-existent not found');
    });
  });

  describe('Conversation History', () => {
    test('should add conversation entry', async () => {
      const sessionId = 'session-conv';
      const entry = {
        userMessage: 'Hello',
        assistantResponse: 'Hi there!'
      };

      const existingSession = {
        userId: 'user-123',
        sessionId,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        conversationHistory: []
      };

      mockRedisService.getSession.mockResolvedValue(existingSession);
      mockRedisService.setSession.mockResolvedValue(undefined);

      await sessionManager.addConversationEntry(sessionId, entry);
      
      expect(mockRedisService.setSession).toHaveBeenCalled();
    });

    test('should get conversation history', async () => {
      const sessionId = 'session-history';
      const history = [
        { 
          id: 'entry1', 
          userMessage: 'Hello', 
          assistantResponse: 'Hi there!', 
          timestamp: new Date() 
        },
        { 
          id: 'entry2', 
          userMessage: 'How are you?', 
          assistantResponse: 'I am fine', 
          timestamp: new Date() 
        }
      ];

      mockRedisService.getSession.mockResolvedValue({
        userId: 'user-123',
        sessionId,
        conversationHistory: history
      });

      const result = await sessionManager.getConversationHistory(sessionId);
      
      expect(result).toEqual(history);
    });

    test('should return empty array for session without history', async () => {
      const sessionId = 'session-no-history';

      mockRedisService.getSession.mockResolvedValue({
        userId: 'user-123',
        sessionId
      });

      const result = await sessionManager.getConversationHistory(sessionId);
      
      expect(result).toEqual([]);
    });
  });

  describe('Session Cleanup', () => {
    test('should delete session', async () => {
      const sessionId = 'session-delete';
      
      mockRedisService.deleteSession.mockResolvedValue(undefined);

      await sessionManager.deleteSession(sessionId);
      
      expect(mockRedisService.deleteSession).toHaveBeenCalledWith(sessionId);
    });

    test('should cleanup expired sessions', async () => {
      const userKeys = ['user_sessions:user1', 'user_sessions:user2'];
      
      mockRedisService.keys.mockResolvedValue(userKeys);
      mockRedisService.smembers
        .mockResolvedValueOnce(['session1'])
        .mockResolvedValueOnce(['session2']);
      mockRedisService.exists.mockResolvedValue(false);
      mockRedisService.srem.mockResolvedValue(1);

      const deletedCount = await sessionManager.cleanupExpiredSessions();
      
      expect(deletedCount).toBeGreaterThanOrEqual(0);
      expect(mockRedisService.keys).toHaveBeenCalledWith('user_sessions:*');
    });
  });

  describe('User Sessions', () => {
    test('should get user sessions', async () => {
      const userId = 'user-456';
      const sessionIds = ['sess1', 'sess2'];
      const sessions = [
        { 
          userId, 
          sessionId: 'sess1', 
          createdAt: new Date(), 
          lastAccessedAt: new Date() 
        },
        { 
          userId, 
          sessionId: 'sess2', 
          createdAt: new Date(), 
          lastAccessedAt: new Date() 
        }
      ];

      mockRedisService.smembers.mockResolvedValue(sessionIds);
      mockRedisService.getSession
        .mockResolvedValueOnce(sessions[0])
        .mockResolvedValueOnce(sessions[1]);

      const result = await sessionManager.getUserSessions(userId);
      
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ userId }),
        expect.objectContaining({ userId })
      ]));
    });
  });

  describe('Error Handling', () => {
    test('should handle Redis errors gracefully', async () => {
      const sessionId = 'error-session';
      
      mockRedisService.getSession.mockRejectedValue(new Error('Redis error'));

      await expect(sessionManager.getSession(sessionId))
        .rejects.toThrow('Redis error');
    });

    test('should handle cleanup operations', async () => {
      const sessionKeys = ['session:sess1'];
      
      mockRedisService.keys.mockResolvedValue(sessionKeys);
      mockRedisService.smembers.mockResolvedValue(['sess1']);
      mockRedisService.exists.mockResolvedValue(false);
      mockRedisService.srem.mockResolvedValue(1);

      const result = await sessionManager.cleanupExpiredSessions();
      
      expect(typeof result).toBe('number');
    });
  });
});