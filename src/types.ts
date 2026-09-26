export type PropertyType = 'Single-family' | 'Condo' | 'Townhouse' | 'Duplex';
export type Page = 'discover' | 'saved' | 'compare' | 'calculator' | 'custom';
export type Sort = 'featured' | 'price-asc' | 'price-desc' | 'cashflow' | 'caprate';
export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  neighborhood: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  type: PropertyType;
  rent: number;
  taxAnnual: number;
  insuranceMonthly: number;
  hoaMonthly: number;
  yearBuilt: number;
  photo: string;
  art: number;
  tags: string[];
  description: string;
  addedAt: number;
  custom?: boolean;
}
export interface Assumptions {
  price: number;
  downPercent: number;
  interestRate: number;
  years: number;
  rent: number;
  taxAnnual: number;
  insuranceMonthly: number;
  hoaMonthly: number;
  vacancyPercent: number;
  maintenancePercent: number;
  managementPercent: number;
  capexPercent: number;
  closingPercent: number;
  initialRepairs: number;
  mortgageInsuranceMonthly: number;
}
export interface Metrics {
  loan: number;
  downPayment: number;
  mortgage: number;
  vacancy: number;
  effectiveRent: number;
  tax: number;
  insurance: number;
  hoa: number;
  maintenance: number;
  management: number;
  capex: number;
  operatingExpenses: number;
  noiMonthly: number;
  totalOutflow: number;
  cashflow: number;
  capRate: number;
  cashInvested: number;
  cashOnCash: number | null;
}
export interface Filters {
  query: string;
  city: string;
  type: string;
  maxPrice: number;
  minBeds: number;
  minSqft: number;
  positiveOnly: boolean;
}
export interface SavedSearch { id: string; name: string; filters: Filters; }
export interface Scenario { id: string; name: string; propertyId: string; assumptions: Assumptions; savedAt: number; }
export interface Workspace {
  version: 1;
  savedIds: string[];
  compareIds: string[];
  customProperties: Property[];
  notes: Record<string, string>;
  searches: SavedSearch[];
  scenarios: Scenario[];
}
export interface State {
  page: Page;
  filters: Filters;
  sort: Sort;
  layout: 'grid' | 'list';
  moreFilters: boolean;
  visibleCount: number;
  calculatorPropertyId: string;
  assumptions: Assumptions;
  workspace: Workspace;
  storageAvailable: boolean;
  storageNotice: string;
  scenarioName: string;
}
