/** MIT screen-space study morph; source geometry retains its CC licenses and is never modified. */
import {BufferAttribute} from 'three';
import type {LoadedSystem,StudyTile} from './types';
const uniforms=new WeakMap<LoadedSystem,{value:number}>();
export function transitionAmount(from:number,to:number,elapsed:number,reduced=false){if(reduced)return to;const t=Math.max(0,Math.min(1,elapsed/180));return from+(to-from)*t*t*(3-2*t);}
export function tileTransform(tile:StudyTile,center:{x:number;y:number},extent:number,width:number,height:number,scroll:number){
 const sx=2*(tile.width-20)/(extent*width),sy=2*(tile.width-20)/(extent*height);
 return [2*(tile.x+tile.width/2)/width-1-center.x*sx,1-2*(tile.y-scroll+tile.width/2)/height-center.y*sy,sx,sy];
}
export function prepareStudyMorph(system:LoadedSystem,tiles:Map<string,StudyTile>,width:number,height:number,scroll:number,initiallyVisible:(name:string,id:string)=>boolean){
 const geometry=system.mesh.geometry,count=geometry.getAttribute('position').count;
 let target=geometry.getAttribute('studyTarget') as BufferAttribute,origin=geometry.getAttribute('studyOrigin') as BufferAttribute;
 if(!target){target=new BufferAttribute(new Float32Array(count*4),4);origin=new BufferAttribute(new Float32Array(count*4),4);geometry.setAttribute('studyTarget',target);geometry.setAttribute('studyOrigin',origin);}
 for(const part of system.parts){const tile=tiles.get(part.id);if(!tile)continue;const extent=Math.max(part.bounds.max.x-part.bounds.min.x,part.bounds.max.y-part.bounds.min.y,.0005)*1.06;const t=tileTransform(tile,part.center,extent,width,height,scroll),hidden=initiallyVisible(part.name,system.definition.id)?0:1;
  for(let v=part.vertexStart;v<part.vertexStart+part.vertexCount;v++){target.setXYZW(v,t[0],t[1],t[2],t[3]);origin.setXYZW(v,part.center.x,part.center.y,part.center.z,hidden);}
 }
 target.needsUpdate=true;origin.needsUpdate=true;
 if(!uniforms.has(system)){const uniform={value:0};uniforms.set(system,uniform);for(const material of system.mesh.material){const previous=material.onBeforeCompile,cache=material.customProgramCacheKey();material.onBeforeCompile=(shader,renderer)=>{previous.call(material,shader,renderer);shader.uniforms.studyAmount=uniform;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float studyAmount;\nattribute vec4 studyTarget;\nattribute vec4 studyOrigin;').replace('#include <project_vertex>',`#include <project_vertex>
 if(studyAmount > 0.0){
  vec4 startClip=gl_Position;
  if(studyOrigin.w > 0.5) startClip=projectionMatrix * modelViewMatrix * vec4(studyOrigin.xyz,1.0);
  vec3 destination=vec3(position.xy * studyTarget.zw + studyTarget.xy,-position.z * 0.01);
  gl_Position=vec4(mix(startClip.xyz/startClip.w,destination,studyAmount),1.0);
 }`);};material.customProgramCacheKey=()=>cache+'-study-morph-v1';material.needsUpdate=true;}}
}
export function setStudyMorph(system:LoadedSystem,amount:number){const uniform=uniforms.get(system);if(uniform)uniform.value=amount;system.mesh.frustumCulled=amount===0;}
