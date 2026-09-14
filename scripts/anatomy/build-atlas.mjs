/** MIT pipeline. Z-Anatomy derivatives CC-BY-SA-4.0; retained BodyParts3D CC-BY-4.0. Draco Apache-2.0. */
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {Document,NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import {MeshoptSimplifier} from 'meshoptimizer';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import {BufferGeometry,BufferAttribute} from 'three';
const base='/tmp/medica-z-anatomy/export',out='public/anatomy-final/atlas';
const input=JSON.parse(await fs.readFile(`${base}/inventory.json`,'utf8'));
const registration=JSON.parse(await fs.readFile('docs/anatomy-final/registration.json','utf8'));
const zCredit='Z-Anatomy - The libre 3D atlas of anatomy - CC-BY-SA 4.0';
const bpCredit='BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International';
const copyright=`${zCredit}; BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan; ${bpCredit}; Cranial Nerves and Foramina - by University of Dundee, CAHID - CC-BY 4.0`;
const defs=[['skeletal','Skeletal','#E9DFC9'],['muscular','Muscular','#D87578'],['nervous','Nervous','#EBCB74'],['circulatory','Circulatory','#EF7181'],['respiratory','Respiratory','#8EC7DC'],['digestive','Digestive','#DCA577'],['urinary','Urinary','#D4A66E'],['reproductive','Reproductive','#C3A4DF'],['endocrine','Endocrine','#E0AC78'],['lymphatic','Lymphatic / immune','#A3CC77'],['integumentary','Integumentary','#C9A68B']];
async function array(file,Type){const b=await fs.readFile(file);return new Type(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));}
const geometry=new Map();let structures=[];
for(const p of input.structures){
 const position=await array(`${base}/${p.id}.position.bin`,Float32Array),normal=await array(`${base}/${p.id}.normal.bin`,Float32Array),color=await array(`${base}/${p.id}.color.bin`,Float32Array),indices=await array(`${base}/${p.id}.indices.bin`,Uint32Array);
 const uv=p.hasUV?await array(`${base}/${p.id}.uv.bin`,Float32Array):null;
 geometry.set(p.id,{position,normal,color,indices,uv});structures.push({...p,fragmentCount:1});
}
// Substitute only commercially licensed BP3D kidneys and brain; preserve the original source as the master.
if(!registration.accepted)throw Error('BodyParts3D fallback registration did not pass the configured geometric threshold');
const old=JSON.parse(await fs.readFile('public/assets/draco/manifest.json','utf8'));
const fallback=old.systems.flatMap(s=>s.parts.filter(p=>s.id==='nervous' && !/nerve|ganglion/.test(p.name) || s.id==='urinary' && /kidney/.test(p.name)).map(p=>({...p,system:s.id})));
const grouped=new Map();for(const p of fallback){const key=p.conceptId;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(p);}
const parser=new OBJLoader();
for(const [conceptId,fragments] of grouped){
 const p=fragments[0],positions=[],indices=[];let offset=0;
 for(const f of fragments){
  const text=await fs.readFile(`/tmp/medica-anatomy-source/partof_BP3D_4.0_obj_99/${f.id}.obj`,'utf8');
  const object=parser.parse(text);
  object.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.getAttribute('position'),unique=new Map(),local=[];
   for(let i=0;i<a.count;i++){
    const raw=[a.getX(i)/1000,a.getZ(i)/1000,-a.getY(i)/1000];
    const v=[0,1,2].map(k=>registration.scale*raw.reduce((s,n,j)=>s+n*registration.rotation[j][k],0)+registration.translation[k]);
    const key=v.join(',');let index=unique.get(key);if(index===undefined){index=local.length/3;unique.set(key,index);local.push(...v);}indices.push(offset+index);
   }
   positions.push(...local);offset+=local.length/3;o.geometry.dispose();o.material.dispose();
  });
 }
 const position=new Float32Array(positions),idx=new Uint32Array(indices),g=new BufferGeometry().setAttribute('position',new BufferAttribute(position,3)).setIndex(new BufferAttribute(idx,1));g.computeVertexNormals();
 const color=new Float32Array(position.length);const rgb=p.system==='urinary'?[.57,.23,.18]:[.79,.57,.48];for(let i=0;i<color.length;i++)color[i]=rgb[i%3];
 const id='bp-'+conceptId,region=p.system==='urinary'?'Abdomen':'Head';
 structures.push({id,name:p.name,conceptId,source:'bodyparts3d',license:'CC-BY-4.0',primarySystem:p.system,systems:[p.system],region,parentId:p.system+':'+region,parentName:region,side:p.name.startsWith('left')?'left':p.name.startsWith('right')?'right':'midline',status:'available',reviewStatus:'pending-registration-review',fragmentCount:fragments.length,sourceMaterials:[],vertices:position.length/3,triangles:idx.length/3,hasUV:false});
 geometry.set(id,{position,indices:idx,normal:new Float32Array(g.getAttribute('normal').array),color,uv:null});g.dispose();
}
// Join mesh fragments sharing the same source, anatomical name, side and primary system.
const canonical=new Map(),joined=[];
for(const part of structures){
 const key=[part.source,part.primarySystem,part.side,part.name.toLowerCase()].join('|');const prior=canonical.get(key);
 if(!prior){canonical.set(key,part);joined.push(part);continue;}
 const a=geometry.get(prior.id),b=geometry.get(part.id),offset=a.position.length/3;
 const concat=(x,y)=>{const r=new Float32Array(x.length+y.length);r.set(x);r.set(y,x.length);return r;};
 const indices=new Uint32Array(a.indices.length+b.indices.length);indices.set(a.indices);for(let i=0;i<b.indices.length;i++)indices[a.indices.length+i]=b.indices[i]+offset;
 geometry.set(prior.id,{position:concat(a.position,b.position),normal:concat(a.normal,b.normal),color:concat(a.color,b.color),uv:a.uv&&b.uv?concat(a.uv,b.uv):null,indices});geometry.delete(part.id);
 prior.fragmentCount+=part.fragmentCount;prior.systems=[...new Set([...prior.systems,...part.systems])];prior.sourceMaterials=[...new Set([...prior.sourceMaterials,...part.sourceMaterials])];
}
structures=joined;
// No duplicated structure IDs or annotation meshes; all visible geometry has a named, licensed record.
if(new Set(structures.map(p=>p.id)).size!==structures.length)throw Error('Duplicate structure IDs');
const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
for(const g of geometry.values())for(let i=0;i<g.position.length;i++){min[i%3]=Math.min(min[i%3],g.position[i]);max[i%3]=Math.max(max[i%3],g.position[i]);}
const center=min.map((v,i)=>(v+max[i])/2);
for(const g of geometry.values())for(let i=0;i<g.position.length;i++)g.position[i]-=center[i%3];
const encoder=await draco.createEncoderModule();await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.encoder':encoder});
await fs.mkdir(out,{recursive:true});
const audit=[];
async function writeAsset(parts,key,detail=false){
 const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene(),material=doc.createMaterial().setRoughnessFactor(.63).setDoubleSided(true);
 doc.getRoot().getAsset().copyright=copyright;
 let originalTriangles=0,triangles=0,maxError=0;
 for(const part of parts){
  const original=geometry.get(part.id);let indices=original.indices;originalTriangles+=indices.length/3;
  // No simplification on detail files. Overview uses a fixed error cap, never a file-size loop.
  if(!detail && indices.length>1800){
   const error=part.primarySystem==='integumentary'?.0001:.0005;
   const ratio=part.primarySystem==='circulatory' || part.primarySystem==='nervous'?.2:.45;
   const target=Math.max(600,Math.floor(indices.length*ratio/3)*3);
   try{const result=MeshoptSimplifier.simplify(indices,original.position,3,target,error,['LockBorder']);indices=result[0];maxError=Math.max(maxError,result[1]);}catch{}
  }
  triangles+=indices.length/3;
  const remap=new Map(),p=[],n=[],c=[],u=[],idx=new Uint32Array(indices.length);
  for(let i=0;i<indices.length;i++){
   const old=indices[i];let next=remap.get(old);
   if(next===undefined){next=remap.size;remap.set(old,next);p.push(...original.position.subarray(old*3,old*3+3));n.push(...original.normal.subarray(old*3,old*3+3));c.push(...original.color.subarray(old*3,old*3+3));if(original.uv)u.push(...original.uv.subarray(old*2,old*2+2));}idx[i]=next;
  }
  const prim=doc.createPrimitive().setMaterial(material);
  for(const [semantic,values,type] of [['POSITION',p,'VEC3'],['NORMAL',n,'VEC3'],['COLOR_0',c,'VEC3'],...(u.length?[['TEXCOORD_0',u,'VEC2']]:[])])prim.setAttribute(semantic,doc.createAccessor().setType(type).setArray(new Float32Array(values)).setBuffer(buffer));
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buffer));scene.addChild(doc.createNode(part.id).setMesh(doc.createMesh().addPrimitive(prim)));
 }
 doc.createExtension(KHRDracoMeshCompression).setRequired(true).setEncoderOptions({method:KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,encodeSpeed:2,decodeSpeed:5,quantizationBits:{POSITION:detail?16:14,NORMAL:detail?12:10,COLOR:8,TEXCOORD:12},quantizationVolume:'mesh'});
 const bytes=await io.writeBinary(doc);await fs.writeFile(`${out}/${key}.glb`,bytes);
 const record={id:key,url:`/anatomy-final/atlas/${key}.glb`,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),originalTriangles,triangles,maxRelativeSimplificationError:maxError,positionBits:detail?16:14,normalBits:detail?12:10,detail,structures:parts.length};audit.push(record);console.log(key,(bytes.length/1e6).toFixed(2)+' MB',parts.length+' structures');return record;
}
const systems=[],details=[];
for(const [id,label,color] of defs){
 const parts=structures.filter(p=>p.primarySystem===id);if(!parts.length)throw Error('Empty system '+id);
 const regions=new Map();for(const p of parts){const key=id+'-'+p.region.toLowerCase().replace(/[^a-z0-9]+/g,'-');p.detailKey=key;if(!regions.has(key))regions.set(key,[]);regions.get(key).push(p);}
 const asset=await writeAsset(parts,id);systems.push({...asset,label,color,parts,memberIds:structures.filter(p=>p.systems.includes(id)).map(p=>p.id)});
 for(const [key,regional] of regions)details.push({...await writeAsset(regional,'detail-'+key,true),id:key,systemId:id,parts:regional});
}
const missing=['Inner-ear anatomy: noncommercial source excluded','Detailed brain white-matter tracts: inherited source rights not verified','Continuous spinal-cord exterior: not independently verified in the cleared export','Microscopic anatomy, organ interiors and physiology lessons: deferred','Female reproductive anatomy: outside this male-first release'];
const sources=[{id:'z-anatomy',license:'CC-BY-SA-4.0',url:'https://github.com/Z-Anatomy/Models-of-human-anatomy/tree/'+input.sourceRevision,attribution:zCredit},{id:'bodyparts3d',license:'CC-BY-4.0',url:'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html',attribution:bpCredit}];
for(const p of structures)if(p.primarySystem!=='nervous'&&['Central nervous system','Peripheral nervous system'].includes(p.parentName)){p.parentName=p.region;p.parentId=p.primarySystem+':'+p.region;}
const manifest={version:2,copyright,sources,bounds:{min:min.map((v,i)=>v-center[i]),max:max.map((v,i)=>v-center[i])},systems,structures,details,coverage:{url:'/anatomy-final/coverage.json',reviewStatus:'Anatomical review pending',missing}};
await fs.writeFile(`${out}/manifest.json`,JSON.stringify(compactManifest(manifest)));
await fs.writeFile('docs/anatomy-final/atlas-assets.json',JSON.stringify({copyright,assets:audit},null,2));
const coverage={copyright,sources,reviewStatus:'pending',missing,systems:systems.map(s=>({id:s.id,name:s.label,structures:s.memberIds.length,fragments:s.parts.reduce((n,p)=>n+p.fragmentCount,0),reviewed:0})),structures:structures.map(p=>({id:p.id,name:p.name,region:p.region,side:p.side,systems:p.systems,status:p.status,reviewStatus:p.reviewStatus,source:p.source,license:p.license})),excluded:input.excluded,materials:input.materials,registration};
await fs.writeFile('public/anatomy-final/coverage.json',JSON.stringify(coverage));
console.log('ATLAS READY',structures.length,'named structures');

function compactManifest(m){
 const fields=['id','name','conceptId','primarySystem','systems','region','parentId','parentName','side','source','license','status','reviewStatus','detailKey','fragmentCount'];
 return {...m,structures:m.structures.map(p=>Object.fromEntries(fields.filter(k=>p[k]!==undefined).map(k=>[k,p[k]]))),systems:m.systems.map(({parts,...s})=>({...s,partIds:parts.map(p=>p.id)})),details:m.details.map(({parts,...s})=>({...s,partIds:parts.map(p=>p.id)}))};
}
