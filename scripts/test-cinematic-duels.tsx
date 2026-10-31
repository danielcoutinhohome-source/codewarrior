import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WORLDS } from "../src/lib/game";
import { PLAYER_MOVESETS,playerTimeline,performPlayerMove,REST } from "../src/lib/playerCombat";
import { ENEMY_MOVESETS,performEnemyMove,type ActorPose } from "../src/lib/enemyCombat";
import { enemyFinale } from "../src/lib/cinematicEnemy";
import { bossApproach,BOSS_GATES,gateKey,bossGateIsOpen,openBossGate } from "../src/lib/bossApproach";
import { BossDoor,BossRoom,PassageFrame } from "../src/components/WorldPassage";
import BossGate from "../src/components/BossGate";
import { worldDetails } from "../src/lib/worldDetails";
Object.assign(globalThis,{React});
async function main(){
  let sequences=0;
  for(const compact of [true,false])for(const boss of [true,false]) {
    const height=compact?350:480,foeSize=compact?(boss?150:126):(boss?220:178),air=compact?58:96;
    assert.ok(height*.86-foeSize-air>=90,"Aerial attacks stay below the health bars and move banner");
  }
  for(const compact of [true,false]) {
    for(const moves of Object.values(PLAYER_MOVESETS)) {
      const final=moves[3],steps=playerTimeline(final,180,compact);
      const normal=playerTimeline(moves[0],180,compact);
      assert.ok(steps.reduce((n,s)=>n+s.ms,0)>4000);
      assert.ok(steps.reduce((n,s)=>n+s.ms,0)>normal.reduce((n,s)=>n+s.ms,0)*3);
      assert.ok(steps.filter(s=>s.contact&&s.contact!=="freeze").length>=5);
      assert.equal(steps.filter(s=>s.hit).length,1);
      assert.ok(steps.findIndex(s=>s.contact==="freeze")<steps.findIndex(s=>s.hit));
      const c=new AbortController();let hits=0;const poses:Record<string,ActorPose>={};
      await performPlayerMove(final,{signal:c.signal,distance:180,compact,reduced:false,animate:async(a,p)=>{poses[a]=p;},wait:async()=>{},hit:()=>hits++,effect:()=>{},contact:stage=>{if(stage==="juggle")c.abort();}});
      assert.equal(hits,0);for(const a of ["hero","body","weapon","target"])assert.deepEqual(poses[a],REST);
      sequences++;
    }
    for(const world of WORLDS)for(const enemy of world.enemies) {
      const move=ENEMY_MOVESETS[enemy.design].finisher,steps=enemyFinale(move,180,compact);
      assert.ok(steps.reduce((n,s)=>n+s.ms,0)>4000);
      assert.equal(steps.filter(s=>s.hit).length,1);
      assert.ok(steps.filter(s=>s.contact).length>=6);
      for(const reducedMotion of [true,false]) {
        const c=new AbortController();let hits=0,contacts=0;const poses:Record<string,ActorPose>={};
        await performEnemyMove(move,{signal:c.signal,distance:180,compact,reducedMotion,animate:async(a,p)=>{poses[a]=p;},wait:async()=>{},effect:()=>{},hit:()=>hits++,contact:()=>contacts++});
        assert.equal(hits,1);assert.ok(reducedMotion?contacts===0:contacts>=6);
        if(!reducedMotion)assert.ok((poses.target.rotate as number[]).at(-1)!==0,"Victim remains knocked down");
      }
      const c=new AbortController();let lateHits=0;const poses:Record<string,ActorPose>={};
      await performEnemyMove(move,{signal:c.signal,distance:180,compact,reducedMotion:false,animate:async(a,p)=>{poses[a]=p;},wait:async()=>{},effect:()=>{},hit:()=>lateHits++,contact:stage=>{if(stage==="juggle")c.abort();}});
      assert.equal(lateHits,0);for(const a of ["foe","body","target"])assert.deepEqual(poses[a],REST);
      sequences++;
    }
  }
  let previous=1;
  for(let wins=0;wins<=4;wins++) {
    const stars=Array.from({length:5},(_,i)=>i<wins?1:undefined);
    const a=bossApproach(stars,0);assert.equal(a.cleared,wins);assert.equal(a.ready,wins===4);assert.ok(a.fog<previous);previous=a.fog;
    if(wins===4)assert.ok(bossApproach(stars,4).fog<a.fog);
  }
  assert.notEqual(gateKey("a",0),gateKey("b",0));assert.notEqual(gateKey("a",0),gateKey("a",1));
  assert.equal(bossGateIsOpen("private-user",0),false);
  openBossGate("private-user",0);
  assert.equal(bossGateIsOpen("private-user",0),true);
  assert.equal(bossGateIsOpen("different-user",0),false);
  assert.equal(bossGateIsOpen("private-user",1),false);
  for(const world of WORLDS) {
    const t=world.theme,gate=BOSS_GATES[t.scene];assert.ok(gate.answer>=0&&gate.answer<gate.options.length);assert.equal(new Set(gate.options).size,3);
    const dialog=renderToStaticMarkup(<BossGate scene={t.scene} onOpen={()=>{}} onBack={()=>{}}/>);
    assert.ok(dialog.includes('role="dialog"')&&dialog.includes('aria-modal="true"')&&dialog.includes("Unlimited tries"));
    for(const element of [<BossDoor theme={t} ready={false}/>,<BossDoor theme={t} ready/>,<BossRoom theme={t}/>,<PassageFrame theme={t}/>]) assert.ok(!/NaN|undefined/.test(renderToStaticMarkup(element)));
    for(const mobile of [true,false]){const d=worldDetails(t,mobile);assert.ok(d.props.length<=30&&d.landmarks.length<=2);}
  }
  console.log(`Cinematic duels passed: ${sequences} extended sequences, lethal-hit timing, mid-combo interruption, reduced motion, seven puzzle gates, progressive fog, and sparse maps.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
