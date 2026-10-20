export type Quality = 'ok'|'missing'|'conflict'|'stale'|'failed';
export interface ResearchInput {index:string; start:string; end:string; question:string; mode:string;}
export interface PlanStep {id:string; dimension:string; adapter:string; method:string; args:{index:string;start:string;end:string;topic:string;field:string};}
export interface Evidence {id:string;dimension:string;field:string;value:number|null;unit:string;status:Quality;source:string;asOf:string;scope:string;definition:string;callId:string;alternatives?:{source:string;value:number}[]|null;series?:{date:string;value:number}[]|null;}
/** Future remote adapters must run behind a server. Missing data and errors must never become ok. */
export interface DataAdapter {fetch(step:PlanStep,input:ResearchInput):Promise<Evidence>;}
