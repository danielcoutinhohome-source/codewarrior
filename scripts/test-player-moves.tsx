import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PLAYER_MOVESETS, PLAYER_WEAPONS, REST, playerMove, playerTimeline, playerWeapon, performPlayerMove, type PlayerContext } from "../src/lib/playerCombat";
import PlayerAttackFx, { PlayerSigil } from "../src/components/PlayerAttackFx";
import Warrior from "../src/components/Warrior";
Object.assign(globalThis,{ React });
async function main() {
  assert.equal(playerWeapon(undefined),"saber"); assert.equal(playerWeapon("unknown"),"saber");
  let runs=0, renders=0; const names=new Set<string>(),finishers=new Set<string>();
  for (const weapon of PLAYER_WEAPONS) {
    assert.equal(playerWeapon(`${weapon}-crimson`),weapon);
    assert.equal(new Set(PLAYER_MOVESETS[weapon].map(m=>m.style)).size,4);
    for(let i=0;i<9;i++)assert.equal(playerMove(weapon,i),PLAYER_MOVESETS[weapon][i%3]);
    assert.ok(playerMove(weapon,1,true).finisher);
    for(const move of PLAYER_MOVESETS[weapon]) {
      assert.ok(!names.has(move.name)); names.add(move.name);
      if(move.finisher) finishers.add(renderToStaticMarkup(<svg><PlayerSigil move={move} color="#79EEFF"/></svg>));
      for(const compact of [false,true]) for(const reduced of [false,true]) {
        const phases:string[]=[],poses:Record<string,unknown>={};let hits=0;
        const ctx:PlayerContext={signal:new AbortController().signal,distance:compact?75:240,compact,reduced,wait:async()=>{},animate:async(actor,pose)=>{poses[actor]=pose;},hit:()=>{hits++;},effect:phase=>phases.push(phase)};
        assert.equal(await performPlayerMove(move,ctx),true);assert.equal(hits,1);
        assert.deepEqual(phases,reduced?["charge","impact"]:["charge","strike","impact"]);
        for(const actor of ["hero","body","weapon","target"]) { if(actor==="target"&&move.finisher&&!reduced)assert.deepEqual(poses[actor],{x:20,y:20,rotate:55,scaleY:.85});else assert.deepEqual(poses[actor],REST,`${move.name}: reset ${actor}`); }
        runs++;
        const timeline=playerTimeline(move,ctx.distance,compact);
        assert.equal(timeline.filter(s=>s.hit).length,1);
        const beforeRecovery=[...timeline.slice(0,-1)].reverse().find(s=>s.weapon?.rotate!==undefined)!.weapon!.rotate!;
        const angle=Array.isArray(beforeRecovery)?beforeRecovery[beforeRecovery.length-1]:beforeRecovery;
        assert.ok(Math.abs((timeline[timeline.length-1].weapon!.rotate as number)-angle)<=180,`${move.name}: no full-turn recovery unwind`);
        // All travel fits the available gap; no pass-through or offscreen dash.
        for(const step of timeline) for(const [key,value] of Object.entries(step.hero||{})) {
          for(const n of Array.isArray(value)?value:[value]) {assert.ok(Number.isFinite(n));if(key==="x")assert.ok(n>=-10&&n<=ctx.distance);if(key==="y")assert.ok(n>=-(compact?46:78));}
        }
        for(const phase of ["charge","strike","impact"] as const) {
          const svg=renderToStaticMarkup(<PlayerAttackFx fx={{id:1,move,phase,ms:500,from:{x:80,y:170},to:{x:320,y:170},color:"#79EEFF",compact,reduced}}/>);
          assert.ok(!/NaN|undefined/.test(svg));renders++;
        }
      }
      for(const cancelAt of ["before","charge","strike","impact","recovery"]) {
        const c=new AbortController();let hits=0;const poses:Record<string,unknown>={};
        if(cancelAt==="before")c.abort();
        await performPlayerMove(move,{signal:c.signal,distance:140,compact:false,reduced:false,wait:async()=>{},animate:async(actor,pose,ms)=>{poses[actor]=pose;if(cancelAt==="recovery"&&ms>0&&pose===REST)c.abort();},hit:()=>{hits++;},effect:phase=>{if(cancelAt===phase)c.abort();}});
        assert.equal(hits,cancelAt==="recovery"?1:0,`${move.name}: cancel ${cancelAt}`);
        if(cancelAt!=="before")for(const actor of ["hero","body","weapon","target"])assert.deepEqual(poses[actor],REST);
      }
    }
    for(const body of ["bot","titan","valkyrie"]) {
      const svg=renderToStaticMarkup(<Warrior weapon={weapon} body={body} energy="#79EEFF" idle={false}/>);
      assert.equal((svg.match(/data-weapon-grip/g)||[]).length,1);
      assert.ok(svg.includes("160px 142px"));
    }
  }
  const c=new AbortController();let hits=0;
  const pending=performPlayerMove(playerMove("hammer",0,true),{signal:c.signal,distance:200,compact:false,reduced:false,wait:async()=>{},animate:async(_actor,_pose,ms)=>{if(ms)await new Promise(()=>{});},effect:()=>{},hit:()=>{hits++;}});
  queueMicrotask(()=>c.abort());assert.equal(await pending,false);assert.equal(hits,0);
  const synchronousAbort=new AbortController();
  assert.equal(await performPlayerMove(playerMove("scythe",0),{signal:synchronousAbort.signal,distance:100,compact:false,reduced:false,wait:async()=>{},animate:async(_a,_p,ms)=>{if(ms){synchronousAbort.abort();await new Promise(()=>{});}},effect:()=>{},hit:()=>{throw new Error("late impact");}}),false);
  const failedPoses:Record<string,unknown>={};
  await assert.rejects(performPlayerMove(playerMove("glaive",0),{signal:new AbortController().signal,distance:100,compact:false,reduced:false,wait:async()=>{},animate:async(a,p,ms)=>{if(ms)throw new Error("renderer failure");failedPoses[a]=p;},effect:()=>{},hit:()=>{}}),/renderer failure/);
  for(const actor of ["hero","body","weapon","target"])assert.deepEqual(failedPoses[actor],REST);
  assert.equal(names.size,16);assert.equal(finishers.size,4);
  console.log(`Player moves passed: 12 attacks, 4 unique finishers, ${runs} motion runs, ${renders} effect renders, cancellation, pose reset, compact bounds, and legacy weapons.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
