import type { ActorPose, EnemyMove, AttackContext } from "./enemyCombat";
export type EnemyCinematicStage = "stagger" | "launch" | "juggle" | "freeze";
export type EnemyBeat = { ms:number; foe?:ActorPose; body?:ActorPose; target?:ActorPose; contact?:EnemyCinematicStage; hit?:boolean };
export function enemyFinale(move:EnemyMove,distance:number,compact:boolean):EnemyBeat[] {
  const d=Math.max(0,distance),air=compact?42:74;
  const aerial=["rise","dive","orbit","vortex"].includes(move.motion);
  const heavy=["quake","dive","rise","summon"].includes(move.motion);
  return [
    {ms:620,body:{scaleX:1.08,scaleY:.9,rotate:8}},
    {ms:360,foe:{x:-d*.9,y:0,rotate:-8}},
    {ms:160,contact:"stagger",target:{x:[0,-12,-4],rotate:[0,-10,-3]}},
    {ms:350,contact:"launch",foe:{x:-d,y:-8},body:{rotate:heavy?-18:12},target:{y:-air*.7,x:-8,rotate:12}},
    {ms:330,foe:{x:-d*.85,y:-air*.55,rotate:8}},
    ...Array.from({length:Math.max(3,Math.min(5,move.beats))},(_,i):EnemyBeat=>({ms:210+i*20,contact:"juggle",foe:{x:-d*(i%2?.8:1),y:-air*(aerial?(i%2?.7:.9):(i%2?.5:.7)),rotate:move.motion==="vortex"?i*35:i%2?-15:15},target:{x:[-8,-18,-8],y:-air*(i%2?.6:.75),rotate:i%2?14:-12}})),
    {ms:520,contact:"freeze",foe:{x:-d*.85,y:heavy?-air:-air*.5,scale:1.08},target:{y:-air*.65,rotate:8}},
    {ms:450,foe:{x:-d,y:0,rotate:-12,scale:1},target:{x:-12,y:0,rotate:0}},
    {ms:700,hit:true,target:{x:[-12,-25,-16],y:[0,-8,22],rotate:[0,-16,-65],scaleY:[1,.9,.85]}},
  ];
}
// Shared cancellation discipline with normal attacks. Contact beats are visual;
// only the last beat invokes the existing damage/HP callback.
export async function performEnemyFinale(move:EnemyMove,ctx:AttackContext) {
  let stop=()=>{},completed=false;
  const run=async(task:()=>Promise<unknown>)=>{
    if(ctx.signal.aborted)throw new Error("cancelled");
    try {const cancelled=new Promise((_,reject)=>{stop=()=>reject(new Error("cancelled"));ctx.signal.addEventListener("abort",stop,{once:true});});await Promise.race([Promise.resolve().then(()=>{if(ctx.signal.aborted)throw new Error("cancelled");return task();}),cancelled]);if(ctx.signal.aborted)throw new Error("cancelled");}
    finally {ctx.signal.removeEventListener("abort",stop);}
  };
  try {
    ctx.effect("telegraph");
    for(const [i,step] of enemyFinale(move,ctx.distance,ctx.compact).entries()) {
      if(ctx.signal.aborted)return false;
      if(i===1)ctx.effect("travel");
      if(step.contact)ctx.contact?.(step.contact,i);
      if(ctx.signal.aborted)return false;
      if(step.hit){ctx.effect("impact");ctx.hit();}
      await run(()=>Promise.all((["foe","body","target"] as const).filter(actor=>step[actor]).map(actor=>ctx.animate(actor,step[actor]!,step.ms))));
    }
    completed=true;return true;
  } catch(e) {if(!ctx.signal.aborted)throw e;return false;}
  finally {await Promise.all((["foe","body","target"] as const).filter(actor=>!(actor==="target"&&completed&&!ctx.signal.aborted)).map(actor=>ctx.animate(actor,{x:0,y:0,rotate:0,scale:1,scaleX:1,scaleY:1,opacity:1},0)));}
}
