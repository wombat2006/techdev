/**
 * Codex MCP Server Tests
 *
 * Comprehensive test suite for the Codex MCP Server implementation
 * Based on OpenAI Codex documentation and MCP protocol specifications
 */

import { CodexMCPServer, CodexMCPConfig } from '../../src/services/codex-mcp-server';
import { getCodexMCPIntegration } from '../../src/services/codex-mcp-integration';
import { getCodexSessionManager } from '../../src/services/codex-session-manager';
import { logger } from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/services/codex-session-manager');
jest.mock('../../src/utils/logger');
jest.mock('child_process');
jest.mock('fs/promises');

describe('CodexMCPServer', () => {
  let server: CodexMCPServer;
  let mockSessionManager: any;

  const defaultConfig: CodexMCPConfig = {
    model: 'gpt-5-codex',
    sandbox: 'read-only',
    approval_policy: 'auto',
    max_concurrent_sessions: 5,
    session_timeout_ms: 30000,
    rust_log_level: 'info',
    enable_tracing: true,
    enable_wall_bounce: false // Disable for unit tests
  };

  beforeEach(() => {
    mockSessionManager = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      continueSession: jest.fn(),
      addAssistantResponse: jest.fn(),
      updateSessionStatus: jest.fn(),
      getConversationHistory: jest.fn(),
      getSessionStats: jest.fn(),
      cleanupExpiredSessions: jest.fn()
    };

    (getCodexSessionManager as jest.Mock).mockReturnValue(mockSessionManager);
    server = new CodexMCPServer(defaultConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultServer = new CodexMCPServer();
      expect(defaultServer).toBeInstanceOf(CodexMCPServer);
    });

    it('should initialize with custom configuration', () => {
      const customConfig: CodexMCPConfig = {
        model: 'gpt-5',
        sandbox: 'isolated',
        approval_policy: 'manual'
      };

      const customServer = new CodexMCPServer(customConfig);
      expect(customServer).toBeInstanceOf(CodexMCPServer);
    });

    it('should merge custom config with defaults', () => {
      const partialConfig: CodexMCPConfig = {
        model: 'o1',
        max_concurrent_sessions: 15
      };

      const server = new CodexMCPServer(partialConfig);
      expect(server).toBeInstanceOf(CodexMCPServer);
    });
  });

  describe('MCP Tool Handlers', () => {
    describe('codex tool', () => {
      it('should handle basic codex tool execution', async () => {
        // Mock session creation
        const mockSession = {
          sessionId: 'test-session-123',
          conversationId: 'test-conv-456',
          model: 'gpt-5-codex',
          sandbox: 'read-only'
        };

        mockSessionManager.createSession.mockResolvedValue(mockSession);
        mockSessionManager.addAssistantResponse.mockResolvedValue(undefined);
        mockSessionManager.updateSessionStatus.mockResolvedValue(undefined);

        // Mock Codex execution
        const mockExecuteCodex = jest.spyOn(server as any, 'executeCodex');
        mockExecuteCodex.mockResolvedValue({
          success: true,
          response: 'def hello_world():\n    print("Hello, World!")',
          session_id: 'test-session-123'
        });

        const args = {
          prompt: 'Write a hello world function in Python',
          model: 'gpt-5-codex',
          sandbox: 'read-only',
          mode: 'non-interactive'
        };

        const result = await (server as any).handleCodexTool(args);

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'def hello_world():\n    print("Hello, World!")'
            }
          ],
          conversationId: 'test-conv-456',
          sessionId: 'test-session-123',
          isError: false
        });

        expect(mockSessionManager.createSession).toHaveBeenCalledWith({
          prompt: 'Write a hello world function in Python',
          model: 'gpt-5-codex',
          sandbox: 'read-only'
        });

        expect(mockSessionManager.addAssistantResponse).toHaveBeenCalledWith(
          'test-session-123',
          'def hello_world():\n    print("Hello, World!")'
        );

        expect(mockSessionManager.updateSessionStatus).toHaveBeenCalledWith(
          'test-session-123',
          'completed'
        );
      });

      it('should handle codex tool execution with full automation', async () => {
        const mockSession = {
          sessionId: 'test-session-auto',
          conversationId: 'test-conv-auto',
          model: 'gpt-5-codex',
          sandbox: 'isolated'
        };

        mockSessionManager.createSession.mockResolvedValue(mockSession);

        const mockExecuteCodex = jest.spyOn(server as any, 'executeCodex');
        mockExecuteCodex.mockResolvedValue({
          success: true,
          response: 'Automated script execution completed',
          session_id: 'test-session-auto'
        });

        const args = {
          prompt: 'Create and run a test script',
          mode: 'ci',
          full_auto: true,
          sandbox: 'isolated'
        };

        const result = await (server as any).handleCodexTool(args);

        expect(result.isError).toBe(false);
        expect(result.content[0].text).toBe('Automated script execution completed');
      });

      it('should handle codex tool execution errors', async () => {
        mockSessionManager.createSession.mockRejectedValue(new Error('Redis connection failed'));

        const args = {
          prompt: 'Write a function',
          model: 'gpt-5-codex'
        };

        const result = await (server as any).handleCodexTool(args);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Execution failed');
        expect(result.content[0].text).toContain('Redis connection failed');
      });
    });

    describe('codex-reply tool', () => {
      it('should handle conversation continuation with session_id', async () => {
        const mockSession = {
          sessionId: 'existing-session',
          conversationId: 'existing-conv',
          model: 'gpt-5-codex',
          sandbox: 'read-only'
        };

        const mockHistory = [
          {
            type: 'user',
            content: 'Write a function to calculate factorial',
            timestamp: '2024-01-01T10:00:00Z'
          },
          {
            type: 'assistant',
            content: 'def factorial(n):\n    return 1 if n <= 1 else n * factorial(n-1)',
            timestamp: '2024-01-01T10:00:30Z'
          }
        ];

        mockSessionManager.continueSession.mockResolvedValue(mockSession);
        mockSessionManager.getConversationHistory.mockResolvedValue(mockHistory);
        mockSessionManager.addAssistantResponse.mockResolvedValue(undefined);
        mockSessionManager.updateSessionStatus.mockResolvedValue(undefined);

        const mockExecuteCodex = jest.spyOn(server as any, 'executeCodex');
        mockExecuteCodex.mockResolvedValue({
          success: true,
          response: 'Here are some test cases for the factorial function:\n\nassert factorial(0) == 1\nassert factorial(5) == 120',
          session_id: 'existing-session'
        });

        const args = {
          prompt: 'Add test cases for this function',
          session_id: 'existing-session'
        };

        const result = await (server as any).handleCodexReplyTool(args);

        expect(result.isError).toBe(false);
        expect(result.sessionId).toBe('existing-session');
        expect(result.content[0].text).toContain('test cases');

        expect(mockSessionManager.continueSession).toHaveBeenCalledWith({
          sessionId: 'existing-session',
          conversationId: undefined,
          prompt: 'Add test cases for this function'
        });
      });

      it('should handle conversation continuation with conversation_id', async () => {
        const mockSession = {
          sessionId: 'session-from-conv',
          conversationId: 'target-conv-id',
          model: 'gpt-5-codex',
          sandbox: 'read-only'
        };

        mockSessionManager.continueSession.mockResolvedValue(mockSession);
        mockSessionManager.getConversationHistory.mockResolvedValue([]);

        const mockExecuteCodex = jest.spyOn(server as any, 'executeCodex');
        mockExecuteCodex.mockResolvedValue({
          success: true,
          response: 'Continued conversation response',
          session_id: 'session-from-conv'
        });

        const args = {
          prompt: 'Continue the conversation',
          conversation_id: 'target-conv-id'
        };

        const result = await (server as any).handleCodexReplyTool(args);

        expect(result.isError).toBe(false);
        expect(result.conversationId).toBe('target-conv-id');
      });

      it('should handle session not found error', async () => {
        mockSessionManager.continueSession.mockResolvedValue(null);

        const args = {
          prompt: 'Continue conversation',
          session_id: 'non-existent-session'
        };

        const result = await (server as any).handleCodexReplyTool(args);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Session not found');
      });

      it('should require either session_id or conversation_id', async () => {
        const args = {
          prompt: 'Continue conversation'
          // Missing both session_id and conversation_id
        };

        const result = await (server as any).handleCodexReplyTool(args);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('must be provided');
      });
    });

    describe('codex-session-info tool', () => {
      it('should return session statistics when list_active is true', async () => {
        const mockStats = {
          totalActiveSessions: 3,
          totalConversations: 5,
          oldestSession: 'session-123'
        };

        mockSessionManager.getSessionStats.mockResolvedValue(mockStats);

        const args = { list_active: true };
        const result = await (server as any).handleSessionInfoTool(args);

        expect(result.isError).toBe(false);
        expect(JSON.parse(result.content[0].text)).toEqual(mockStats);
      });

      it('should return specific session info when session_id provided', async () => {
        const mockSession = {
          sessionId: 'test-session',
          conversationId: 'test-conv',
          status: 'active'
        };

        const mockHistory = [
          { type: 'user', content: 'Hello', timestamp: '2024-01-01T10:00:00Z' }
        ];

        mockSessionManager.getSession.mockResolvedValue(mockSession);
        mockSessionManager.getConversationHistory.mockResolvedValue(mockHistory);

        const args = { session_id: 'test-session' };
        const result = await (server as any).handleSessionInfoTool(args);

        expect(result.isError).toBe(false);
        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.session).toEqual(mockSession);
        expect(responseData.history).toEqual(mockHistory);
      });

      it('should handle missing parameters', async () => {
        const args = {}; // No parameters provided
        const result = await (server as any).handleSessionInfoTool(args);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Please provide session_id or set list_active');
      });
    });

    describe('codex-cleanup tool', () => {
      it('should perform normal cleanup', async () => {
        mockSessionManager.cleanupExpiredSessions.mockResolvedValue({ cleaned: 2 });

        const args = { force: false };
        const result = await (server as any).handleCleanupTool(args);

        expect(result.isError).toBe(false);
        expect(result.content[0].text).toContain('Removed 2 expired sessions');
        expect(result.content[0].text).not.toContain('Forced termination');
      });

      it('should perform forced cleanup', async () => {
        mockSessionManager.cleanupExpiredSessions.mockResolvedValue({ cleaned: 1 });

        // Add some active processes to test force cleanup
        (server as any).activeProcesses.set('test-session', {
          kill: jest.fn()
        });

        const args = { force: true };
        const result = await (server as any).handleCleanupTool(args);

        expect(result.isError).toBe(false);
        expect(result.content[0].text).toContain('Removed 1 expired sessions');
        expect(result.content[0].text).toContain('Forced termination');
      });
    });
  });

  describe('Risk Assessment', () => {
    it('should assess risk level correctly', () => {
      const assessRiskLevel = (server as any).assessRiskLevel.bind(server);

      expect(assessRiskLevel('full-access', true, 'ci')).toBe('critical');
      expect(assessRiskLevel('full-access', false, 'interactive')).toBe('high');
      expect(assessRiskLevel('isolated', true, 'interactive')).toBe('medium');
      expect(assessRiskLevel('isolated', false, 'ci')).toBe('medium');
      expect(assessRiskLevel('read-only', false, 'interactive')).toBe('low');
    });
  });

  describe('Context Building', () => {
    it('should build context prompt from conversation history', () => {
      const history = [
        {
          type: 'user',
          content: 'Write a function to sort an array',
          timestamp: '2024-01-01T10:00:00Z'
        },
        {
          type: 'assistant',
          content: 'def sort_array(arr):\n    return sorted(arr)',
          timestamp: '2024-01-01T10:00:30Z'
        },
        {
          type: 'user',
          content: 'Add error handling',
          timestamp: '2024-01-01T10:01:00Z'
        }
      ];

      const newPrompt = 'Also add type hints';
      const contextPrompt = (server as any).buildContextPrompt(history, newPrompt);

      expect(contextPrompt).toContain('# Conversation History');
      expect(contextPrompt).toContain('**User**: Write a function to sort an array');
      expect(contextPrompt).toContain('**Assistant**: def sort_array(arr)');
      expect(contextPrompt).toContain('**User**: Add error handling');
      expect(contextPrompt).toContain('# Current Request');
      expect(contextPrompt).toContain('Also add type hints');
    });

    it('should limit history to last 5 messages', () => {
      const longHistory = Array.from({ length: 10 }, (_, i) => ({
        type: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date().toISOString()
      }));

      const newPrompt = 'New request';
      const contextPrompt = (server as any).buildContextPrompt(longHistory, newPrompt);

      // Should only contain the last 5 messages
      expect(contextPrompt).toContain('Message 5');
      expect(contextPrompt).toContain('Message 9');
      expect(contextPrompt).not.toContain('Message 0');
      expect(contextPrompt).not.toContain('Message 4');
    });
  });

  describe('Server Lifecycle', () => {
    it('should start server successfully', async () => {
      const mockConnect = jest.fn().mockResolvedValue(undefined);

      // Mock the server connection
      const originalConnect = (server as any).server.connect;
      (server as any).server.connect = mockConnect;

      await expect(server.start()).resolves.not.toThrow();
      expect(mockConnect).toHaveBeenCalled();

      // Restore original method
      (server as any).server.connect = originalConnect;
    });

    it('should stop server and cleanup processes', async () => {
      // Add mock active processes
      const mockProcess1 = { kill: jest.fn() };
      const mockProcess2 = { kill: jest.fn() };

      (server as any).activeProcesses.set('session1', mockProcess1);
      (server as any).activeProcesses.set('session2', mockProcess2);

      mockSessionManager.cleanupExpiredSessions.mockResolvedValue({ cleaned: 0 });

      await server.stop();

      expect(mockProcess1.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess2.kill).toHaveBeenCalledWith('SIGTERM');
      expect((server as any).activeProcesses.size).toBe(0);
      expect(mockSessionManager.cleanupExpiredSessions).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle session manager errors gracefully', async () => {
      mockSessionManager.createSession.mockRejectedValue(new Error('Database error'));

      const args = {
        prompt: 'Test prompt',
        model: 'gpt-5-codex'
      };

      const result = await (server as any).handleCodexTool(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Execution failed');
    });

    it('should handle unknown tool names', async () => {
      try {
        await (server as any).server.request({
          method: 'tools/call',
          params: {
            name: 'unknown-tool',
            arguments: {}
          }
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});

describe('CodexMCPIntegration', () => {
  let integration: any;

  beforeEach(async () => {
    integration = getCodexMCPIntegration();
  });

  describe('Configuration Loading', () => {
    it('should load configuration from TOML file', async () => {
      // Mock fs.readFile
      const mockTomlContent = `
[codex]
model = "gpt-5"
sandbox = "isolated"

[mcp]
approval_policy = "manual"
enable_wall_bounce = false
      `;

      const fs = require('fs/promises');
      fs.readFile = jest.fn().mockResolvedValue(mockTomlContent);

      await integration.initialize();

      const status = integration.getStatus();
      expect(status.config.model).toBe('gpt-5');
      expect(status.config.sandbox).toBe('isolated');
      expect(status.config.approval_policy).toBe('manual');
      expect(status.config.enable_wall_bounce).toBe(false);
    });

    it('should use default configuration when file is not found', async () => {
      const fs = require('fs/promises');
      fs.readFile = jest.fn().mockRejectedValue(new Error('File not found'));

      await integration.initialize();

      const status = integration.getStatus();
      expect(status.config.model).toBe('gpt-5-codex');
      expect(status.config.sandbox).toBe('read-only');
      expect(status.config.approval_policy).toBe('risk-based');
    });
  });

  describe('Wall-Bounce Execution', () => {
    it('should execute with Wall-Bounce when enabled', async () => {
      await integration.initialize();

      const request = {
        prompt: 'Write a sorting algorithm',
        context: {
          task_type: 'premium' as const,
          cost_tier: 'medium' as const,
          user_id: 'test-user'
        },
        options: {
          enable_wall_bounce: true
        }
      };

      // Mock MCP integration service
      const mockMCPResult = {
        success: true,
        results: [{
          content: [{
            text: 'def quick_sort(arr): return sorted(arr)',
            type: 'text'
          }],
          sessionId: 'test-session',
          conversationId: 'test-conv'
        }],
        cost_analysis: {
          estimated_cost: 0.05,
          actual_cost: 0.05
        },
        performance_metrics: {
          execution_time_ms: 2000
        }
      };

      // Mock the MCP integration
      const mcpIntegrationService = require('../../src/services/mcp-integration-service');
      mcpIntegrationService.mcpIntegrationService = {
        executeMCPTools: jest.fn().mockResolvedValue(mockMCPResult)
      };

      const result = await integration.executeCodexWithWallBounce(request);

      expect(result.success).toBe(true);
      expect(result.response).toContain('quick_sort');
      expect(result.wall_bounce_analysis).toBeDefined();
      expect(result.cost_analysis.actual_cost).toBe(0.05);
    });

    it('should execute directly when Wall-Bounce is disabled', async () => {
      await integration.initialize();

      const request = {
        prompt: 'Write a hello world function',
        context: {
          task_type: 'basic' as const,
          cost_tier: 'low' as const
        },
        options: {
          enable_wall_bounce: false
        }
      };

      // Mock direct execution
      integration.server = {
        handleCodexTool: jest.fn().mockResolvedValue({
          content: [{
            text: 'def hello(): print("Hello, World!")',
            type: 'text'
          }],
          sessionId: 'direct-session',
          conversationId: 'direct-conv',
          isError: false
        })
      };

      const result = await integration.executeCodexWithWallBounce(request);

      expect(result.success).toBe(true);
      expect(result.response).toContain('Hello, World!');
      expect(result.wall_bounce_analysis).toBeUndefined();
    });
  });

  describe('Status and Health', () => {
    it('should return correct status', async () => {
      const status = integration.getStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('started');
      expect(status).toHaveProperty('config');
    });

    it('should handle start and stop lifecycle', async () => {
      await integration.initialize();

      // Mock the server
      integration.server = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined)
      };

      await integration.start();
      expect(integration.getStatus().started).toBe(true);

      await integration.stop();
      expect(integration.getStatus().started).toBe(false);
    });
  });
});