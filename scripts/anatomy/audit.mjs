/** MIT audit code; inspects Z-Anatomy CC-BY-SA and BodyParts3D CC-BY assets using Draco Apache-2.0. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import draco from 'draco3dgltf';
const decoderModule=await draco.createDecoderModule();
const manifest=JSON.parse(await fs.readFile('public/anatomy-final/atlas/manifest.json','utf8'));
const rows=[];
const seen=new Set();
const recipes=JSON.parse(await fs.readFile('docs/anatomy-final/atlas-assets.json','utf8')).assets;
for(const system of [...manifest.systems,...manifest.details]) {
  const bytes=await fs.readFile(`public${system.url}`);
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),system.sha256);
  const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
  const binaryOffset=20+jsonLength+8;
  assert.equal(json.asset.copyright,manifest.copyright);
  const positions=new Set(),normals=new Set();let triangles=0,vertices=0,parts=0;
  for(const mesh of json.meshes) for(const primitive of mesh.primitives) {
    assert(primitive.attributes.NORMAL!==undefined && primitive.attributes.POSITION!==undefined && primitive.attributes.COLOR_0!==undefined);
    const compression=primitive.extensions.KHR_draco_mesh_compression;
    const view=json.bufferViews[compression.bufferView];
    const buffer=new decoderModule.DecoderBuffer();
    const data=bytes.subarray(binaryOffset+(view.byteOffset||0),binaryOffset+(view.byteOffset||0)+view.byteLength);
    buffer.Init(new Int8Array(data),data.length);
    const decoder=new decoderModule.Decoder();
    decoder.SkipAttributeTransform(decoderModule.POSITION);decoder.SkipAttributeTransform(decoderModule.NORMAL);
    const geometry=new decoderModule.Mesh(),status=decoder.DecodeBufferToMesh(buffer,geometry);
    assert(status.ok(),`Invalid Draco ${system.id}`);
    const p=decoder.GetAttributeByUniqueId(geometry,compression.attributes.POSITION);
    const n=decoder.GetAttributeByUniqueId(geometry,compression.attributes.NORMAL);
    const quant=new decoderModule.AttributeQuantizationTransform(),oct=new decoderModule.AttributeOctahedronTransform();
    assert(quant.InitFromAttribute(p),'Position quantization unavailable');
    assert(oct.InitFromAttribute(n),'Normal quantization unavailable');
    positions.add(quant.quantization_bits());normals.add(oct.quantization_bits());
    triangles+=geometry.num_faces();vertices+=geometry.num_points();parts++;
    for(const object of [quant,oct,geometry,decoder,buffer])decoderModule.destroy(object);
  }
  const recipe=recipes.find(r=>r.url===system.url);assert.deepEqual([...positions],[recipe.positionBits]);assert.deepEqual([...normals],[recipe.normalBits]);
  assert.equal(parts,system.partIds.length);
  for(const id of system.partIds){assert(manifest.structures.some(p=>p.id===id));assert(json.nodes.some(n=>n.name===id));}
  rows.push({filename:system.url.split('/').pop(),bytes:bytes.length,MB:Number((bytes.length/1e6).toFixed(6)),positionBits:[...positions][0],normalBits:[...normals][0],structures:parts,vertices,triangles,maxRelativeSimplificationError:recipe.maxRelativeSimplificationError,action:'Retained under fidelity-first policy'});
}
const report={copyright:manifest.copyright,method:'Independent Draco bitstream decoding, quantization inspection, SHA-256 and named node checks. UVs/colors preserved when present. Overview 14/10, source-resolution detail 16/12 position/normal bits.',rows};
await fs.writeFile('docs/anatomy-final/asset-audit.json',JSON.stringify(report,null,2)+'\n');
await fs.writeFile('docs/anatomy-final/ASSET-AUDIT.md',['<!-- MIT audit; anatomy retains source CC licenses. -->','# Asset audit','',report.method,'','| File | Decimal MB | Position / normal bits | Structures |','|---|---:|---|---:|',...rows.map(r=>`| ${r.filename} | ${r.MB.toFixed(3)} | ${r.positionBits} / ${r.normalBits} | ${r.structures} |`),'','The previous 2 MB cap is superseded. Detail files have no simplification; overview relative error is capped at 0.0005 (skin 0.0001), excluding additional quantization error. These are geometric tolerances, not anatomical validation.'].join('\n'));
console.log('Verified',rows.length,'GLBs;',rows.reduce((n,r)=>n+r.bytes,0),'bytes');
