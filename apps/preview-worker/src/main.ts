import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer, { Browser, Page } from 'puppeteer';
import sharp from 'sharp';

expand(config());

const API_URL = process.env['API_URL'] ?? 'http://localhost:8000/api';
const FRONTEND_URL = process.env['FRONTEND_URL'] ?? 'http://localhost:4300';
const TOKEN = process.env['PREVIEW_WORKER_TOKEN'];
const POLL_INTERVAL_MS = Number(
  process.env['PREVIEW_WORKER_POLL_MS'] ?? 15_000,
);
const VIEWPORT_WIDTH = Number(process.env['PREVIEW_VIEWPORT_WIDTH'] ?? 1280);
const VIEWPORT_HEIGHT = Number(process.env['PREVIEW_VIEWPORT_HEIGHT'] ?? 800);
const READY_TIMEOUT_MS = Number(
  process.env['PREVIEW_READY_TIMEOUT_MS'] ?? 30_000,
);

const previewsFolder = path.resolve(process.cwd(), 'uploads/previews');

if (!TOKEN) {
  console.error('PREVIEW_WORKER_TOKEN must be set');
  process.exit(1);
}

const TOKEN_HEADER = { 'x-preview-token': TOKEN };

async function ensurePreviewsFolder() {
  await mkdir(previewsFolder, { recursive: true });
}

async function fetchNextDirty(): Promise<string | null> {
  const res = await fetch(`${API_URL}/preview/next-dirty`, {
    headers: TOKEN_HEADER,
  });
  if (!res.ok) {
    throw new Error(`next-dirty ${res.status}`);
  }
  const { boardId } = (await res.json()) as { boardId: string | null };
  return boardId;
}

async function reportComplete(boardId: string, generated: boolean) {
  const res = await fetch(`${API_URL}/preview/boards/${boardId}/complete`, {
    method: 'POST',
    headers: { ...TOKEN_HEADER, 'content-type': 'application/json' },
    body: JSON.stringify({ generated }),
  });
  if (!res.ok) {
    throw new Error(`complete ${res.status}`);
  }
}

interface PreviewReady {
  ok: boolean;
  empty?: boolean;
}

async function renderBoard(page: Page, boardId: string): Promise<PreviewReady> {
  const url = `${FRONTEND_URL}/board/${boardId}?preview=1`;
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: READY_TIMEOUT_MS,
  });

  try {
    await page.waitForFunction(
      () =>
        Boolean(
          (window as unknown as { __previewReady?: unknown }).__previewReady,
        ),
      { timeout: READY_TIMEOUT_MS, polling: 100 },
    );
  } catch {
    return { ok: false };
  }

  return page.evaluate(
    () =>
      (window as unknown as { __previewReady: PreviewReady }).__previewReady,
  );
}

async function generatePreview(browser: Browser, boardId: string) {
  const page = await browser.newPage();
  try {
    page.on('pageerror', (err) => {
      console.error(`[preview-worker:page] ${boardId} pageerror`, err.message);
    });
    page.on('requestfailed', (req) => {
      console.error(
        `[preview-worker:page] ${boardId} request failed ${req.url()} ${
          req.failure()?.errorText ?? ''
        }`,
      );
    });

    await page.setExtraHTTPHeaders(TOKEN_HEADER);
    await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

    const ready = await renderBoard(page, boardId);
    if (!ready.ok || ready.empty) {
      return false;
    }

    const png = await page.screenshot({ type: 'png', fullPage: false });
    const webp = await sharp(Buffer.from(png)).webp({ quality: 70 }).toBuffer();
    await writeFile(
      path.join(previewsFolder, `${boardId}.webp`),
      new Uint8Array(webp),
    );
    return true;
  } finally {
    await page.close();
  }
}

async function loop(browser: Browser) {
  for (;;) {
    let boardId: string | null = null;
    try {
      boardId = await fetchNextDirty();
    } catch (err) {
      console.error('[preview-worker] fetchNextDirty failed', err);
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (!boardId) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    console.log(`[preview-worker] generating preview for ${boardId}`);
    let generated = false;
    try {
      generated = await generatePreview(browser, boardId);
    } catch (err) {
      console.error(`[preview-worker] generate failed for ${boardId}`, err);
    }

    try {
      await reportComplete(boardId, generated);
    } catch (err) {
      console.error(
        `[preview-worker] reportComplete failed for ${boardId}`,
        err,
      );
    }
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function main() {
  await ensurePreviewsFolder();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const shutdown = async () => {
    await browser.close().catch(() => undefined);
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  console.log(
    `[preview-worker] started; polling ${API_URL} every ${POLL_INTERVAL_MS}ms`,
  );
  await loop(browser);
}

main().catch((err) => {
  console.error('[preview-worker] fatal', err);
  process.exit(1);
});
