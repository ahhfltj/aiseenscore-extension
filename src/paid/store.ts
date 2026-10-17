import { browser } from 'wxt/browser';
import { pruneRecent } from './helpers';
import type { LicenseInfo, RecentReport, ReportJob } from './types';

const LICENSE = 'paidLicense';
const JOB = 'paidJob';
const RECENT = 'recentReports';

async function get<T>(key: string): Promise<T | null> {
  try {
    return ((await browser.storage.local.get(key))[key] as T | undefined) ?? null;
  } catch {
    return null;
  }
}
const set = (key: string, value: unknown) => browser.storage.local.set({ [key]: value });

export const keys = { LICENSE, JOB, RECENT };

export const getLicense = () => get<LicenseInfo>(LICENSE);
export const saveLicense = (info: LicenseInfo) => set(LICENSE, info);
export const removeLicense = () => browser.storage.local.remove(LICENSE);

export const getJob = () => get<ReportJob>(JOB);
export const saveJob = (job: ReportJob) => set(JOB, job);
export const clearJob = () => browser.storage.local.remove(JOB);

export async function getRecent(): Promise<RecentReport[]> {
  return pruneRecent((await get<RecentReport[]>(RECENT)) ?? []);
}

export async function addRecent(report: RecentReport): Promise<void> {
  const list = (await getRecent()).filter((r) => r.id !== report.id);
  await set(RECENT, pruneRecent([report, ...list]));
}
