export type PropertyType = 'Single-family' | 'Condo' | 'Townhouse' | 'Duplex';
export type Page = 'discover' | 'saved' | 'compare' | 'calculator' | 'custom' | 'decision';
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
  decisions: DecisionWorkspace;
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
  decisionTab: DecisionTab;
  decisionStress: StressKind;
}


export type DecisionTab = 'life' | 'together' | 'tour';
export type StressKind = 'baseline' | 'income' | 'expenses' | 'repair';
export type DecisionStage = 'Considering' | 'Want to tour' | 'Need answers' | 'Final shortlist';
export interface HouseholdBudget {
  income: number; expenses: number; savings: number; cash: number; cushion: number;
  example: boolean;
}
export interface LifeInputs {
  downPercent: number; interestRate: number; years: number; closingPercent: number;
  taxAnnual: number; insuranceMonthly: number; hoaMonthly: number; mortgageInsurance: number;
  utilities: number; maintenance: number; moving: number; repairs: number;
}
export interface StressInputs { incomeDrop: number; expenseIncrease: number; repairCost: number; }
export interface HomePriorities {
  city: string; type: string; maxPrice: number; minBeds: number; minSqft: number;
  outdoor: boolean; light: boolean; notes: string;
}
export interface Participant {
  id: string; name: string; budget: HouseholdBudget | null; priorities: HomePriorities;
  shareBudget: boolean; life: Record<string, LifeInputs>;
}
export interface HomeReview { stance: 'Interested' | 'Unsure' | 'Not for me'; note: string; updatedAt: number; }
export interface TourQuestion {
  id: string; text: string; answer: string; source: string; resolved: boolean;
  updatedBy: string; updatedAt: number; custom: boolean;
}
export interface TourVisit { date: string; notes: string; author: string; }
export interface DecisionHome {
  stage: DecisionStage; reviews: Record<string, HomeReview>; questions: Record<string, TourQuestion>;
  visit: TourVisit;
}
export interface LifeSnapshot {
  id: string; name: string; propertyId: string; participantId: string; savedAt: number;
  price: number; budget: HouseholdBudget; inputs: LifeInputs; stress: StressKind; stressInputs: StressInputs;
}
export interface DecisionWorkspace {
  version: 1; currentPropertyId: string; activeParticipantId: string;
  participants: Participant[]; homes: Record<string, DecisionHome>;
  stressInputs: StressInputs; snapshots: LifeSnapshot[];
}
