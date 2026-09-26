import { rerankWithMemory, learningNarrative, learnedRules, matchLearning } from './rejection-engine.js';
import type { Property, PropertyType, RejectionMemory, WorkCommute } from './types.js';
import { detectRanking, rankProperties, rankingRules, rankingKeys, rankReason } from './ranking.js';
import type { Ranking } from './ranking.js';

export interface Preferences {
  budgetKnown: boolean; minPrice: number | null; maxPrice: number | null;
  cities: string[] | null; types: PropertyType[] | null;
  minBeds: number | null; minBaths: number | null; minSqft: number | null;
  maxBeds: number | null; maxBaths: number | null; maxSqft: number | null;
  features: string[]; unverified: string[]; mustHavesKnown: boolean;
  sort: Ranking;
}
export type Question = 'city' | 'budget' | 'type' | 'features' | 'criteria' | null;
export interface Suggestion { label: string; message: string; }
export interface Match { property: Property; reasons: string[]; caveats: string[]; }
export interface AssistantReply { text: string; matches: Match[]; suggestions: Suggestion[]; question: Question; offset: number; total: number; }
export interface Interpretation { preferences: Preferences; recognized: boolean; note: string; noteQuestion?: Question; reset: boolean; more: boolean; }
export const propertyTypes: PropertyType[] = ['Single-family','Condo','Townhouse','Duplex'];
export const featureLabels: Record<string,string> = {
  outdoor:'Outdoor space',garden:'Private garden',light:'Natural light',open:'Open-plan living',
  storage:'Generous storage',flexible:'Flexible layout',entry:'Private / separate entry','two-units':'Two living spaces','no-hoa':'No HOA fee'
};
export function freshPreferences(): Preferences {
  return {budgetKnown:false,minPrice:null,maxPrice:null,cities:null,types:null,minBeds:null,minBaths:null,minSqft:null,maxBeds:null,maxBaths:null,maxSqft:null,features:[],unverified:[],mustHavesKnown:false,sort:'relevance'};
}
function norm(value: string): string {return value.toLowerCase().replace(/[’‘]/g,"'").replace(/[–—]/g,'-');}
function unique<T>(values: T[]): T[] {return [...new Set(values)];}
const usd = (n: number): string => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const featureTests: Record<string,(p:Property)=>boolean> = {
  outdoor:p=>p.tags.some(t=>/outdoor|garden/i.test(t)), garden:p=>p.tags.includes('Private garden'),
  light:p=>p.tags.some(t=>/light/i.test(t)), open:p=>p.tags.includes('Open-plan living'),
  storage:p=>p.tags.includes('Generous storage'), flexible:p=>p.tags.some(t=>/flexible/i.test(t)),
  entry:p=>p.tags.some(t=>/private entry|separate entrances/i.test(t)),
  'two-units':p=>p.type==='Duplex', 'no-hoa':p=>p.hoaMonthly===0
};
const featurePatterns: Record<string,RegExp> = {
  outdoor:/\b(outdoor(?: space| area)?|yard|backyard|terrace)\b/, garden:/\b(?:private )?garden\b/,
  light:/\b(natural light|light[- ]filled|sunlight|bright|sunny)\b/, open:/\bopen[- ](?:plan|concept|layout)\b/,
  storage:/\b(storage|closets?)\b/, flexible:/\bflexible(?: layout| living)?\b/,
  entry:/\b(private entr(?:y|ance)|separate entrances?)\b/, 'two-units':/\b(two|2) (?:units|living spaces)\b/,
  'no-hoa':/\b(no|zero|without|avoid) (?:an? )?hoa\b|\bhoa[- ]free\b/
};
const unsupportedPatterns: [RegExp,string][] = [
  [/\b(?:garages?|parking)\b/,'Parking / garage'],[/\b(?:pool|swimming)\b/,'Pool'],
  [/\b(?:pet[- ]friendly|pets? allowed|dogs? allowed)\b/,'Pet policy'],
  [/\b(?:wheelchair|accessible|accessibility|step[- ]free)\b/,'Accessibility'],
  [/\b(?:elevator|lift)\b/,'Elevator'],[/\b(?:schools?|school district)\b/,'School information'],
  [/\b(?:commute|walkable|walkability|transit|subway|train station)\b/,'Commute / transit'],
  [/\b(?:safe|safest|crime|safety)\b/,'Neighborhood safety'],
  [/\b(?:waterfront|ocean view|lake view)\b/,'Water / view access'],
  [/\b(?:basement|fireplace|air conditioning|central air|solar|balcony|fenced|fence|office|laundry)\b/,'Additional amenities']
];
function negated(text:string,index:number):boolean {
  const before = text.slice(Math.max(0,index-45),index).split(/[,.;]|\b(?:but|and)\b/).at(-1)!;
  return /(?:don't|do not|dont|not|no longer) (?:need|want|require|care about)\b|\b(?:remove|drop|skip|forget|ignore)\b|\bno need (?:for|to have)\b/.test(before);
}
function spelledNumbers(text:string):string {
  const nums:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
  return text.replace(/half (?:a )?million/g,'500k').replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/g,w=>String(nums[w]))
    .replace(/\b(\d+) hundred\b/g,(_,v)=>String(Number(v)*100));
}
const amount=(value:string,unit=''):number=>Number(value.replace(/,/g,''))*(/^(k|thousand|grand)$/.test(unit)?1000:/^(m|million)$/.test(unit)?1000000:1);
/** Deterministic demo interpreter. It is deliberately not presented as a live LLM. */
export function interpretMessage(message:string, previous:Preferences, question:Question, properties:Property[],lastRecommendedIds:string[]=[]):Interpretation {
  const t=spelledNumbers(norm(message.trim()));
  const p:Preferences={...previous,cities:previous.cities&&[...previous.cities],types:previous.types&&[...previous.types],features:[...previous.features],unverified:[...previous.unverified]};
  // Interpret comparative language BEFORE considering a bare city answer.
  const ranking=detectRanking(t);
  let recognized=ranking!==null, note='';
  let noteQuestion:Question='budget';
  if(ranking)p.sort=ranking;
  // Cross-city ranking is the default; prior explicit filters persist until removed.
  // An explicit all-catalogue request clears *all* previous constraints.
  if(/\b(?:across (?:the )?(?:entire|whole) (?:catalogue|catalog)|ignore (?:my |all |the )?(?:previous )?filters|all 60(?: (?:demo )?(?:homes|listings|properties))?|all listings)\b/.test(t))Object.assign(p,freshPreferences(),{sort:ranking||'relevance',cities:[],types:[],budgetKnown:true,mustHavesKnown:true});
  if(/\b(?:closest|nearest|close|near|distance|walk|minutes?|miles?)\b.*\b(?:downtown|city cent(?:er|re))\b|\bdowntown\b/.test(t)) {
    note='I can’t rank closeness to downtown from this catalogue: the 60 fictional listings have no coordinates, downtown reference points, distances, or travel times. A neighborhood name is not a distance measurement. I won’t invent a closest home. I can compare asking price, floor area, bedrooms, bathrooms, year built, and listed fees directly.';
    noteQuestion=null;recognized=true;
  } else if(/\b(?:closest|nearest|shortest|fastest)\b.*\b(?:me|work|school|airport|beach|park|commute|station|transit)\b/.test(t)) {
    note='The demo does not include coordinates or travel distances, so I can’t calculate that proximity ranking. I can compare the recorded property numbers instead, without requiring a city.';noteQuestion=null;recognized=true;
  }

  const reset=/^(?:start over|start again|reset(?: search)?|new search|clear everything)[.!]?$/i.test(t);
  if(reset)return {preferences:freshPreferences(),recognized:true,note:'',reset:true,more:false};
  if(/\b(?:use (?:my )?(?:learned )?preferences|show (?:me )?recommendations|recommend (?:some )?homes)\b/.test(t)){p.sort='relevance';p.mustHavesKnown=true;recognized=true;}
  const more=/\b(show|see|find|any) (?:me )?(?:some )?(?:more|other|different|next)\b|\bwhat else\b/.test(t);
  if(/^(?:show me (?:all|anything|what's possible|what is possible)|just browsing|surprise me)[.!]?$/.test(t))return {preferences:{...freshPreferences(),budgetKnown:true,cities:[],types:[],mustHavesKnown:true},recognized:true,note:'',reset:false,more:false};
  const skip=/^(?:any|either|anything|no preference|not sure|i'm flexible|im flexible|skip|doesn't matter|does not matter)[.!]?$/.test(t);
  if(/\b(any city|anywhere|all cities|every city|open to (?:any|all) cities|no city preference)\b/.test(t)||skip&&question==='city') {p.cities=[];recognized=true;}
  else {
    const cities=unique(properties.map(x=>x.city));
    const aliases:Record<string,string[]>={'Kansas City':['kc'],'San Diego':['sd'],'Des Moines':['des moines'],'Minneapolis':['minneapolis','twin cities']};
    const found=cities.filter(city=>[norm(city),...(aliases[city]||[])].some(alias=>new RegExp(`\\b${alias}\\b`).test(t)));
    if(found.length){
      const excluded=found.filter(city=>new RegExp(`(?:not|avoid|except|exclude)\\s+${norm(city)}\\b`).test(t));
      const included=found.filter(city=>!excluded.includes(city));
      p.cities=excluded.length&&!included.length?(p.cities?.length?p.cities:cities).filter(city=>!excluded.includes(city)): /\b(also|add|include)\b/.test(t)&&p.cities?.length?unique([...p.cities,...included]):included;
      recognized=true;
    } else if(!skip){
      const common=t.match(/\b(new york(?: city)?|san francisco|los angeles|boston|miami|houston|las vegas|baltimore|philadelphia|washington(?: dc)?|detroit|columbus|boise|omaha beach)\b/);
      const inCity=t.match(/\b(?:in|near|around|city is|city:|city to)\s+([a-z][a-z ]{1,36}?)(?=\s+(?:under|below|with|for|and|or|instead)|[,.;!?]|$)/);
      const direct=!recognized&&question==='city'&&/^[a-z][a-z .'-]{1,35}$/.test(t)&&!/(?:hello|hi|help|looking|budget|thanks|yes|no|show|find|city|haves)/.test(t)?t:null;
      const leading=t.match(/^([a-z][a-z -]{1,35}?)\s+(?=under\b|below\b|between\b|\$)/);
      const prefixCity=!ranking&&leading&&!/\b(?:house|home|place|property|condo|townhouse|duplex|budget|find|show|want|need|looking|good|nice|any|something)\b/.test(leading[1])?leading[1]:null;
      const city=common?.[1]||inCity?.[1]||prefixCity||direct;
      if(city&&!/^(?:a |the |my |mind|budget|price|that|this|size|square|area|space|bedroom|bathroom|total)/.test(city)){p.cities=[city.trim().replace(/\b\w/g,c=>c.toUpperCase())];recognized=true;}
    }
  }
  if(/\b(no (?:budget|price) (?:limit|cap)|any (?:budget|price)|unlimited budget|no budget|remove (?:the )?budget|drop (?:the )?budget)\b/.test(t)||skip&&question==='budget'){p.budgetKnown=true;p.minPrice=null;p.maxPrice=null;recognized=true;}
  else {
    const range=t.match(/(?:between|from)?\s*\$?(\d[\d,]*(?:\.\d+)?)\s*(k|m|million|thousand|grand)?\s*(?:-|to|and)\s*\$?(\d[\d,]*(?:\.\d+)?)\s*(k|m|million|thousand|grand)?\b/);
    let budgetFound=false;
    if(range){
      const low=amount(range[1],range[2]||range[4]),high=amount(range[3],range[4]||range[2]);
      if(low>=10000&&high>=10000){p.minPrice=Math.min(low,high);p.maxPrice=Math.max(low,high);p.budgetKnown=true;recognized=true;budgetFound=true;}
    }
    if(!budgetFound){
      const amounts=[...t.matchAll(/(\$\s*)?(\d[\d,]*(?:\.\d+)?)\s*(million|thousand|grand|k\b|m\b)?/g)];
      for(const match of amounts){
        const v=amount(match[2],match[3]);
        const after=t.slice(match.index!+match[0].length,match.index!+match[0].length+24);
        if(/^(?:\s|-)*(?:sq|square|beds?|bedrooms?|baths?|bathrooms?|years?)/.test(after))continue;
        if(!match[1]&&!match[3]&&v<10000&&!(question==='budget'&&/^\d[\d,.]*$/.test(t)))continue;
        if(/^(?:\s)*(?:\/\s*(?:mo|month)|per month|a month|monthly)/.test(after)) {note='That sounds like a monthly rental budget. These demo listings are for purchase. What purchase-price limit should I use?';continue;}
        if(v>100000000){note='Please use a purchase budget of $100 million or less for this demo.';continue;}
        const before=t.slice(Math.max(0,match.index!-25),match.index!);
        p.budgetKnown=true;
        if(/(?:at least|above|over|minimum)\s*$/.test(before)){p.minPrice=v;p.maxPrice=null;}else{p.maxPrice=v;p.minPrice=null;}
        budgetFound=true;recognized=true;
      }
    }
  }
  if(/\b(any (?:property |home )?type|all (?:property |home )?types|no type preference|any kind|any home type)\b/.test(t)||skip&&question==='type') {p.types=[];recognized=true;}
  else {
    const patterns:[PropertyType,RegExp][]=[['Single-family',/\b(single[- ]family|detached|houses?|standalone)\b/],['Condo',/\b(condos?|condominiums?|apartments?|lofts?)\b/],['Townhouse',/\b(townhouses?|townhomes?|town homes?|row homes?)\b/],['Duplex',/\b(duplex(?:es)?|2[- ]unit|two[- ]unit)\b/]];
    const typeText=properties.reduce((text,property)=>text.replace(norm(property.name),''),t);
    const found=patterns.filter(([,r])=>r.test(typeText));
    if(found.length){
      const excluded=found.filter(([,r])=>{const m=t.match(r)!;return negated(t,m.index!)||/(?:not|no|avoid|except|exclude)\s+(?:a |an |any )?$/.test(t.slice(Math.max(0,m.index!-25),m.index!));}).map(([type])=>type);
      const included=found.map(([type])=>type).filter(type=>!excluded.includes(type));
      p.types=excluded.length&&!included.length?propertyTypes.filter(type=>!excluded.includes(type)): /\b(also|add|include)\b/.test(t)&&p.types?.length?unique([...p.types,...included]):included;
      recognized=true;
    }
  }
  if(/\b(no (?:other |additional )?(?:must[- ]haves|requirements|preferences)|no extras|nothing else|no specific features|remove (?:the |all )?(?:must[- ]haves|features)|drop (?:the |all )?(?:must[- ]haves|features))\b/.test(t)||skip&&question==='features'||question==='features'&&/^(?:none|no|nope)[.!]?$/.test(t)) {
    p.mustHavesKnown=true;recognized=true;
    if(/\b(remove|drop|no must|no requirements|no specific)\b/.test(t)){p.features=[];p.unverified=[];p.minBeds=null;p.minBaths=null;p.minSqft=null;p.maxBeds=null;p.maxBaths=null;p.maxSqft=null;}
  }
  const specs: ['minBeds'|'minBaths'|'minSqft','maxBeds'|'maxBaths'|'maxSqft',RegExp,number,number][]=[
    ['minBeds','maxBeds',/\b(\d+)\s*(?:\+|or more)?\s*[- ]?\s*(?:bedrooms?|beds?|br)\b/,30,1],
    ['minBaths','maxBaths',/\b(\d+(?:\.5)?)\s*(?:\+|or more)?\s*[- ]?\s*(?:bathrooms?|baths?|ba)\b/,30,.5],
    ['minSqft','maxSqft',/\b(\d[\d,]*)\s*(?:\+|or more)?\s*(?:sq\.?\s*ft\.?|square feet|sqft)\b/,1000000,1]
  ];
  for(const [minKey,maxKey,regex,max,step] of specs){
    const m=t.match(regex);if(!m)continue;
    const n=Number(m[1].replace(/,/g,''));if(n>max)continue;
    const before=t.slice(Math.max(0,m.index!-30),m.index!);
    p[minKey]=null;p[maxKey]=null;
    if(/(?:at most|up to|no more than|maximum(?: of)?)\s*$/.test(before))p[maxKey]=n;
    else if(/(?:under|less than|fewer than|below)\s*$/.test(before))p[maxKey]=Math.max(0,n-step);
    else if(/(?:exactly|only)\s*$/.test(before))p[minKey]=p[maxKey]=n;
    else p[minKey]=/(?:over|more than|above)\s*$/.test(before)?n+step:n;
    p.mustHavesKnown=true;recognized=true;
  }
  if(/\b(any beds|any bedrooms|no bedroom minimum|remove (?:the )?bedroom (?:limit|minimum))\b/.test(t)){p.minBeds=null;p.maxBeds=null;recognized=true;}
  if(/\b(any size|no size minimum|remove (?:the )?size (?:limit|minimum))\b/.test(t)){p.minSqft=null;p.maxSqft=null;recognized=true;}
  // Resolve explicit comparisons to a named fixture, or to the previous top result.
  if(/\bthan\b/.test(t)) {
    const reference=properties.find(x=>t.includes(norm(x.name)))||(/\bthan (?:that|this|it|the first(?: one)?|the top(?: one)?)\b/.test(t)?properties.find(x=>x.id===lastRecommendedIds[0]):undefined);
    if(reference){
      if(ranking==='price'){p.maxPrice=Math.min(p.maxPrice??Infinity,reference.price-1);p.budgetKnown=true;}
      if(ranking==='price-desc'){p.minPrice=Math.max(p.minPrice??0,reference.price+1);p.budgetKnown=true;}
      if(ranking==='size')p.minSqft=Math.max(p.minSqft??0,reference.sqft+1);
      if(ranking==='size-asc')p.maxSqft=Math.min(p.maxSqft??Infinity,reference.sqft-1);
      if(ranking==='beds')p.minBeds=Math.max(p.minBeds??0,reference.beds+1);
      if(ranking==='beds-asc')p.maxBeds=Math.min(p.maxBeds??Infinity,reference.beds-1);
    } else if(/\bthan (?:that|this|it|the first(?: one)?)\b/.test(t)&&ranking) {
      note='Which home should I compare against? Name a listing, or ask for the overall cheapest, biggest, or most bedrooms.';noteQuestion='criteria';
    }
  }
  for(const [key,regex] of Object.entries(featurePatterns)){
    const m=t.match(regex);if(!m)continue;
    const remove=negated(t,m.index!)||/^(?:.{0,12})(?:isn't|is not|not) (?:needed|required|important)/.test(t.slice(m.index!+m[0].length));
    p.features=remove?p.features.filter(f=>f!==key):unique([...p.features,key]);p.mustHavesKnown=true;recognized=true;
  }
  for(const [regex,label] of unsupportedPatterns){const m=t.match(regex);if(m){p.unverified=negated(t,m.index!)?p.unverified.filter(f=>f!==label):unique([...p.unverified,label]);p.mustHavesKnown=true;recognized=true;}}
  if(question==='features'&&!recognized&&t.length>2&&!/^(hi|hello|thanks|thank you|ok|yes|help|show matches)[.!]?$/.test(t)){
    // Keep unusual requirements visible rather than silently losing a must-have.
    p.unverified=unique([...p.unverified,message.trim().slice(0,100)]);p.mustHavesKnown=true;recognized=true;
  }
  if(/\b(show (?:me )?(?:the |my )?matches|find matches|recommend (?:some|homes|properties)|that's all|that is all)\b/.test(t)){
    p.mustHavesKnown=true;recognized=true;
  }
  // "Good" is subjective; do not silently turn it into a lowest-price verdict.
  if(!ranking && /\b(?:good|best|nice|perfect|ideal|better) (?:house|home|place|property)|\ba good (?:one|fit)\b/.test(t)
    && !/\d/.test(t) && !Object.values(featurePatterns).some(regex=>regex.test(t))) {
    note='What would make a home a good fit for you: a lower price, more floor space, more bedrooms, a particular city, or a listed feature? “Good” alone doesn’t give me a factual way to rank the homes.';noteQuestion='criteria';
  }
  if(!note && !/\d/.test(t) && /\b(?:cheapest|affordable|budget[- ]friendly)\b/.test(t) && /\b(?:biggest|largest|spacious|most space)\b/.test(t)) {
    note='Lowest price and most floor space can point to different homes. Which should come first: lowest asking price, most floor space, or lowest price per sq ft? A purchase cap also lets me find the biggest home within that budget.';noteQuestion='criteria';
  }
  return {preferences:p,recognized:recognized||more,note,noteQuestion,reset:false,more};
}
export function matchesPreferences(p:Property,q:Preferences):boolean {
  return (q.minPrice===null||p.price>=q.minPrice)&&(q.maxPrice===null||p.price<=q.maxPrice)
    &&(!q.cities?.length||q.cities.includes(p.city))&&(!q.types?.length||q.types.includes(p.type))
    &&(q.minBeds===null||p.beds>=q.minBeds)&&(q.minBaths===null||p.baths>=q.minBaths)&&(q.minSqft===null||p.sqft>=q.minSqft)
    &&(q.maxBeds===null||p.beds<=q.maxBeds)&&(q.maxBaths===null||p.baths<=q.maxBaths)&&(q.maxSqft===null||p.sqft<=q.maxSqft)
    &&q.features.every(key=>featureTests[key]?.(p)===true);
}
export function explainMatch(p:Property,q:Preferences,candidates:Property[]=[]):Match {
  const reasons:string[]=[];
  if(q.sort!=='relevance'&&candidates.length)reasons.push(rankReason(p,q.sort,candidates));
  if(q.maxPrice!==null) reasons.push(`${usd(p.price)} — ${p.price===q.maxPrice?'right at':`${usd(q.maxPrice-p.price)} below`} your ${usd(q.maxPrice)} purchase limit${q.minPrice!==null?`, within your ${usd(q.minPrice)}–${usd(q.maxPrice)} range`:''}.`);
  else if(q.minPrice!==null)reasons.push(`${usd(p.price)} is above your ${usd(q.minPrice)} minimum.`);
  else reasons.push(`${usd(p.price)} fictional asking price; no purchase-price limit is applied.`);
  reasons.push(`${p.city}, ${p.state}${q.cities?.length?' — in your chosen search area':` · ${p.neighborhood}`}${q.types?.length?`; ${p.type.toLowerCase()} matches your preferred type`:''}.`);
  const size:string[]=[];
  if(q.minBeds!==null)size.push(`${p.beds} bedrooms for your ${q.minBeds}+ bedroom request`);
  if(q.minBaths!==null)size.push(`${p.baths} bathrooms for your ${q.minBaths}+ request`);
  size.push(q.minSqft!==null?`${p.sqft.toLocaleString('en-US')} sq ft meets your ${q.minSqft.toLocaleString('en-US')} sq ft minimum`:`${p.sqft.toLocaleString('en-US')} sq ft${q.minBeds===null?`, ${p.beds} beds`:''}`);
  reasons.push(size.join('; ')+'.');
  if(q.maxBeds!==null)reasons.push(`${p.beds} bedrooms meets your ${q.maxBeds}-bedroom maximum.`);
  if(q.maxBaths!==null)reasons.push(`${p.baths} bathrooms meets your ${q.maxBaths}-bathroom maximum.`);
  if(q.maxSqft!==null)reasons.push(`${p.sqft.toLocaleString('en-US')} sq ft is within your ${q.maxSqft.toLocaleString('en-US')} sq ft maximum.`);
  if(p.type==='Duplex')reasons.push('Bedroom count, floor area and sample rent describe both units together, not one apartment.');
  for(const key of q.features){
    const tag=key==='outdoor'?p.tags.find(t=>/outdoor|garden/i.test(t)):key==='light'?p.tags.find(t=>/light/i.test(t)):key==='entry'?p.tags.find(t=>/entry|entrances/i.test(t)):null;
    reasons.push(key==='no-hoa'?'The demo lists $0/month in HOA fees, matching your no-HOA request.':`${tag||featureLabels[key]} is explicitly listed, matching your ${featureLabels[key].toLowerCase()} preference.`);
  }
  return {property:p,reasons,caveats:q.unverified.length?[`Not verified: ${q.unverified.join(', ')}. The demo has no data for these requirements.`]:[]};
}
export function preferenceSummary(p:Preferences):string[] {
  const result:string[]=[];
  if(p.cities!==null)result.push(p.cities.length?p.cities.join(' or '):'Any city');
  if(p.budgetKnown)result.push(p.maxPrice!==null?(p.minPrice!==null?`${usd(p.minPrice)}–${usd(p.maxPrice)}`:`Up to ${usd(p.maxPrice)}`):p.minPrice!==null?`From ${usd(p.minPrice)}`:'Open budget');
  if(p.types!==null)result.push(p.types.length?p.types.join(' / '):'Any property type');
  if(p.minBeds!==null)result.push(`${p.minBeds}+ beds`);if(p.minBaths!==null)result.push(`${p.minBaths}+ baths`);if(p.minSqft!==null)result.push(`${p.minSqft.toLocaleString('en-US')}+ sq ft`);
  result.push(...p.features.map(f=>featureLabels[f]),...p.unverified.map(f=>`${f} · unverified`));
  if(p.maxBeds!==null)result.push(`At most ${p.maxBeds} beds`);
  if(p.maxBaths!==null)result.push(`At most ${p.maxBaths} baths`);
  if(p.maxSqft!==null)result.push(`At most ${p.maxSqft.toLocaleString('en-US')} sq ft`);
  if(p.sort!=='relevance')result.push(rankingRules[p.sort].label);
  return result;
}
function chips(items:[string,string][]):Suggestion[]{return items.map(([label,message])=>({label,message}));}
export function nextReply(p:Preferences,properties:Property[],options:{recognized?:boolean; note?:string; noteQuestion?:Question; offset?:number; more?:boolean; memory?:RejectionMemory; work?:WorkCommute|null}={}):AssistantReply {
  const cities=unique(properties.map(x=>x.city));
  const base:AssistantReply={text:'',matches:[],suggestions:[],question:null,offset:0,total:0};
  if(options.note)return {...base,text:options.note,question:options.noteQuestion===undefined?'budget':options.noteQuestion,suggestions:options.noteQuestion==='budget'||options.noteQuestion===undefined?chips([['Under $350k','My purchase budget is $350k'],['Under $500k','My purchase budget is $500k']]):chips([['Lowest price','Show me the cheapest home'],['Most space','Show me the biggest place'],['Most bedrooms','Show me the most bedrooms']])};
  const missing=p.cities?.filter(city=>!cities.includes(city))||[];
  if(missing.length)return {...base,text:`${missing.join(' and ')} ${missing.length===1?"isn't":"aren't"} in this fictional catalogue. I have homes in ${cities.length} cities, including Lincoln, Omaha, Chicago, Austin, and Seattle. Which city should we try instead? Your other preferences are still here.`,question:'city',suggestions:chips([['Lincoln','Lincoln instead'],['Chicago','Chicago instead'],['Austin','Austin instead'],['Any city','Any city']])};
  const prefix=options.recognized===false?"I didn't quite catch a property preference. ":'';
  const memory=options.memory,work=options.work??null;
  const hasCriteria = !!(memory?.enabled&&learnedRules(memory,work).length)||p.sort!=='relevance'||p.cities!==null||p.budgetKnown||p.types!==null||p.mustHavesKnown||p.minBeds!==null||p.minBaths!==null||p.minSqft!==null||p.features.length>0||p.unverified.length>0;
  if(!hasCriteria)return {...base,text:`${prefix}What matters most to you? I can show the cheapest home, the biggest place, or the most bedrooms across all ${properties.length} demo listings right away. You can also give a city, budget, type, or must-have.`,question:'criteria',suggestions:chips([['Cheapest house','Show me the cheapest house'],['Biggest place','Show me the biggest place'],['Most bedrooms','Which home has the most bedrooms?']])};
  const eligible=properties.filter(property=>!memory?.records[property.id]);
  let matching=rankProperties(eligible.filter(property=>matchesPreferences(property,p)),p.sort);
  if(memory&&p.sort==='relevance')matching=rerankWithMemory(matching,memory,work);
  if(!matching.length){
    if(memory&&properties.some(x=>matchesPreferences(x,p)&&memory.records[x.id]))return {...base,text:'The homes matching these filters have all been marked “Not interested”. Your filters are unchanged. Open Your preferences to review or undo those passes.',suggestions:chips([['Use learned preferences','Use my learned preferences']])};
    const suggestions:Suggestion[]=[];
    if(p.maxPrice!==null){const noCap=eligible.filter(x=>matchesPreferences(x,{...p,maxPrice:null})).sort((a,b)=>a.price-b.price);if(noCap.length)suggestions.push({label:`Try ${usd(noCap[0].price)}`,message:`Raise my purchase budget to ${noCap[0].price}`});}
    if(p.types?.length)suggestions.push({label:'Any property type',message:'Any property type'});
    if(p.features.length||p.minBeds!==null||p.minSqft!==null||p.minBaths!==null||p.maxBeds!==null||p.maxBaths!==null||p.maxSqft!==null)suggestions.push({label:'Remove must-haves',message:'Remove all must-haves'});
    if(p.cities?.length)suggestions.push({label:'Any city',message:'Any city'});
    return {...base,text:`No demo homes meet all of those filters together. I haven’t stretched your budget or changed your preferences. Which part would you like to adjust?${p.unverified.length?` Also, ${p.unverified.join(', ')} is not verified by these fixtures.`:''}`,suggestions:suggestions.slice(0,4)};
  }
  let offset=options.offset||0;
  if(!options.more)offset=0;
  const exhausted=offset>=matching.length;
  if(exhausted)offset=0;
  const selected=matching.slice(offset,offset+3);
  const text=`${exhausted?'That’s the full shortlist for these preferences. Here are the first matches again. ':''}${offset?`Here ${selected.length===1?'is the last match':'are the next matches'}`:`I found ${matching.length} ${matching.length===1?'demo home':'demo homes'} ${p.unverified.length?`that ${matching.length===1?'fits':'fit'} your known filters`:`that ${matching.length===1?'matches':'match'} your preferences`}`}.${!offset?` ${matching.length>3?'Here are 3 to start with. ':matching.length===1?'Just one fits; I won’t pad the list with mismatches. ':''}`:' '}${p.unverified.length?`These are candidates, not fully verified matches: ${p.unverified.join(', ')} still needs checking. `:''}Every price and property below is fictional.${prefix?" You can refine the search by naming a different budget, city, type, or feature.":''}`;
  const rule=rankingRules[p.sort];
  const scope=p.cities?.length?p.cities.join(' or '):'all cities';
  let answer=text;
  if(p.sort!=='relevance') {
    const best=matching[0];
    const tied=matching.filter(x=>rule.value(x)===rule.value(best)).length;
    answer=`${offset?`Next in the same ranking. `:''}${exhausted?'That’s the full shortlist; here are the first results again. ':''}${rule.label}: ${best.name} in ${best.city}, ${best.state} — ${rule.format(rule.value(best))}.${tied>1?` ${tied} homes share that top value.`:''} I compared ${matching.length} matching ${p.types?.length===1&&p.types[0]==='Single-family'?'single-family houses':'listings'} across ${scope}, from ${properties.length} demo homes. ${p.types?.length===1&&p.types[0]==='Single-family'?'“House” means single-family. ':''}Showing ${offset+1}–${offset+selected.length} in order.${tied>1?' Ties use lower price, then more floor space.':''} ${rule.explanation||''} Every property and input is fictional.${p.unverified.length?` These are candidates, not fully verified matches: ${p.unverified.join(', ')} is not recorded.`:''}`;
  }
  const suggestions:Suggestion[]=chips([['Lower prices first','Show me the cheapest matches'],['More space first','Show me the largest matches']]);
  if(offset+3<matching.length)suggestions.unshift({label:'Show more matches',message:'Show me more matches'});
  if(memory){const narrative=learningNarrative(memory,work,p.sort!=='relevance',properties.filter(x=>memory.records[x.id]).length);if(narrative)answer+=' '+narrative;if(learnedRules(memory,work).length)suggestions.push({label:'Use learned preferences',message:'Use my learned preferences'});}
  return {...base,text:answer,matches:selected.map(property=>{const match=explainMatch(property,p,matching);if(memory&&p.sort==='relevance'){const learned=matchLearning(property,memory,work);match.reasons.push(...learned.reasons);match.caveats.push(...learned.caveats);}return match;}),suggestions,offset:offset+selected.length,total:matching.length};
}
/** Validate server output at the trust boundary; reject rather than guess. */
export function validPreferences(value:unknown):value is Preferences {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const p=value as Preferences;
  const bounded=(v:unknown,max:number)=>v===null||typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
  const stringArray=(v:unknown,max:number)=>Array.isArray(v)&&v.length<=max&&v.every(x=>typeof x==='string'&&x.length>0&&x.length<=100);
  return typeof p.budgetKnown==='boolean'&&typeof p.mustHavesKnown==='boolean'&&bounded(p.minPrice,100000000)&&bounded(p.maxPrice,100000000)
    &&(p.minPrice===null||p.maxPrice===null||p.minPrice<=p.maxPrice)&&(p.cities===null||stringArray(p.cities,20))
    &&(p.types===null||Array.isArray(p.types)&&p.types.length<=4&&p.types.every(t=>propertyTypes.includes(t)))
    &&bounded(p.minBeds,30)&&bounded(p.minBaths,30)&&bounded(p.minSqft,1000000)
    &&bounded(p.maxBeds,30)&&bounded(p.maxBaths,30)&&bounded(p.maxSqft,1000000)
    &&Array.isArray(p.features)&&p.features.length<=9&&p.features.every(f=>Object.hasOwn(featureLabels,f))
    &&stringArray(p.unverified,12)&&rankingKeys.includes(p.sort);
}
