export type PropertyType = 'Single-family' | 'Condo' | 'Townhouse' | 'Duplex';
export type Page = 'discover' | 'saved' | 'compare' | 'calculator' | 'custom' | 'decision';
export type Sort = 'recommended' | 'featured' | 'price-asc' | 'price-desc' | 'cashflow' | 'caprate';
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
/** Explicit units for the editable calculator. Absent on pre-1.5 snapshots. */
export interface OwnershipCosts {
  taxRatePercent: number;
  insuranceAnnual: number;
  maintenanceBasis: 'monthly' | 'home-value';
  maintenanceValue: number;
  hoaApplicable: boolean;
  closingBasis: 'percent' | 'amount';
  closingValue: number;
}
export type NumericAssumptionKey = Exclude<keyof Assumptions, 'costs'>;
export interface Assumptions {
  costs?: OwnershipCosts;
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
  closingCosts: number;
  firstYearOutlay: number;
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
export interface CalculatorWorkspace {
  version: 1;
  activePropertyId: string;
  drafts: Record<string, Assumptions>;
}
export interface Workspace {
  rejections: RejectionMemory;
  living: LivingWorkspace;
  calculator: CalculatorWorkspace;
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
  showPassed: boolean;
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

/** Local-only, workspace-wide commute choice. Never geocoded or sent to AI. */
export type WorkAnchor = 'center' | 'north' | 'northeast' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest';
export type WorkCommute = { mode: 'remote' } | {
  mode: 'simulated'; label: string; city: string; state: string; anchor: WorkAnchor; speedMph: number;
};
export interface LivingWorkspace {
  version: 1;
  commute: WorkCommute | null;
  utilityOverrides: Record<string, number>;
}

/** Workspace-wide explicit feedback; not a private Together participant account. */
export type RejectionReason = 'Too far' | 'HOA too high' | 'Too small' | 'Price too high' | 'Other';
export interface RejectionRecord {
  reason: RejectionReason; note: string; rejectedAt: number;
  snapshot: { name:string; city:string; state:string; price:number; sqft:number; hoaMonthly:number;
    commute: { city:string; state:string; anchor:WorkAnchor; miles:number } | null; };
}
export interface RejectionMemory { version:1; enabled:boolean; records:Record<string,RejectionRecord>; }

/** Read-only fictional negotiation fixtures; intentionally not personal workspace state. */
export interface PriceEvent { readonly date:string; readonly price:number; }
export interface ListingHistory {
  readonly propertyId:string; readonly address:string; readonly city:string; readonly state:string;
  readonly listedOn:string; readonly events:readonly PriceEvent[];
}
export interface SoldComparable {
  readonly id:string; readonly address:string; readonly city:string; readonly state:string;
  readonly neighborhood:string; readonly type:PropertyType; readonly beds:number;
  readonly sqft:number; readonly price:number; readonly soldOn:string;
}
