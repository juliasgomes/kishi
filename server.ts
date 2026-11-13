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

  function parseContentDispositionTitle(header: string | null): string | undefined {
    if (!header) return undefined;
    const utf8Match = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    let raw = utf8Match?.[1];
    if (raw) {
      try {
        raw = decodeURIComponent(raw);
      } catch {
        // keep raw
      }
    } else {
      const asciiMatch = header.match(/filename\s*=\s*"([^"]+)"/i) || header.match(/filename\s*=\s*([^;]+)/i);
      raw = asciiMatch?.[1]?.trim();
    }
    if (!raw) return undefined;
    const cleaned = raw.replace(/\.(csv|tsv|xlsx|xls|docx|doc|pptx|ppt|pdf)$/i, '').trim();
    return cleaned || undefined;
  }

  function decodeHtmlEntities(input: string): string {
    return input
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  function cleanGoogleHtmlTitle(rawTitle: string): string | undefined {
    const decoded = decodeHtmlEntities(rawTitle)
      .replace(/\s*[-–—]\s*Google\s+(Sheets|Planilhas|Docs|Documentos|Slides|Apresenta[çc][õo]es|Drive)\s*$/i, '')
      .trim();
    const low = decoded.toLowerCase();
    if (
      !decoded ||
      low === 'google docs' ||
      low === 'google sheets' ||
      low === 'google slides' ||
      low === 'google drive' ||
      low.includes('sign-in') ||
      low.includes('sign in') ||
      low.includes('fazer login') ||
      low.includes('acesso negado') ||
      low.includes('solicitar acesso')
    ) {
      return undefined;
    }
    return decoded;
  }

  function detectCategoryHint(...samples: Array<string | undefined>): '99' | '99 Rides' | '99 Food' | undefined {
    const combined = samples
      .filter(Boolean)
      .join(' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (!combined) return undefined;
    const hasFood = /\b(99\s*food|99food|food|b-?side|c-?side|d-?side|restaurante|delivery)\b/.test(combined);
    const hasRides = /\b(99\s*rides|99rides|rides|ride|pax|drv|driver|corrida|corridas|motorista|passageiro)\b/.test(combined);
    if (hasFood && hasRides) return '99';
    if (hasFood) return '99 Food';
    if (hasRides) return '99 Rides';
    return undefined;
  }

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
      const docTitle = parseContentDispositionTitle(response.headers.get('content-disposition'));
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

      res.json({ ok: true, csv: bodyText, docTitle });
    } catch (error) {
      console.error('Erro ao sincronizar Google Sheet:', error);
      res.status(500).json({
        ok: false,
        error: 'Não foi possível conectar ao Google Sheets agora. Use a opção de colar (Ctrl+V).',
      });
    }
  });

  app.post('/api/inspect-google-link', async (req, res) => {
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

      if (
        parsedUrl.protocol !== 'https:' ||
        (parsedUrl.hostname !== 'docs.google.com' && parsedUrl.hostname !== 'drive.google.com')
      ) {
        res.status(400).json({ ok: false, error: 'URL fora do Google Drive/Docs.' });
        return;
      }

      const lower = parsedUrl.href.toLowerCase();
      const resourceKind = lower.includes('/presentation')
        ? 'apresentacao'
        : lower.includes('/document')
          ? 'doc'
          : parsedUrl.hostname === 'drive.google.com'
            ? 'drive'
            : 'planilha';

      let title: string | undefined;
      let csvSample = '';
      let requiresAuth = false;

      if (resourceKind === 'planilha') {
        const pubMatch = parsedUrl.pathname.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
        const idMatch = parsedUrl.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        const hashGidMatch = parsedUrl.hash.match(/gid=(\d+)/);
        const gid = parsedUrl.searchParams.get('gid') || hashGidMatch?.[1] || '';

        if (pubMatch || idMatch) {
          const exportUrl = pubMatch
            ? `https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub?output=csv${
                gid ? `&gid=${gid}&single=true` : ''
              }&_t=${Date.now()}`
            : `https://docs.google.com/spreadsheets/d/${idMatch![1]}/export?format=csv${
                gid ? `&gid=${gid}` : ''
              }&_t=${Date.now()}`;

          try {
            const resp = await fetch(exportUrl, {
              redirect: 'follow',
              cache: 'no-store',
              signal: AbortSignal.timeout(8000),
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KishiSync/1.0)' },
            });
            const ct = resp.headers.get('content-type') || '';
            const finalU = resp.url || '';
            title = parseContentDispositionTitle(resp.headers.get('content-disposition'));
            const text = await resp.text();
            if (resp.ok && !finalU.includes('accounts.google.com') && !ct.includes('text/html')) {
              csvSample = text.split('\n').slice(0, 6).join(' ');
            } else {
              requiresAuth = true;
            }
          } catch {
            // fallback to HTML title lookup below
          }
        }
      }

      if (!title) {
        try {
          const htmlResp = await fetch(parsedUrl.href, {
            redirect: 'follow',
            cache: 'no-store',
            signal: AbortSignal.timeout(7000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; KishiSync/1.0)',
              'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            },
          });
          const html = await htmlResp.text();
          if (htmlResp.url.includes('accounts.google.com')) {
            requiresAuth = true;
          } else {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch?.[1]) {
              title = cleanGoogleHtmlTitle(titleMatch[1]);
            }
          }
        } catch {
          // ignore metadata fetch timeout
        }
      }

      const category = detectCategoryHint(title, csvSample);
      res.json({
        ok: true,
        title,
        resourceKind,
        category,
        requiresAuth: !title && requiresAuth,
      });
    } catch (error) {
      console.error('Erro ao inspecionar link do Google:', error);
      res.status(500).json({ ok: false, error: 'Falha ao consultar metadados do link.' });
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
