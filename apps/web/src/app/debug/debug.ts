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

(window as any).debug = {
  report: generateReport,
};
