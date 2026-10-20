export const dimensions=['行情结构','市场宽度','风格轮动','估值','流动性','情绪','事件'];
export const modes={normal:'正常演示',missing:'宽度缺失',conflict:'来源冲突',stale:'数据过期',failure:'接口失败',extreme:'极端样本'};
export const indices=['沪深300','中证500','创业板指'];
export const units=['%','%','百分点','倍','亿元','家','条'];
export const fields=['interval_return','advancing_ratio','small_minus_large','pe_ttm','daily_turnover','limit_up_count','synthetic_event_count'];
export const definitions=['所选指数区间末值/首值−1；非预测','构造A股样本中上涨家数/有效家数；剔除停牌','合成小盘指数区间收益−合成大盘指数区间收益','构造成分市值总额/TTM盈利总额；仅正盈利样本','所选指数构造成分当日成交额之和；不是全市场成交额','合成全A样本涨停家数；按构造涨停标记计数','合成事件记录条数；不代表真实政策或新闻'];
export function intent(q){
 const normalized=q.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF\s]/g,'').toLowerCase();
 if(/买|卖|仓位|配置比例|涨多少|跌多少|预测|明天.*涨|明天.*跌|保证|收益承诺|buy|sell|allocation|predict|profit|tomorrow|position/.test(normalized))return {blocked:true,topic:'合规边界',message:'无法提供涨跌预测、仓位或交易建议。可改为研究市场宽度、风格分化与状态切换条件。'};
 const topic=/行业|板块/.test(q)?'行业':/风格|大小盘/.test(q)?'风格':/风险|流动性/.test(q)?'风险':/历史|阶段/.test(q)?'历史':/市场|指数|状态|宽度|证据|研判|矛盾/.test(q)?'市场':null;
 return topic?{topic,blocked:false}:{blocked:true,topic:'待澄清',message:'本演示支持市场状态、行业、风格、风险与历史阶段研究，请选择一个研究问题。'};
}
export function plan(input){const parsed=intent(input.question);return {parsed,steps:dimensions.map((dimension,i)=>({id:`P${i+1}`,dimension,adapter:'DemoAdapter',method:'loadSyntheticSlice',args:{index:input.index,start:input.start,end:input.end,topic:parsed.topic,field:fields[i]}}))};}
export class DemoAdapter{
 async fetch(step,input){await new Promise(r=>setTimeout(r,55));return fixture(step,input);}
}
export function fixture(step,input){
 const i=dimensions.indexOf(step.dimension),n=indices.indexOf(input.index),span=(Date.parse(input.end)-Date.parse(input.start))/86400000;
 const dataAsOf=input.mode==='stale'?'2025-06-10T15:00:00+08:00':input.end+'T15:00:00+08:00';
 const status=input.mode==='failure'&&i===4?'failed':input.mode==='missing'&&i===1?'missing':input.mode==='conflict'&&i===1?'conflict':input.mode==='stale'?'stale':'ok';
 const value=[+(1.8+n*.9+span*.04).toFixed(2),48+n*7,+(1.2+n*.5+span*.02).toFixed(2),13+n*8,1800+n*650,38+n*10,2][i];
 return {id:`E${i+1}`,dimension:step.dimension,field:fields[i],value:status==='missing'||status==='failed'?null:input.mode==='extreme'&&i===1?4:value,unit:units[i],status,source:'synthetic_fixture_v1',asOf:dataAsOf,scope:i===1||i===5?'合成全A样本（1000家，无真实证券）':input.index+'合成样本',definition:definitions[i],callId:step.id,alternatives:status==='conflict'?[{source:'synthetic_A',value:48},{source:'synthetic_B',value:72}]:null,series:i===0?Array.from({length:span+1},(_,j)=>({date:new Date(Date.parse(input.start)+j*86400000).toISOString().slice(0,10),value:+(100+(1.8+n*.9+span*.04)*j/span+Math.sin(j/span*Math.PI)*.8).toFixed(2)})):null};
}
export function summarize(evidence,input){
 const invalid=evidence.filter(e=>e.status!=='ok'),valid=evidence.filter(e=>e.status==='ok');
 let state=invalid.length?'待确认':evidence[1].value>=55?'扩散':evidence[1].value<35?'收缩':'分化';
 const confidence=Math.round(valid.length/7*100);
 const finding=state==='待确认'?'关键数据存在异常，暂停整体状态判断。':state==='扩散'?'合成样本中参与度扩散，仍需观察持续性。':state==='收缩'?'合成样本参与度收缩，极端条件限制常规归纳。':'合成指数结构与参与度分化，结构强度未获广泛确认。';
 return {state,confidence,finding,contradiction:invalid.length?'异常字段不能用于正常结论；修复后须重新研究。':'指数区间表现与上涨参与度需要交叉验证 [E1,E2]。',facts:valid.map(e=>({text:`${e.dimension}：${e.value} ${e.unit}`,evidenceIds:[e.id]})),inferences:invalid.length?[]:[{text:finding,evidenceIds:['E1','E2']}],unknowns:invalid.length?invalid.map(e=>`${e.id} ${e.dimension}：${e.status}`):['合成样本无法描述实际市场；无真实政策、新闻与资金数据','规则归纳未接入在线大模型；充分度不是预测概率'],transitions:['有效宽度≥55%，且结构区间收益>0 → 扩散候选；需连续3个交易日真实数据确认（本版不具备）。','有效宽度<35% → 收缩样本状态；35%≤宽度<55% → 分化。','任一维缺失、冲突、过期或失败 → 待确认，暂停整体结论。']};
}
export async function research(input,onProgress=()=>{},adapter=new DemoAdapter()){
 const p=plan(input),runId=globalThis.crypto?.randomUUID?.()||String(Date.now());
 const base={schemaVersion:1,runId,createdAt:new Date().toISOString(),input:{...input},dataMode:'DEMO_SYNTHETIC',aiMode:'deterministic_rules_no_remote_llm',plan:p.steps,logs:[],evidence:[]};
 if(p.parsed.blocked)return {...base,error:p.parsed.message};
 if(!indices.includes(input.index)||!modes[input.mode]||!/^2025-06-\d{2}$/.test(input.start)||!/^2025-06-\d{2}$/.test(input.end)||input.start<'2025-06-01'||input.end>'2025-06-20'||input.start>=input.end)return {...base,error:'无样本覆盖或区间无效：请选择2025-06-01至2025-06-20内至少两日。'};
 for(const s of p.steps){const startedAt=new Date().toISOString();let e;try{e=await adapter.fetch(s,input);}catch{e={id:`E${base.evidence.length+1}`,dimension:s.dimension,field:s.args.field,value:null,status:'failed',unit:units[base.evidence.length],source:'synthetic_fixture_v1',asOf:input.end+'T15:00:00+08:00',scope:input.index,definition:'适配器抛出异常，无可用数据',callId:s.id};}base.evidence.push(e);base.logs.push({callId:s.id,adapter:'DemoAdapter',transport:'local_simulation_no_network',startedAt,endedAt:new Date().toISOString(),status:e.status,args:s.args});onProgress([...base.logs]);}
 return {...base,result:summarize(base.evidence,input),followup:{topic:p.parsed.topic,scope:p.parsed.topic==='行业'?'无行业数据，不能排列行业强弱；需行业分类版本、区间成分及行业收益。':p.parsed.topic==='历史'?'仅构造路径，无真实历史库，不输出相似度或未来概率。':p.parsed.topic==='风险'?'成交额不能替代资金流；需融资、宏观与跨市场数据。':p.parsed.topic==='风格'?'E3为合成小盘减大盘收益差，不代表风格持续性。':'研究七维证据与状态转换条件。'}};
}
export function markdown(r){return '# 观澜研究记录 · DEMO合成数据\n\n不是实时行情，不提供投资建议。\n\n```json\n'+JSON.stringify(r,null,2)+'\n```\n';}
