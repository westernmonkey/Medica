/** MIT downloader; official BodyParts3D inputs CC-BY-4.0 under the archive's 2025 updated terms. */
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const directory=process.argv[2]||'/tmp/medica-anatomy-source';
const provenance=JSON.parse(await fs.readFile('docs/anatomy-final/source-provenance.json','utf8'));
await fs.mkdir(directory,{recursive:true});
for(const source of provenance.sources){
  const file=path.join(directory,source.file);
  const response=await fetch(source.url);if(!response.ok)throw Error(`${source.file}: HTTP ${response.status}`);
  await pipeline(response.body,createWriteStream(file));
  const hash=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
  if(hash!==source.sha256)throw Error(`${source.file} changed upstream. Review source and license before rebuilding.`);
  console.log('Verified',source.file);
}
