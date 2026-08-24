export interface ResourceSnapshot { totalMemoryMb:number; availableMemoryMb:number; running:number }
export interface CapacityDecision { limit:number; availableSlots:number; pressure:"normal"|"elevated"|"critical"; reason:string }
export class CapacityController {
  constructor(readonly configuredLimit=2){if(!Number.isInteger(configuredLimit)||configuredLimit<1||configuredLimit>4)throw new Error("Agent concurrency must be between 1 and 4")}
  decide(s:ResourceSnapshot):CapacityDecision{const ratio=s.totalMemoryMb===0?0:s.availableMemoryMb/s.totalMemoryMb;const pressure=ratio<.08?"critical":ratio<.18?"elevated":"normal";const limit=pressure==="normal"?this.configuredLimit:1;return{limit,availableSlots:Math.max(0,limit-s.running),pressure,reason:pressure==="normal"?"Configured capacity available":`Concurrency reduced under ${pressure} memory pressure`}}
}
export type ProgressClock="heartbeat"|"engine"|"tool"|"meaningful"|"checkpoint"|"deliverable"|"acceptance";
export type AttemptClocks=Record<ProgressClock,number>;
export function diagnoseStall(c:AttemptClocks,now=Date.now()):"healthy"|"silent"|"stalled"|"acceptance-stalled"{if(now-c.heartbeat>60_000)return"silent";if(now-c.meaningful>5*60_000)return"stalled";if(now-c.acceptance>15*60_000)return"acceptance-stalled";return"healthy"}
