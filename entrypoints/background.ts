import { browser } from 'wxt/browser';
import { createReport, getReport, runQuestion } from '../src/paid/api';
import { driveJob, startingJob } from '../src/paid/runner';
import { addRecent, getJob, getLicense, saveJob } from '../src/paid/store';
import type { ReportInput } from '../src/paid/types';

// The free audit runs from the popup. This worker only runs paid reports, so the popup can close at any time.
export default defineBackground(() => {
  let driving = false;

  async function drive() {
    if (driving) return;
    driving = true;
    // Touching an extension API every 20s keeps the worker alive during long waits.
    const keepAlive = setInterval(() => void getJob(), 20_000);
    try {
      await driveJob({
        getKey: async () => (await getLicense())?.key ?? null,
        getJob,
        setJob: saveJob,
        createReport,
        runQuestion: (key, id, i) => runQuestion(key, id, i),
        getReport,
        onDone: async (job) => {
          if (job.reportId) await addRecent({ id: job.reportId, brand: job.input.brand, createdAt: job.startedAt });
        },
        sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      });
    } finally {
      clearInterval(keepAlive);
      driving = false;
    }
  }

  browser.runtime.onMessage.addListener((msg: { type?: string; input?: ReportInput }, _sender, sendResponse) => {
    if (msg?.type === 'paid/start' && msg.input) {
      (async () => {
        const existing = await getJob();
        if (existing && (existing.status === 'creating' || existing.status === 'running')) {
          sendResponse({ ok: false, reason: 'busy' });
          return;
        }
        await saveJob(startingJob(msg.input!));
        sendResponse({ ok: true });
        void drive();
      })();
      return true; // async response
    }
    if (msg?.type === 'paid/resume') {
      void drive();
      sendResponse({ ok: true });
    }
    return undefined;
  });

  // Pick up an unfinished report after the browser or worker restarts.
  void getJob().then((job) => {
    if (job && (job.status === 'creating' || job.status === 'running')) void drive();
  });
});
