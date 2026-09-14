/** MIT fetcher. Upstream archive has mixed CC licenses; never distribute it as a cleared bundle. */
import fs from 'node:fs/promises';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const provenance=JSON.parse(await fs.readFile('docs/anatomy-final/z-source.json','utf8')),dir='/tmp/medica-z-anatomy';await fs.mkdir(dir,{recursive:true});
const url=`https://raw.githubusercontent.com/Z-Anatomy/Models-of-human-anatomy/${provenance.revision}/Z-Anatomy.zip`;
const res=await fetch(url);if(!res.ok)throw Error(`Source download ${res.status}`);const data=Buffer.from(await res.arrayBuffer());if(crypto.createHash('sha256').update(data).digest('hex')!==provenance.files.find(f=>f.file==='source.zip').sha256)throw Error('Source hash mismatch');await fs.writeFile(dir+'/source.zip',data);
execFileSync('unzip',['-o',dir+'/source.zip','Z-Anatomy/Startup.blend','-d',dir]);const blend=await fs.readFile(dir+'/Z-Anatomy/Startup.blend');if(crypto.createHash('sha256').update(blend).digest('hex')!==provenance.files.find(f=>f.file==='Startup.blend').sha256)throw Error('Blend hash mismatch');
await fs.copyFile('public/anatomy-final/licenses/Z-Anatomy-inherited-notices.txt','/tmp/z-anatomy-license.txt');console.log('Pinned source verified; run Blender export with --disable-autoexec.');
