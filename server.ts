import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // LGPD & HTTP Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });

  // Disabled unauthenticated repository read/write endpoints for LGPD protection
  app.get('/api/data', (_req, res) => {
    res.status(403).json({
      error: 'Acesso restrito. Os dados do workspace são privados e protegidos na nuvem autenticada.',
    });
  });

  app.put('/api/data', (_req, res) => {
    res.status(403).json({
      error: 'Gravação local no repositório desativada por proteção LGPD.',
    });
  });

  app.post('/api/upload', (_req, res) => {
    res.status(403).json({
      error: 'Upload público em disco desativado por proteção LGPD.',
    });
  });

  app.delete('/api/upload/:filename', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/sync-google-sheet', async (req, res) => {
    try {
      const { url } = req.body as { url?: string };
      if (!url || typeof url !== 'string' || url.length > 2048) {
        res.status(400).json({ ok: false, error: 'URL inválida.' });
        return;
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.trim());
      } catch {
        res.status(400).json({ ok: false, error: 'Formato de URL inválido.' });
        return;
      }

      if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'docs.google.com') {
        res.status(400).json({
          ok: false,
          error: 'Informe um link válido do Google Sheets (https://docs.google.com/spreadsheets/...).',
        });
        return;
      }

      const pubMatch = parsedUrl.pathname.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
      const idMatch = parsedUrl.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!pubMatch && !idMatch) {
        res.status(400).json({
          ok: false,
          error: 'Não foi possível identificar o ID da planilha no link informado.',
        });
        return;
      }

      const hashGidMatch = parsedUrl.hash.match(/gid=(\d+)/);
      const gid = parsedUrl.searchParams.get('gid') || hashGidMatch?.[1] || '';

      const exportUrl = pubMatch
        ? `https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub?output=csv${
            gid ? `&gid=${gid}&single=true` : ''
          }&_t=${Date.now()}`
        : `https://docs.google.com/spreadsheets/d/${idMatch![1]}/export?format=csv${
            gid ? `&gid=${gid}` : ''
          }&_t=${Date.now()}`;

      const response = await fetch(exportUrl, {
        redirect: 'follow',
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KishiSync/1.0)',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      const contentType = response.headers.get('content-type') || '';
      const finalUrl = response.url || '';
      const bodyText = await response.text();

      if (
        !response.ok ||
        finalUrl.includes('accounts.google.com') ||
        contentType.includes('text/html') ||
        bodyText.trimStart().startsWith('<!DOCTYPE') ||
        bodyText.trimStart().startsWith('<html')
      ) {
        res.json({
          ok: false,
          requiresAuth: true,
          error:
            'Esta planilha exige login corporativo (restrita). Selecione as linhas no Google Sheets (Ctrl+C) e cole no campo abaixo — isso também preserva os links de cada Plano de Mídia!',
        });
        return;
      }

      res.json({ ok: true, csv: bodyText });
    } catch (error) {
      console.error('Erro ao sincronizar Google Sheet:', error);
      res.status(500).json({
        ok: false,
        error: 'Não foi possível conectar ao Google Sheets agora. Use a opção de colar (Ctrl+V).',
      });
    }
  });

  app.post('/api/dot-briefing', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(503).json({
          ok: false,
          fallback: true,
          error: 'Chave Gemini não configurada no ambiente.',
        });
        return;
      }

      const { context } = req.body as { context?: Record<string, unknown> };
      if (!context || typeof context !== 'object') {
        res.status(400).json({ ok: false, error: 'Contexto operacional ausente.' });
        return;
      }

      // Send only aggregate non-PII counters & durations (never task/campaign titles or URLs)
      const sanitizedContext = {
        greeting: typeof context.greeting === 'string' ? context.greeting.slice(0, 30) : 'Olá',
        brasiliaTime: typeof context.brasiliaTime === 'string' ? context.brasiliaTime.slice(0, 16) : '',
        doneTodayCount: Number(context.doneTodayCount) || 0,
        pendingTasksCount: Number(context.pendingTasksCount) || 0,
        inProgressCount: Number(context.inProgressCount) || 0,
        dailyCount: Number(context.dailyCount) || 0,
        scheduledCount: Number(context.scheduledCount) || 0,
        unextractedCount: Number(context.unextractedCount) || 0,
        foodPendingWaves: Number(context.foodPendingWaves) || 0,
        ridesPendingWaves: Number(context.ridesPendingWaves) || 0,
        campaignsWithPending: Number(context.campaignsWithPending) || 0,
        pendingTodosCount: Number(context.pendingTodosCount) || 0,
        estimatedTotal: typeof context.estimatedTotal === 'string' ? context.estimatedTotal.slice(0, 24) : '',
        remainingWorkTime:
          typeof context.remainingWorkTime === 'string' ? context.remainingWorkTime.slice(0, 24) : '',
        balance: typeof context.balance === 'string' ? context.balance.slice(0, 40) : '',
      };

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Gere um briefing operacional curto e direto em português do Brasil baseado nestes indicadores:\n${JSON.stringify(sanitizedContext)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'Você é a assistente operacional do workspace KISHI. Não se apresente nem diga "Eu sou a Dot". Fale em tom claro, acolhedor e objetivo em no máximo 3 frases curtas. Destaque os totais pendentes do dia, itens não extraídos e compare o tempo estimado com o tempo restante no trabalho / banco de horas. Use ortografia e concordância impecáveis em português do Brasil.',
        },
      });

      const text = response.text?.trim();
      if (!text) {
        res.status(502).json({ ok: false, error: 'Resposta vazia da IA.' });
        return;
      }

      res.json({ ok: true, summary: text });
    } catch (error) {
      console.error('Erro ao gerar briefing da Dot:', error);
      res.status(500).json({
        ok: false,
        error: 'Não foi possível consultar a análise da Dot agora.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`KISHI server running on http://0.0.0.0:${port}`);
  });
}

startServer();
