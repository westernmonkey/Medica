/* SPDX-License-Identifier: MIT. Fetches licensed HuBMAP/HRA CC-BY-4.0 assets. */
import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {assets} from './source-lock.mjs';
const dir=process.env.MEDICA_ORGAN_SOURCE_DIR||'/tmp/medica-organ-sources';await fs.mkdir(dir,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function read(url){const response=await fetch(url,{signal:AbortSignal.timeout(40000)});if(!response.ok)throw Error(`${response.status} ${url}`);return Buffer.from(await response.arrayBuffer());}
for(const a of assets){const file=path.join(dir,a.id+'.'+a.kind);let data;try{data=await fs.readFile(file);}catch{data=await read(a.url);}
 if(hash(data)!==a.sha256)throw Error('Pinned source digest changed: '+a.id);await fs.writeFile(file,data);
 const meta=await read(a.metadataUrl);if(!/license:[\s\S]*?CC BY 4\.0/.test(meta.toString()))throw Error('Unconfirmed asset license '+a.id);
 await fs.writeFile(path.join(dir,a.id+'-meta.yaml'),meta);
 await fs.writeFile(path.join(dir,a.id+'-crosswalk.csv'),await read(a.crosswalkUrl));
 console.log(a.id,data.length,hash(data));}
