// LLM proxy routes - intentionally NOT auth-protected so the
// browser KI-Suche can talk to a local Ollama daemon without a login
// flow on first run. Lock these down behind authMiddleware before
// exposing the server beyond localhost.

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getOllama, type ChatMessage } from '../adapters/ollamaAdapter.js';

const router = Router();

router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  const ollama = getOllama();
  const reachable = await ollama.connect();
  if (!reachable) {
    res.json({
      success: true,
      data: { ...ollama.getStatus(), reachable: false, models: [] },
    });
    return;
  }
  let models: { name: string }[] = [];
  try {
    models = (await ollama.listModels()).map((m) => ({ name: m.name }));
  } catch {
    /* ignore */
  }
  res.json({
    success: true,
    data: { ...ollama.getStatus(), reachable: true, models },
  });
}));

router.post('/chat', asyncHandler(async (req: Request, res: Response) => {
  const { messages, model, temperature } = req.body as {
    messages?: ChatMessage[];
    model?: string;
    temperature?: number;
  };
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ success: false, error: 'messages[] required' });
    return;
  }
  try {
    const result = await getOllama().chat({ messages, model, temperature });
    res.json({
      success: true,
      data: {
        content: result.content,
        model: result.model,
        eval_count: result.raw.eval_count,
        eval_duration_ms: result.raw.eval_duration ? Math.round(result.raw.eval_duration / 1e6) : undefined,
      },
    });
  } catch (err) {
    res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : 'Ollama call failed',
    });
  }
}));

router.post('/stream', asyncHandler(async (req: Request, res: Response) => {
  const { messages, model, temperature } = req.body as {
    messages?: ChatMessage[];
    model?: string;
    temperature?: number;
  };
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ success: false, error: 'messages[] required' });
    return;
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const write = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    for await (const chunk of getOllama().chatStream({ messages, model, temperature })) {
      if (chunk.message?.content) write('delta', { content: chunk.message.content });
      if (chunk.done) {
        write('done', {
          eval_count: chunk.eval_count,
          eval_duration_ms: chunk.eval_duration ? Math.round(chunk.eval_duration / 1e6) : undefined,
        });
        res.end();
        return;
      }
    }
    res.end();
  } catch (err) {
    write('error', { message: err instanceof Error ? err.message : 'stream failed' });
    res.end();
  }
}));

export default router;
