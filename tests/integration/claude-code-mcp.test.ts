/**
 * Claude Code MCP Server Integration Test
 * 
 * Sonnet 4.5の明示的なモデル選択を検証
 */

import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('Claude Code MCP Server Integration', () => {
  let serverProcess: ChildProcess;
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    // Skip if ANTHROPIC_API_KEY is not set
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️ ANTHROPIC_API_KEY not set, skipping Claude Code MCP tests');
      return;
    }

    // Start Claude Code MCP Server
    serverProcess = spawn('node', ['dist/services/claude-code-mcp-server.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      }
    });

    transport = new StdioClientTransport({
      reader: serverProcess.stdout,
      writer: serverProcess.stdin
    });

    client = new Client(
      {
        name: 'claude-code-mcp-test',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );

    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  test('should list available tools', async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return;
    }

    const tools = await client.listTools();
    
    expect(tools.tools).toHaveLength(2);
    expect(tools.tools.map(t => t.name)).toContain('analyze_with_sonnet45');
    expect(tools.tools.map(t => t.name)).toContain('code_with_sonnet45');
  });

  test('should invoke Sonnet 4.5 via analyze_with_sonnet45', async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return;
    }

    const result = await client.callTool({
      name: 'analyze_with_sonnet45',
      arguments: {
        prompt: 'What is 2+2? Just answer with the number.',
        maxTurns: 1
      }
    });

    expect(result).toBeDefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('4');
  }, 60000);

  test('should verify Sonnet 4.5 model is used', async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return;
    }

    // Ask Claude to identify itself
    const result = await client.callTool({
      name: 'analyze_with_sonnet45',
      arguments: {
        prompt: 'Which Claude model are you? Just state your model name.',
        maxTurns: 1
      }
    });

    expect(result).toBeDefined();
    expect(result.content).toHaveLength(1);
    
    const response = result.content[0].text.toLowerCase();
    
    // Verify response mentions Sonnet 4.5 or similar
    const isSonnet45 = 
      response.includes('sonnet') && 
      (response.includes('4.5') || response.includes('4-5'));
    
    expect(isSonnet45).toBe(true);
  }, 60000);

  test('should handle errors gracefully', async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return;
    }

    // Test with empty prompt (should fail validation)
    await expect(
      client.callTool({
        name: 'analyze_with_sonnet45',
        arguments: {
          prompt: ''
        }
      })
    ).rejects.toThrow();
  });
});

describe('Wall-Bounce Analyzer with Claude MCP', () => {
  test('should use Claude MCP for Sonnet 4.5 invocation', async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️ ANTHROPIC_API_KEY not set, skipping Wall-Bounce MCP test');
      return;
    }

    const { WallBounceAnalyzer } = require('../../dist/services/wall-bounce-analyzer');
    const analyzer = new WallBounceAnalyzer();

    // Test Wall-Bounce with minimal configuration
    const result = await analyzer.executeWallBounce(
      'Test query: What is TypeScript?',
      {
        mode: 'parallel',
        depth: 1,
        taskType: 'basic',
        includeThinking: false
      }
    );

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    
    // Verify Claude was invoked
    const claudeResponses = result.responses?.filter((r: any) => 
      r.provider?.includes('Sonnet') || r.provider?.includes('Opus')
    );
    
    expect(claudeResponses?.length).toBeGreaterThan(0);
  }, 120000);
});
