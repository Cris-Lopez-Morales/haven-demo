import type { Property, RejectionMemory, RejectionRecord, RejectionReason, WorkCommute } from './types.js';
import { estimateCommute, workAnchors } from './living-engine.js';

/** Explicit feedback only. Never infer intent from views, saved homes, or private profiles. */
export const rejectionReasons = ['Too far','HOA too high','Too small','Price too high','Other'] as const;
export const freshRejections = (): RejectionMemory => ({version:1,enabled:true,records:{}});
const record = (x:unknown):x is Record<string,unknown> => !!x && typeof x==='object' && !Array.isArray(x);
const bounded = (x:unknown,lo:number,hi:number):x is number => typeof x==='number' && Number.isFinite(x) && x>=lo && x<=hi;
const text = (x:unknown,max:number):x is string => typeof x==='string' && x.length<=max;
const safeId = (id:string):boolean => /^(?:sample-[0-9]+|custom-[A-Za-z0-9-]+)$/.test(id) && id.length<=150;
export const isRejectionReason = (x:unknown):x is RejectionReason => rejectionReasons.includes(x as RejectionReason);
const usd = (n:number):string => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}).format(n);
const numeric = (n:number):string => n.toLocaleString('en-US',{maximumFractionDigits:2});
/** Reconstruct trusted fields. Older workspaces gain an empty memory, not invented feedback. */
export function parseRejections(value:unknown):RejectionMemory {
  if(value===undefined)return freshRejections();
  if(!record(value)||value.version!==1||typeof value.enabled!=='boolean'||!record(value.records)||Object.keys(value.records).length>560)
    throw new Error('The backup contains invalid preference memory.');
  const records:Record<string,RejectionRecord>={};
  for(const [id,r] of Object.entries(value.records)) {
    if(!safeId(id)||!record(r)||!isRejectionReason(r.reason)||!text(r.note,500)||r.reason==='Other'&&!r.note.trim()||!bounded(r.rejectedAt,0,8_640_000_000_000_000)||!record(r.snapshot))
      throw new Error('The backup contains an invalid property pass.');
    const s=r.snapshot;
    if(!text(s.name,500)||!s.name.trim()||!text(s.city,500)||!s.city.trim()||!text(s.state,2)||!/^[A-Za-z]{2}$/.test(s.state)||!bounded(s.price,1,100_000_000)||!bounded(s.sqft,1,1_000_000)||!bounded(s.hoaMonthly,0,100_000))
      throw new Error('The backup contains invalid preference evidence.');
    let commute:RejectionRecord['snapshot']['commute']=null;
    if(s.commute!==null) {
      const c=s.commute;
      if(!record(c)||!text(c.city,100)||!c.city.trim()||!text(c.state,2)||!/^[A-Za-z]{2}$/.test(c.state)||typeof c.anchor!=='string'||!Object.hasOwn(workAnchors,c.anchor)||!bounded(c.miles,0,1000))
        throw new Error('The backup contains invalid demo-distance evidence.');
      commute={city:c.city,state:c.state.toUpperCase(),anchor:c.anchor as keyof typeof workAnchors,miles:c.miles};
    }
    records[id]={reason:r.reason,note:r.note.trim(),rejectedAt:r.rejectedAt,snapshot:{name:s.name,city:s.city,state:s.state.toUpperCase(),price:s.price,sqft:s.sqft,hoaMonthly:s.hoaMonthly,commute}};
  }
  return {version:1,enabled:value.enabled,records};
}
export function pruneRejections(memory:RejectionMemory,ids:Set<string>):RejectionMemory {
  return {...memory,records:Object.fromEntries(Object.entries(memory.records).filter(([id])=>ids.has(id)))};
}
export function passProperty(memory:RejectionMemory,p:Property,reason:RejectionReason,note:string,work:WorkCommute|null,at=Date.now()):RejectionMemory {
  const route=estimateCommute(p,work);
  const commute=route.kind==='simulated'&&work?.mode==='simulated' ? {city:work.city,state:work.state,anchor:work.anchor,miles:route.roadMiles}:null;
  // One current record per distinct home: repeated clicks cannot train a rule.
  return parseRejections({...memory,records:{...memory.records,[p.id]:{reason,note,rejectedAt:at,snapshot:{name:p.name,city:p.city,state:p.state,price:p.price,sqft:p.sqft,hoaMonthly:p.hoaMonthly,commute}}}});
}
export function undoPass(memory:RejectionMemory,id:string):RejectionMemory {
  return {...memory,records:Object.fromEntries(Object.entries(memory.records).filter(([key])=>key!==id))};
}
export function distanceContext(work:WorkCommute|null):string|null {
  return work?.mode==='simulated'?JSON.stringify([work.city.toLowerCase(),work.state.toUpperCase(),work.anchor]):null;
}
export function eligibleEvidence(memory:RejectionMemory,reason:RejectionReason,work:WorkCommute|null):RejectionRecord[] {
  return Object.values(memory.records).filter(r=>r.reason===reason && (reason==='HOA too high'?r.snapshot.hoaMonthly>0:reason==='Too far'?
    !!r.snapshot.commute && distanceContext(work)===JSON.stringify([r.snapshot.commute.city.toLowerCase(),r.snapshot.commute.state.toUpperCase(),r.snapshot.commute.anchor]):reason!=='Other'));
}
const median=(values:number[]):number=>{const v=[...values].sort((a,b)=>a-b),i=Math.floor(v.length/2);return v.length%2?v[i]:(v[i-1]+v[i])/2;};
export interface LearnedRule { reason:RejectionReason; count:number; threshold:number; label:string; detail:string; }
export function learnedRules(memory:RejectionMemory,work:WorkCommute|null):LearnedRule[] {
  const rules:LearnedRule[]=[];
  for(const reason of rejectionReasons) {
    const evidence=eligibleEvidence(memory,reason,work);if(evidence.length<2)continue;
    const threshold=median(evidence.map(r=>reason==='Too far'?r.snapshot.commute!.miles:reason==='Too small'?r.snapshot.sqft:reason==='Price too high'?r.snapshot.price:r.snapshot.hoaMonthly));
    const label=reason==='Too far'?'Shorter demo commutes':reason==='Too small'?'More floor space':reason==='Price too high'?'Lower asking prices':'Lower HOA fees';
    const detail=reason==='Too far'?`Demo distances of ${numeric(threshold)} miles or more in ${work?.mode==='simulated'?work.city:'this city'} rank lower. Invented routes, not actual commutes.`:
      reason==='Too small'?`Homes with ${numeric(threshold)} sq ft or less rank lower.`:reason==='Price too high'?`Asking prices of ${usd(threshold)} or more rank lower.`:`Listed HOA fees of ${usd(threshold)}/month or more rank lower.`;
    rules.push({reason,count:evidence.length,threshold,label,detail});
  }
  return rules;
}
export function ruleApplies(p:Property,rule:LearnedRule,work:WorkCommute|null):boolean|null {
  if(rule.reason==='Too far'){const route=estimateCommute(p,work);return route.kind==='simulated'?route.roadMiles>=rule.threshold:null;}
  return rule.reason==='Too small'?p.sqft<=rule.threshold:rule.reason==='Price too high'?p.price>=rule.threshold:p.hoaMonthly>=rule.threshold;
}
/** One point for each crossed threshold. Equal weights; preserve the existing order for ties. */
export function rerankWithMemory(properties:Property[],memory:RejectionMemory,work:WorkCommute|null):Property[] {
  if(!memory.enabled)return [...properties];
  const rules=learnedRules(memory,work);
  return properties.map((p,index)=>({p,index,points:rules.filter(r=>ruleApplies(p,r,work)===true).length}))
    .sort((a,b)=>a.points-b.points||a.index-b.index).map(x=>x.p);
}
export function learningNarrative(memory:RejectionMemory,work:WorkCommute|null,explicitSort=false,excludedCount?:number):string {
  const count=Object.keys(memory.records).length, rules=learnedRules(memory,work);
  if(!count)return '';
  const excluded=excludedCount??count;
  const scope=excluded===0?'Your recorded passes inform these preferences. ':`${excluded} ${excluded===1?'home marked':'homes marked'} “Not interested” ${excluded===1?'is':'are'} excluded from new recommendations. `;
  if(!memory.enabled)return scope+'Learned re-ranking is paused; your explicit search filters still apply.';
  if(explicitSort)return scope+(rules.length?'Your requested numerical order takes priority; learned preferences have not changed this ranking.':'No learned rule is active yet.');
  if(!rules.length)return scope+'No learned rule is active yet. Two distinct comparable passes with the same reason are needed; free-text reasons are never interpreted automatically.';
  return scope+rules.map(r=>`I’ve deprioritized ${r.reason==='HOA too high'?'high-HOA places':r.reason==='Price too high'?'higher-priced homes':r.reason==='Too small'?'smaller homes':'longer fictional commutes'} since you’ve passed on ${r.count} homes for “${r.reason}”. ${r.detail}`).join(' ');
}
export function matchLearning(p:Property,memory:RejectionMemory,work:WorkCommute|null):{reasons:string[];caveats:string[]} {
  const result:{reasons:string[];caveats:string[]}={reasons:[],caveats:[]};
  if(!memory.enabled)return result;
  for(const rule of learnedRules(memory,work)) {
    const applies=ruleApplies(p,rule,work);
    if(applies===true)result.caveats.push(`Ranks lower for “${rule.reason}”. ${rule.detail} This is a soft preference, not an exclusion.`);
    else if(applies===null)result.caveats.push('No comparable demo distance for this home. It is not scored for distance; this does not mean it is nearer.');
    else result.reasons.push(rule.reason==='Price too high'?`${usd(p.price)} is below your learned ${usd(rule.threshold)} asking-price threshold.`:rule.reason==='Too small'?`${numeric(p.sqft)} sq ft is above your learned ${numeric(rule.threshold)} sq ft threshold.`:rule.reason==='HOA too high'?`${usd(p.hoaMonthly)}/month HOA is below your learned ${usd(rule.threshold)}/month threshold.`:`Its fictional commute is below your learned ${numeric(rule.threshold)}-mile demo threshold; not an actual route.`);
  }
  return result;
}
