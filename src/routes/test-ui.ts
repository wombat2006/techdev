import express, { Request, Response } from 'express';
import { WallBounceAnalyzer } from '../services/wall-bounce-analyzer';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /test-ui
 * Server-rendered test page
 */
router.get('/', (req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TechSapo Test (Server-Rendered)</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
            background: #f5f5f5;
        }
        h1 {
            color: #667eea;
        }
        form {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .form-group {
            margin: 15px 0;
        }
        label {
            display: block;
            font-weight: bold;
            margin-bottom: 5px;
        }
        input[type="text"] {
            width: 100%;
            padding: 10px;
            font-size: 16px;
            border: 2px solid #667eea;
            border-radius: 5px;
            box-sizing: border-box;
        }
        button {
            width: 100%;
            padding: 15px;
            font-size: 18px;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
        }
        button:active {
            transform: scale(0.98);
        }
        .note {
            margin-top: 20px;
            padding: 10px;
            background: #fff3cd;
            border-radius: 5px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <h1>🧪 TechSapo Server-Rendered Test</h1>

    <form method="POST" action="/test-ui">
        <div class="form-group">
            <label for="question">質問を入力してください：</label>
            <input type="text" id="question" name="question" value="test" required>
        </div>

        <button type="submit">Submit Test</button>
    </form>

    <div class="note">
        <strong>Note:</strong> このページはサーバーサイドレンダリングです。Submitを押すとページ全体が再読み込みされ、結果が表示されます。
    </div>
</body>
</html>
  `;

  res.send(html);
});

/**
 * POST /test-ui
 * Process form and return results
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.send(`
        <!DOCTYPE html>
        <html><body style="font-family: Arial; padding: 20px;">
          <h1 style="color: red;">❌ Error</h1>
          <p>Question is required</p>
          <a href="/test-ui">← Back</a>
        </body></html>
      `);
    }

    logger.info('Test UI: Processing question', { question });

    const analyzer = new WallBounceAnalyzer();
    const result = await analyzer.executeWallBounce(question, {
      taskType: 'basic',
      mode: 'parallel',
      depth: 3
    });

    logger.info('Test UI: Analysis complete', {
      question,
      stepCount: result.llm_votes.length,
      confidence: result.consensus.confidence
    });

    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TechSapo Test Results</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            background: #f5f5f5;
        }
        h1 {
            color: #667eea;
        }
        .success {
            background: #d4edda;
            border: 2px solid #28a745;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .step {
            background: white;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #667eea;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .provider {
            font-weight: bold;
            color: #667eea;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .response {
            color: #333;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        .consensus {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
        }
        .back-btn {
            display: inline-block;
            padding: 10px 20px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <h1>✅ Wall-Bounce Analysis Results</h1>

    <div class="success">
        <strong>Question:</strong> ${escapeHtml(question)}<br>
        <strong>Steps Received:</strong> ${result.llm_votes.length}<br>
        <strong>Status:</strong> SUCCESS
    </div>

    <h2>Provider Responses:</h2>

    ${result.llm_votes.map(vote => `
      <div class="step">
        <div class="provider">${escapeHtml(vote.provider)}</div>
        <div class="response">${escapeHtml(vote.response.content.substring(0, 500))}${vote.response.content.length > 500 ? '...' : ''}</div>
      </div>
    `).join('')}

    <div class="consensus">
        <h2 style="margin: 0 0 10px 0;">Final Consensus</h2>
        <div style="font-size: 24px; font-weight: bold;">${Math.round(result.consensus.confidence * 100)}% Confidence</div>
        <div style="margin-top: 15px; opacity: 0.9;">${escapeHtml(result.consensus.reasoning)}</div>
    </div>

    <a href="/test-ui" class="back-btn">← Test Again</a>
</body>
</html>
    `;

    res.send(html);

  } catch (error) {
    logger.error('Test UI error', { error });

    res.send(`
      <!DOCTYPE html>
      <html><body style="font-family: Arial; padding: 20px;">
        <h1 style="color: red;">❌ Error</h1>
        <p>${error instanceof Error ? escapeHtml(error.message) : 'Unknown error'}</p>
        <a href="/test-ui">← Back</a>
      </body></html>
    `);
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default router;