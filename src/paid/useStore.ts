import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { getJob, getLicense, getRecent } from './store';
import type { LicenseInfo, RecentReport, ReportJob } from './types';

/** Live view of the paid-tier state in chrome.storage.local. */
export function useStore() {
  const [loaded, setLoaded] = useState(false);
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [job, setJob] = useState<ReportJob | null>(null);
  const [recent, setRecent] = useState<RecentReport[]>([]);

  const reload = useCallback(async () => {
    const [l, j, r] = await Promise.all([getLicense(), getJob(), getRecent()]);
    setLicense(l);
    setJob(j);
    setRecent(r);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void reload();
    const listener = (_changes: unknown, area: string) => {
      if (area === 'local') void reload();
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, [reload]);

  return { loaded, license, job, recent, reload };
}
