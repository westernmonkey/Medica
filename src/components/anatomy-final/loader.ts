/** MIT code; BodyParts3D CC-BY-4.0 assets; Three loaders/utilities MIT; Draco codec Apache-2.0. */
import { BufferAttribute, BufferGeometry, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { anatomyMaterial } from './materials';
import type { LoadedSystem, PartRange, SystemDefinition, SystemStatus } from './types';

interface Job { definition: SystemDefinition; priority: number; promise: Promise<LoadedSystem>; resolve: (value: LoadedSystem)=>void; reject: (error: Error)=>void }
export class SystemLoader {
  private draco = new DRACOLoader().setDecoderPath('/anatomy-final/decoder/').setWorkerLimit(1);
  private gltf = new GLTFLoader().setDRACOLoader(this.draco);
  private jobs = new Map<string,Job>();
  private queue: Job[]=[];
  private running=false;
  private paused=false;
  private disposed=false;
  private abort=new AbortController();
  readonly loaded=new Map<string,LoadedSystem>();
  constructor(private onStatus: (id:string,status:SystemStatus)=>void) {}
  setPaused(value:boolean){this.paused=value;if(!value)void this.pump();}

  request(definition:SystemDefinition,priority=0):Promise<LoadedSystem> {
    if(this.disposed) return Promise.reject(new Error('Viewer closed'));
    const loaded=this.loaded.get(definition.id); if(loaded) return Promise.resolve(loaded);
    const existing=this.jobs.get(definition.id);
    if(existing) { existing.priority=Math.max(existing.priority,priority); return existing.promise; }
    let resolve!:Job['resolve'],reject!:Job['reject'];
    const promise=new Promise<LoadedSystem>((yes,no)=>{resolve=yes;reject=no;});
    const job={definition,priority,promise,resolve,reject};
    this.jobs.set(definition.id,job); this.queue.push(job);
    this.onStatus(definition.id,{state:'queued',progress:0});
    void this.pump(); return promise;
  }
  private async pump() {
    if(this.running || this.disposed || this.paused) return;
    this.queue.sort((a,b)=>b.priority-a.priority);
    const job=this.queue.shift(); if(!job) return;
    this.running=true;
    try {
      this.onStatus(job.definition.id,{state:'loading',progress:0});
      const response=await fetch(job.definition.url,{signal:this.abort.signal});
      if(!response.ok) throw Error(`Download failed (${response.status})`);
      const reader=response.body?.getReader(); const chunks:Uint8Array[]=[]; let received=0;
      if(!reader) throw Error('Streaming downloads are unavailable');
      while(true) {
        const {done,value}=await reader.read(); if(done) break;
        chunks.push(value); received+=value.byteLength;
        this.onStatus(job.definition.id,{state:'loading',progress:Math.min(.95,received/job.definition.bytes*.95)});
      }
      const data=new Uint8Array(received); let offset=0;
      for(const chunk of chunks) {data.set(chunk,offset);offset+=chunk.length;}
      const gltf=await this.gltf.parseAsync(data.buffer,'');
      const geometries:BufferGeometry[]=[],parts:PartRange[]=[];
      let vertexStart=0,indexStart=0;
      gltf.scene.updateMatrixWorld(true);
      try {
        gltf.scene.traverse(object=>{
          if(!(object instanceof Mesh)) return;
          const id=object.userData.partId || object.name;
          const info=job.definition.parts.find(p=>p.id===id);
          if(!info) throw Error(`Unrecognized anatomical part ${id}`);
          const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
          for(const attribute of Object.keys(geometry.attributes)) if(!['position','normal','color','uv'].includes(attribute)) geometry.deleteAttribute(attribute);
          if(!geometry.index) geometry.setIndex(new BufferAttribute(Uint32Array.from({length:geometry.getAttribute('position').count},(_,i)=>i),1));
          if(!geometry.getAttribute('normal')) geometry.computeVertexNormals();
          const count=geometry.getAttribute('position').count;
          if(!geometry.getAttribute('color'))geometry.setAttribute('color',new BufferAttribute(new Float32Array(count*3).fill(1),3));
          if(!geometry.getAttribute('uv'))geometry.setAttribute('uv',new BufferAttribute(new Float32Array(count*2),2));
          geometry.computeBoundingBox();
          const bounds=geometry.boundingBox!.clone(),center=bounds.getCenter(new Vector3());
          const vertexCount=geometry.getAttribute('position').count,indexCount=geometry.index!.count;
          parts.push({...info,vertexStart,vertexCount,indexStart,indexCount,center,bounds});
          vertexStart+=vertexCount;indexStart+=indexCount;geometries.push(geometry);
        });
        if(parts.length!==job.definition.parts.length) throw Error('Incomplete anatomical system');
        const merged=mergeGeometries(geometries,false);
        if(!merged) throw Error('Unable to merge anatomical geometry');
        merged.computeBoundingBox();merged.computeBoundingSphere();
        
        const material=anatomyMaterial(job.definition.parts[0]?.primarySystem||job.definition.id);
        merged.addGroup(0,merged.index!.count,0);
        const mesh=new Mesh(merged,[material]);mesh.name=job.definition.id;mesh.frustumCulled=true;
        const system={definition:job.definition,mesh,parts};
        if(this.disposed) {merged.dispose();material.dispose();throw Error('Viewer closed');}
        this.loaded.set(job.definition.id,system);
        this.onStatus(job.definition.id,{state:'ready',progress:1});job.resolve(system);
      } finally {
        geometries.forEach(g=>g.dispose());
        gltf.scene.traverse(object=>{if(object instanceof Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(m=>m.dispose());}});
      }
    } catch(error) {
      const message=error instanceof Error?error.message:'Unable to load system';
      if(!this.disposed) this.onStatus(job.definition.id,{state:'error',progress:0,error:message});
      job.reject(new Error(message));
    } finally {
      this.jobs.delete(job.definition.id);this.running=false;void this.pump();
    }
  }
  release(id:string){const system=this.loaded.get(id);if(system){system.mesh.removeFromParent();system.mesh.geometry.dispose();system.mesh.material.forEach(m=>m.dispose());this.loaded.delete(id);}}
  dispose() {
    this.disposed=true;this.abort.abort();this.draco.dispose();
    for(const job of this.queue) {job.reject(new Error('Viewer closed'));this.jobs.delete(job.definition.id);}
    this.queue=[];
    for(const system of this.loaded.values()) {system.mesh.geometry.dispose();system.mesh.material.forEach(m=>m.dispose());}
    this.loaded.clear();
  }
}
