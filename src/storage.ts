import type { Workspace, Property, Filters, Assumptions } from './types.js';
import { validateAssumptions } from './finance.js';

export const STORAGE_KEY = 'haven.workspace.v1';
export const freshWorkspace = (): Workspace => ({ version: 1, savedIds: [], compareIds: [], customProperties: [], notes: {}, searches: [], scenarios: [] });
const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const shortString = (x: unknown, max = 500): x is string => typeof x === 'string' && x.length <= max;
export function validProperty(x: unknown): x is Property {
  if (!isRecord(x)) return false;
  const strings = ['id','name','address','city','state','neighborhood','description','photo'];
  if (!strings.every(k => shortString(x[k], k === 'description' ? 3000 : 500))) return false;
  if (!['id','name','address','city'].every(k => String(x[k]).trim().length > 0) || !/^[A-Za-z]{2}$/.test(String(x.state))) return false;
  if (!['Single-family','Condo','Townhouse','Duplex'].includes(String(x.type))) return false;
  const limits: Record<string, [number, number]> = {
    price: [1,100_000_000], beds: [0,100], baths: [0,100], sqft: [1,1_000_000], rent: [0,1_000_000],
    taxAnnual: [0,1_000_000], insuranceMonthly: [0,100_000], hoaMonthly: [0,100_000],
    yearBuilt: [1700,2200], art: [0,10000], addedAt: [0,Number.MAX_SAFE_INTEGER]
  };
  return Object.entries(limits).every(([k,[lo,hi]]) => typeof x[k] === 'number' && Number.isFinite(x[k]) && x[k] >= lo && x[k] <= hi)
    && Array.isArray(x.tags) && x.tags.length <= 20 && x.tags.every(t => shortString(t,100))
    && (!x.photo || /^https:\/\//.test(String(x.photo))) && x.id !== '__proto__' && x.id !== 'constructor';
}
export function validFilters(x: unknown): x is Filters {
  if (!isRecord(x)) return false;
  return shortString(x.query) && shortString(x.city) && shortString(x.type)
    && ['maxPrice','minBeds','minSqft'].every(k => typeof x[k] === 'number' && Number.isFinite(x[k]) && Number(x[k]) >= 0)
    && typeof x.positiveOnly === 'boolean';
}
/** Reject incompatible/malformed imports instead of trusting values from local storage. */
export function parseWorkspace(raw: string): Workspace {
  if (raw.length > 3_000_000) throw new Error('This backup is too large (maximum 3 MB).');
  const w: unknown = JSON.parse(raw);
  if (!isRecord(w) || w.version !== 1) throw new Error('Choose a Haven workspace backup (version 1).');
  if (!Array.isArray(w.customProperties) || w.customProperties.length > 500 || !w.customProperties.every(validProperty)) throw new Error('The backup contains invalid property data.');
  const ids = w.customProperties.map(p => p.id);
  if (new Set(ids).size !== ids.length || ids.some(id => id.startsWith('sample-'))) throw new Error('Custom property IDs must be unique and cannot use reserved sample IDs.');
  for (const key of ['savedIds','compareIds']) {
    if (!Array.isArray(w[key]) || w[key].length > 600 || !w[key].every(s => shortString(s,150))) throw new Error('The backup contains invalid saved properties.');
  }
  if (!isRecord(w.notes) || Object.keys(w.notes).length > 600 || !Object.entries(w.notes).every(([k,v]) => shortString(k,150) && shortString(v,10000) && !['__proto__','constructor','prototype'].includes(k))) throw new Error('The backup contains invalid notes.');
  if (!Array.isArray(w.searches) || w.searches.length > 50 || !w.searches.every(s => isRecord(s) && shortString(s.id,150) && shortString(s.name,100) && validFilters(s.filters))) throw new Error('The backup contains invalid searches.');
  if (!Array.isArray(w.scenarios) || w.scenarios.length > 100 || !w.scenarios.every(s => isRecord(s) && shortString(s.id,150) && shortString(s.name,100) && shortString(s.propertyId,150) && typeof s.savedAt === 'number' && Number.isFinite(s.savedAt) && isRecord(s.assumptions) && validateAssumptions(s.assumptions as unknown as Assumptions).length === 0)) throw new Error('The backup contains invalid scenarios.');
  if (ids.some(id => !/^custom-[A-Za-z0-9-]+$/.test(id))) throw new Error('Custom property IDs must use the custom- prefix and letters, numbers, or hyphens.');
  const result = w as unknown as Workspace;
  return { ...result, savedIds: [...new Set(result.savedIds)], compareIds: [...new Set(result.compareIds)].slice(0,3), customProperties: result.customProperties.map(p => ({ ...p, custom: true })) };
}
export function loadWorkspace(): { workspace: Workspace; available: boolean; notice: string } {
  try {
    const test = STORAGE_KEY + '.test';
    localStorage.setItem(test, '1'); localStorage.removeItem(test);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { workspace: freshWorkspace(), available: true, notice: '' };
    try { return { workspace: parseWorkspace(raw), available: true, notice: '' }; }
    catch {
      // Preserve a damaged entry for recovery before starting a new workspace.
      localStorage.setItem(STORAGE_KEY + '.recovery', raw);
      return { workspace: freshWorkspace(), available: true, notice: 'A saved workspace could not be read. A recovery copy was kept on this device; a new workspace is open.' };
    }
  } catch { return { workspace: freshWorkspace(), available: false, notice: 'Browser storage is unavailable. Changes last for this session only; export a backup to keep them.' }; }
}
export function saveWorkspace(workspace: Workspace): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace)); return true; }
  catch { return false; }
}
