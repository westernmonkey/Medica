/* SPDX-License-Identifier: MIT. Audits HRA CC-BY-4.0 assets and Medica notices. */
import fs from 'node:fs/promises';import crypto from 'node:crypto';import {assets,crosswalkAliases} from './source-lock.mjs';
const root='public/anatomy-final/lessons';const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const provenance=JSON.parse(await fs.readFile(root+'/provenance.json'));
if(provenance.assets.length!==8||provenance.revision.length!==40)throw Error('Incomplete provenance');
for(const a of assets){const p=provenance.assets.find(x=>x.id===a.id);if(!p||p.sourceSha256!==a.sha256||p.license!=='CC-BY-4.0')throw Error('Source mismatch '+a.id);const data=await fs.readFile('public'+p.url);if(sha(data)!==p.sha256||data.length!==p.bytes)throw Error('Runtime mismatch '+a.id);if(a.kind==='glb'){const n=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+n));if(!/HuBMAP Human Reference Atlas/.test(json.asset.copyright))throw Error('GLB missing copyright '+a.id);}}
for(const file of ['kidney/left.json','kidney/right.json','prostate/manifest.json']){const m=JSON.parse(await fs.readFile(root+'/'+file));if(m.version!==1||!m.structures.length||!m.diagrams.length)throw Error('Incomplete lesson '+file);for(const s of m.structures)if(!m.modelAssets.find(a=>a.id===s.assetId)||s.reviewState!=='pending')throw Error('Unmapped/unreviewed source node '+s.id);}
const acinus=JSON.parse(await fs.readFile(root+'/prostate/manifest.json'));const micro=acinus.diagrams.find(x=>x.id==='prostate-acinus');if(!micro||micro.groups.flatMap(g=>g.elementIds).length!==502||Object.keys(crosswalkAliases).length!==3)throw Error('Prostate crosswalk incomplete');
const credits=await fs.readFile(root+'/credits.txt','utf8');for(const a of assets)if(!credits.includes(a.doi)||!credits.includes(a.sha256))throw Error('Missing citation '+a.id);
console.log('Organ source audit passed: 8 licensed assets, 3 lessons, 502 acinus mappings');
