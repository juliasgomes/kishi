import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'src', 'data', 'kishi-data.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

function isValidKishiState(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const obj = payload as Record<string, unknown>;
  return (
    typeof obj.user === 'object' &&
    obj.user !== null &&
    Array.isArray(obj.sheets) &&
    typeof obj.channels === 'object' &&
    obj.channels !== null &&
    Array.isArray(obj.tasks) &&
    Array.isArray(obj.history)
  );
}

async function ensureDirs() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

let writeQueue: Promise<void> = Promise.resolve();

function queueWriteData(jsonString: string): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const tmpFile = `${DATA_FILE}.tmp`;
    await fs.writeFile(tmpFile, jsonString, 'utf-8');
    await fs.rename(tmpFile, DATA_FILE);
  });
  return writeQueue;
}

async function startServer() {
  await ensureDirs();

  const app = express();
  app.use(express.json({ limit: '30mb' }));

  app.get('/api/data', async (_req, res) => {
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.send(raw);
    } catch (error) {
      console.error('Erro ao ler kishi-data.json:', error);
      res.status(500).json({ error: 'Falha ao carregar dados do repositório.' });
    }
  });

  app.put('/api/data', async (req, res) => {
    try {
      if (!isValidKishiState(req.body)) {
        res.status(400).json({ error: 'Estrutura de dados inválida.' });
        return;
      }
      const formatted = JSON.stringify(req.body, null, 2) + '\n';
      await queueWriteData(formatted);
      res.json({ ok: true });
    } catch (error) {
      console.error('Erro ao salvar kishi-data.json:', error);
      res.status(500).json({ error: 'Falha ao gravar dados no repositório.' });
    }
  });

  app.post('/api/upload', async (req, res) => {
    try {
      const { filename, contentBase64 } = req.body as {
        filename?: string;
        contentBase64?: string;
      };

      if (!filename || !contentBase64) {
        res.status(400).json({ error: 'Arquivo inválido.' });
        return;
      }

      const safeBaseName = path
        .basename(filename)
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const storedName = `${Date.now()}_${safeBaseName}`;
      const targetPath = path.join(UPLOADS_DIR, storedName);

      const cleanBase64 = contentBase64.includes(',')
        ? contentBase64.split(',')[1]
        : contentBase64;
      const buffer = Buffer.from(cleanBase64, 'base64');

      await fs.writeFile(targetPath, buffer);
      res.json({ url: `/uploads/${storedName}`, storedName });
    } catch (error) {
      console.error('Erro ao salvar arquivo enviado:', error);
      res.status(500).json({ error: 'Falha ao salvar arquivo no servidor.' });
    }
  });

  app.delete('/api/upload/:filename', async (req, res) => {
    try {
      const safeName = path.basename(req.params.filename);
      const targetPath = path.join(UPLOADS_DIR, safeName);
      await fs.unlink(targetPath).catch(() => undefined);
      res.json({ ok: true });
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error);
      res.status(500).json({ error: 'Falha ao excluir arquivo.' });
    }
  });

  app.post('/api/sync-google-sheet', async (req, res) => {
    try {
      const { url } = req.body as { url?: string };
      if (!url || typeof url !== 'string') {
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
        contents: `Gere um briefing operacional curto e direto em português do Brasil baseado nestes dados:\n${JSON.stringify(context)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'Você é a assistente operacional do workspace KISHI (99 Rides e 99 Food). Não se apresente nem diga "Eu sou a Dot". Fale em tom claro, acolhedor e objetivo em no máximo 3 frases curtas. Destaque o que há para fazer hoje, o total de itens não extraídos e compare o tempo total estimado nas tarefas com o tempo restante no trabalho / banco de horas, sugerindo a melhor ordem de prioridade. Use ortografia e concordância impecáveis em português do Brasil.',
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

  app.use('/uploads', express.static(UPLOADS_DIR));

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
