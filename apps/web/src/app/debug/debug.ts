/* eslint-disable @typescript-eslint/no-explicit-any */
const LIMIT = 100 as const;

const log: any[] = [];

export function addLog(category: string, action: any, state: any): void {
  log.push({ category, action, state });

  if (log.length > LIMIT) {
    log.shift();
  }
}

export function addRawLog(message: string): void {
  log.push({ message });

  if (log.length > LIMIT) {
    log.shift();
  }
}

function generateReport() {
  const file = [JSON.stringify(log, null, 4)];

  window.location.href = URL.createObjectURL(
    new Blob(file, { type: 'application/octet-binary' }),
  );
}

// --- Performance Baseline Monitor ---

interface PerfSnapshot {
  timestamp: number;
  fps: number;
  domNodes: number;
  boardNodes: number;
  memoryMB: number | null;
}

let perfOverlay: HTMLDivElement | null = null;
let perfRunning = false;
let perfSnapshots: PerfSnapshot[] = [];

function startPerfMonitor() {
  if (perfRunning) return;
  perfRunning = true;
  perfSnapshots = [];

  let frameCount = 0;
  let lastTime = performance.now();

  perfOverlay = document.createElement('div');
  perfOverlay.id = 'perf-overlay';
  Object.assign(perfOverlay.style, {
    position: 'fixed',
    bottom: '8px',
    right: '8px',
    background: 'rgba(0,0,0,0.8)',
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: '12px',
    padding: '8px 12px',
    borderRadius: '6px',
    zIndex: '99999',
    pointerEvents: 'none',
    lineHeight: '1.6',
  });
  document.body.appendChild(perfOverlay);

  function tick() {
    if (!perfRunning) return;
    frameCount++;

    const now = performance.now();
    if (now - lastTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastTime));
      frameCount = 0;
      lastTime = now;

      const domNodes = document.querySelectorAll('tapiz-node').length;
      const boardNodes = document.querySelectorAll('tapiz-nodes')?.length
        ? domNodes
        : 0;
      const mem = (performance as any).memory;
      const memoryMB = mem
        ? Math.round(mem.usedJSHeapSize / 1024 / 1024)
        : null;

      const snapshot: PerfSnapshot = {
        timestamp: Date.now(),
        fps,
        domNodes,
        boardNodes,
        memoryMB,
      };
      perfSnapshots.push(snapshot);

      if (perfOverlay) {
        perfOverlay.innerHTML = [
          `FPS: <b>${fps}</b>`,
          `DOM Nodes: <b>${domNodes}</b>`,
          memoryMB !== null ? `Memory: <b>${memoryMB} MB</b>` : '',
          `Samples: ${perfSnapshots.length}`,
        ]
          .filter(Boolean)
          .join('<br>');
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function stopPerfMonitor() {
  perfRunning = false;
  if (perfOverlay) {
    perfOverlay.remove();
    perfOverlay = null;
  }
}

function getPerfBaseline() {
  if (perfSnapshots.length === 0) {
    console.log('No perf data. Run debug.perf() first.');
    return null;
  }

  const fpsValues = perfSnapshots.map((s) => s.fps);
  const memValues = perfSnapshots
    .map((s) => s.memoryMB)
    .filter((m): m is number => m !== null);

  const baseline = {
    samples: perfSnapshots.length,
    fps: {
      avg: Math.round(fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length),
      min: Math.min(...fpsValues),
      max: Math.max(...fpsValues),
      p5: fpsValues.toSorted((a, b) => a - b)[
        Math.floor(fpsValues.length * 0.05)
      ],
    },
    domNodes: {
      avg: Math.round(
        perfSnapshots.map((s) => s.domNodes).reduce((a, b) => a + b, 0) /
          perfSnapshots.length,
      ),
      max: Math.max(...perfSnapshots.map((s) => s.domNodes)),
    },
    memory: memValues.length
      ? {
          avg: Math.round(
            memValues.reduce((a, b) => a + b, 0) / memValues.length,
          ),
          max: Math.max(...memValues),
        }
      : null,
    raw: perfSnapshots,
  };

  console.table({
    'FPS avg': baseline.fps.avg,
    'FPS min': baseline.fps.min,
    'FPS P5': baseline.fps.p5,
    'DOM Nodes avg': baseline.domNodes.avg,
    'DOM Nodes max': baseline.domNodes.max,
    'Memory avg (MB)': baseline.memory?.avg ?? 'N/A',
    'Memory max (MB)': baseline.memory?.max ?? 'N/A',
  });

  return baseline;
}

// Auto-start if ?perf=1 query param
if (
  typeof window !== 'undefined' &&
  window.location.search.includes('perf=1')
) {
  setTimeout(() => startPerfMonitor(), 2000);
}

(window as any).debug = {
  report: generateReport,
  perf: startPerfMonitor,
  perfStop: stopPerfMonitor,
  perfBaseline: getPerfBaseline,
};
