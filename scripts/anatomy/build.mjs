/** MIT code; BodyParts3D CC-BY-4.0 assets; Three/glTF-Transform/meshoptimizer MIT; Draco Apache-2.0. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { BufferGeometry, BufferAttribute } from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import { MeshoptSimplifier } from 'meshoptimizer';

const source = process.argv[2] || '/tmp/medica-anatomy-source';
const output = 'public/assets/draco';
export const attribution = 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International';
const defs = [
  ['skeletal','Skeletal','#E9DFC9','FMA23881'], ['muscular','Muscular','#D87578','FMA5022'],
  ['nervous','Nervous','#EBCB74','FMA7157'], ['circulatory','Circulatory','#EF7181','FMA7161'],
  ['digestive','Digestive','#DCA577','FMA7152'], ['reproductive','Reproductive','#C3A4DF','FMA7160'],
  ['integumentary','Integumentary','#C9A68B','FMA72979'], ['respiratory','Respiratory','#8EC7DC','FMA7158'],
  ['urinary','Urinary','#D4A66E','FMA7159'],
];
const packages = ['@gltf-transform/core','@gltf-transform/extensions','property-graph','ktx-parse','draco3dgltf','meshoptimizer','three'];
const licenseAudit = [];
for (const name of packages) {
  const p = JSON.parse(await fs.readFile(`node_modules/${name}/package.json`));
  if (!['MIT','Apache-2.0','ISC','BSD-2-Clause','BSD-3-Clause','OFL-1.1'].includes(p.license)) throw Error(`Unapproved license: ${name} ${p.license}`);
  for (const dependency of Object.keys(p.dependencies || {})) if (!packages.includes(dependency)) throw Error(`Unaudited dependency: ${dependency}`);
  licenseAudit.push({name,version:p.version,license:p.license});
}
for (const tree of ['partof','isa']) {
  try { await fs.access(path.join(source, `${tree}_BP3D_4.0_obj_99`)); }
  catch { execFileSync('unzip',['-q','-o',path.join(source,`${tree}_BP3D_4.0_obj_99.zip`),'-d',source]); }
}
const mappings = {};
for (const tree of ['partof','isa']) {
  const rows=(await fs.readFile(path.join(source,`${tree}_element_parts.txt`),'utf8')).trim().split(/\r?\n/).slice(1).map(l=>l.split('\t'));
  mappings[tree] = new Map();
  for (const [id,,element] of rows) {
    if (!mappings[tree].has(id)) mappings[tree].set(id,new Set());
    mappings[tree].get(id).add(element);
  }
}
// Structures shared by organ and vascular hierarchies have one runtime owner.
const ownership = ['circulatory','nervous','urinary','reproductive','respiratory','digestive','skeletal','muscular','integumentary'];
const used = new Set(), members = new Map();
for (const system of ownership) {
  const def = defs.find(d=>d[0]===system), tree=system==='muscular'?'isa':'partof';
  const candidates=new Set(system==='skeletal'?[]:mappings[tree].get(def[3]) || []);
  // The part_of genital root contains only the prostate in release 4.0.
  // Supplement it with explicitly named official ISA organs, never guessed meshes.
  const supplemental={skeletal:['FMA5018','FMA55107'],circulatory:['FMA50720','FMA50723','FMA3710'],nervous:['FMA65132','FMA53549','FMA53550'],reproductive:['FMA7210','FMA18247','FMA18255','FMA19386','FMA19617','FMA19618','FMA19234'],urinary:['FMA19667']}[system] || [];
  for(const concept of supplemental) for(const element of mappings.isa.get(concept)||[])candidates.add(element);
  const elements = [...candidates].filter(e=>!used.has(e)).sort();
  if (!elements.length) throw Error(`Empty system ${system}`);
  elements.forEach(e=>used.add(e)); members.set(system,elements);
}
const encoder = await draco.createEncoderModule();
const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.encoder':encoder});
await MeshoptSimplifier.ready;
const parser = new OBJLoader();
const officialNames = new Map();
for (const file of ['isa_parts_list_e.txt','parts.tsv']) {
  for (const row of (await fs.readFile(path.join(source,file),'utf8')).trim().split(/\r?\n/).slice(1)) {
    const [id,,name]=row.split('\t'); officialNames.set(id,name);
  }
}
const allParts = [];
for (const [system] of defs) {
  for (const element of members.get(system)) {
    let text;
    for (const tree of ['partof','isa']) {
      try { text=await fs.readFile(path.join(source,`${tree}_BP3D_4.0_obj_99`,`${element}.obj`),'utf8'); break; } catch {}
    }
    if (!text) throw Error(`Missing ${element}`);
    const headerId=text.match(/^# Concept ID[ \t]*:[ \t]*(FMA\d+)/m)?.[1];
    const candidates=Object.values(mappings).flatMap(map=>[...map].filter(([,elements])=>elements.has(element))).sort((a,b)=>a[1].size-b[1].size || a[0].localeCompare(b[0]));
    const id=officialNames.has(headerId)?headerId:candidates.find(([candidate])=>officialNames.has(candidate))?.[0];
    const name=officialNames.get(id);
    if (!id || !name) throw Error(`Missing official nomenclature ${element}`);
    const object=parser.parse(text), vertices=[], indices=[], unique=new Map();
    object.traverse(mesh=>{
      if (!mesh.isMesh) return;
      const attr=mesh.geometry.getAttribute('position');
      for (let i=0;i<attr.count;i++) {
        // BP3D millimeters, Z-up -> meters, Y-up; anterior faces +Z.
        const xyz=[attr.getX(i)/1000,attr.getZ(i)/1000,-attr.getY(i)/1000];
        const key=xyz.join(','); let index=unique.get(key);
        if(index===undefined) { index=vertices.length/3; unique.set(key,index); vertices.push(...xyz); }
        indices.push(index);
      }
      mesh.geometry.dispose(); mesh.material.dispose();
    });
    allParts.push({system,element,id,name,positions:new Float32Array(vertices),indices:new Uint32Array(indices)});
  }
}
const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
for (const p of allParts) for(let i=0;i<p.positions.length;i++) {const a=i%3;min[a]=Math.min(min[a],p.positions[i]);max[a]=Math.max(max[a],p.positions[i]);}
const center=min.map((v,i)=>(v+max[i])/2);
for (const p of allParts) for(let i=0;i<p.positions.length;i++) p.positions[i]-=center[i%3];
await fs.mkdir(output,{recursive:true});
const manifest={copyright:attribution,license:'CC-BY-4.0',source:'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/',modifications:'OBJ converted to indexed glTF; coordinate normalization; smooth normals; Draco compression; bounded simplification where indicated.',bodyCenter:[0,0,0],bounds:{min:min.map((v,i)=>v-center[i]),max:max.map((v,i)=>v-center[i])},systems:[]};
for (const [system,label,color] of defs) {
  const parts=allParts.filter(p=>p.system===system); let bytes, initialBytes, pass=0, simplificationError=0;
  while(true) {
    const doc=new Document(), buffer=doc.createBuffer(), scene=doc.createScene();
    doc.getRoot().getAsset().copyright=attribution;
    const material=doc.createMaterial().setBaseColorFactor([1,1,1,1]).setRoughnessFactor(.65).setMetallicFactor(0);
    for(const p of parts) {
      // Discard vertices no longer referenced after simplification, before Draco encoding.
      const remap=new Map(),compactPositions=[],compactIndices=new Uint32Array(p.indices.length);
      for(let i=0;i<p.indices.length;i++) {
        const old=p.indices[i];let next=remap.get(old);
        if(next===undefined){next=remap.size;remap.set(old,next);compactPositions.push(p.positions[old*3],p.positions[old*3+1],p.positions[old*3+2]);}
        compactIndices[i]=next;
      }
      const positions=new Float32Array(compactPositions);
      const geometry=new BufferGeometry().setAttribute('position',new BufferAttribute(positions,3)).setIndex(new BufferAttribute(compactIndices,1));
      geometry.computeVertexNormals();
      const primitive=doc.createPrimitive().setMaterial(material)
        .setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer))
        .setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(geometry.getAttribute('normal').array).setBuffer(buffer))
        .setIndices(doc.createAccessor().setType('SCALAR').setArray(compactIndices).setBuffer(buffer));
      scene.addChild(doc.createNode(p.element).setMesh(doc.createMesh().addPrimitive(primitive)));
      geometry.dispose();
    }
    doc.createExtension(KHRDracoMeshCompression).setRequired(true).setEncoderOptions({method:KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,encodeSpeed:0,decodeSpeed:5,quantizationBits:{POSITION:10,NORMAL:8,TEXCOORD:8},quantizationVolume:'mesh'});
    bytes=await io.writeBinary(doc); initialBytes ??= bytes.length;
    if(bytes.length<2_000_000 || pass===8) break;
    pass++;
    // Simplify from the original each time: cumulative geometric error is never hidden.
    for (const p of parts) {
      p.originalIndices ??= p.indices;
      const target=Math.max(12,Math.floor(p.originalIndices.length*Math.pow(.7,pass)/3)*3);
      const [indices,error]=MeshoptSimplifier.simplify(p.originalIndices,p.positions,3,target,.001,['LockBorder']);
      simplificationError=Math.max(simplificationError,error); p.indices=indices;
    }
  }
  await fs.writeFile(`${output}/${system}.glb`,bytes);
  const record={id:system,label,color,url:`/assets/draco/${system}.glb`,bytes:bytes.length,initialBytes,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),simplificationPasses:pass,maxRelativeSimplificationError:simplificationError,parts:parts.map(p=>({id:p.element,conceptId:p.id,name:p.name}))};
  manifest.systems.push(record);
  console.log(`${system}: ${parts.length} parts, ${(bytes.length/1e6).toFixed(3)} MB${bytes.length>=2e6?' UNRESOLVED SIZE':''}`);
}
await fs.writeFile(`${output}/manifest.json`,JSON.stringify(manifest));
await fs.writeFile('docs/anatomy-final/tooling-licenses.json',JSON.stringify({copyright:'MIT; dependency licenses as listed',packages:licenseAudit},null,2)+'\n');
console.log('Built',allParts.length,'unique parts.');
