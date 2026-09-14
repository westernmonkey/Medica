# MIT report generator. Anatomy data retain the source CC licenses listed below.
import json,hashlib,html,re
from pathlib import Path
root=Path('public/anatomy-final');m=json.loads((root/'atlas/manifest.json').read_text());a=json.loads(Path('docs/anatomy-final/atlas-assets.json').read_text())
revision='b9c9f98066e1e786814603b047c5bd3638c2a864';url='https://github.com/Z-Anatomy/Models-of-human-anatomy/tree/'+revision
licensefile=Path('/tmp/z-anatomy-license.txt');(root/'licenses/Z-Anatomy-inherited-notices.txt').write_bytes(licensefile.read_bytes())
source={'revision':revision,'url':url,'license':'CC-BY-SA-4.0 with inherited notices and explicit exclusions','files':[],'excludedRegions':['Z-Anatomy kidney (CC-BY-NC)','Z-Anatomy internal ear (CC-BY-NC-SA)','Brain and white-matter regions with unclear inherited rights'],'imagesImported':[],'modifications':['Evaluated geometry and curves; shared source transforms applied','Annotations and excluded regions removed','Source material boundaries and UVs preserved; original procedural shaders replaced by tissue palette','Overview simplified with boundary locking; regional detail unsimplified','Draco compression; anatomical review pending']}
for file in ['/tmp/medica-z-anatomy/source.zip','/tmp/medica-z-anatomy/Z-Anatomy/Startup.blend','/tmp/z-anatomy-license.txt']:
 p=Path(file);b=p.read_bytes();source['files'].append({'file':p.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
Path('docs/anatomy-final/z-source.json').write_text(json.dumps(source,indent=2)+'\n');(root/'provenance.json').write_text(json.dumps({'zAnatomy':source,'bodyParts3D':json.loads(Path('docs/anatomy-final/source-provenance.json').read_text()),'registration':json.loads(Path('docs/anatomy-final/registration.json').read_text())},indent=2))
credits='''Medica anatomy atlas — notices and modifications
Viewer code: MIT. See licenses/Medica-MIT.txt. No source app code or definitions imported.

Z-Anatomy - The libre 3D atlas of anatomy - CC-BY-SA 4.0
BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan
Cranial Nerves and Foramina - by University of Dundee, CAHID - CC-BY 4.0
Source: '''+url+'''
Source author notices: licenses/Z-Anatomy-inherited-notices.txt
Authors credited by source: Kousaku OKUBO (original BodyParts3D), Gauthier KERVYN (design, 3D, anatomy), and source contributors named in the inherited notice.
Adapted Z-Anatomy geometry and metadata: CC-BY-SA 4.0. Inherited attribution retained.
https://creativecommons.org/licenses/by-sa/4.0/
https://creativecommons.org/licenses/by-sa/2.1/jp/
https://creativecommons.org/licenses/by/4.0/

Direct BodyParts3D replacement brain and kidneys:
BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International
https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
https://creativecommons.org/licenses/by/4.0/
These components retain CC-BY 4.0; combined downloadable GLBs containing adapted Z-Anatomy are offered under CC-BY-SA 4.0 with all source notices retained.

Modifications: source transforms evaluated; annotations and restricted regions excluded; shared male coordinate frame; replacement brain/kidney global landmark registration; mesh fragments grouped; overview boundary-locked simplification; source-resolution regional detail; Draco encoding; tissue recoloring. UVs retained when present. No source raster texture, Wikipedia definition, add-on, or app script imported. Decorative muscle shader is not validated fibre orientation.

Excluded: inner ear (Dundee, CC-BY-NC-SA 4.0), kidney (Lissie Cowley, CC-BY-NC 4.0), unclear Brainder/white-matter regions. Upstream source archive contains excluded assets and is NOT a cleared commercial asset bundle. Our downloads contain only the selected export. No assertion of complete anatomy or clinical/commercial validation.

Runtime: Three.js, OrbitControls, GLTFLoader, DRACOLoader wrapper, BufferGeometryUtils, RoomEnvironment — MIT (licenses/Three-LICENSE.txt).
Draco codec — Apache-2.0 (licenses/Draco-LICENSE.txt).
React / ReactDOM — MIT (licenses/React-LICENSE.txt).
Next.js — MIT (licenses/Next-LICENSE.txt).
Site icons Lucide — ISC (licenses/Lucide-LICENSE.txt). Poppins — OFL (licenses/Poppins-OFL.txt).
Build tooling: glTF-Transform, meshoptimizer — MIT; Draco Apache-2.0. Complete installed-tool notices: licenses/Tooling-LICENSES.txt.
Blender 5.1.1 — GPL offline authoring tool, not distributed as part of this app.
Tests: Playwright — Apache-2.0; TypeScript — Apache-2.0.
All adapted GLBs, canonical metadata, coverage and provenance are downloadable at downloads.html. No access restriction or DRM applied.
'''
(root/'credits.txt').write_text(credits)
links=''.join('<li><a download href="'+s['url']+'">'+html.escape(s['url'].split('/')[-1])+'</a> — '+str(round(s['bytes']/1e6,3))+' MB</li>' for s in a['assets'])
(root/'downloads.html').write_text('''<!-- MIT page. Linked anatomy models retain CC-BY-SA 4.0 / CC-BY 4.0 and inherited notices. -->
<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Medica anatomy — open asset downloads</title><style>body{font:16px system-ui;max-width:900px;margin:32px auto;padding:0 24px;line-height:1.6;background:#0b1016;color:#e0e8ee}a{color:#68e2bc}li{margin:8px 0}</style><h1>Anatomy asset downloads</h1><p>Adapted Z-Anatomy assets: <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC-BY-SA 4.0</a>. Direct BodyParts3D components retain CC-BY 4.0. Preserve all inherited notices and ShareAlike terms when redistributing adaptations.</p><p>''' +html.escape(m['copyright'])+'''</p><p>Converted, registered, recolored, simplified and compressed. No claim of anatomical completeness or clinical review.</p><p><a href="credits.txt">Full credits and modifications</a> · <a href="provenance.json">Pinned sources and hashes</a> · <a href="atlas/manifest.json">Structure manifest</a> · <a href="coverage.json">Coverage and exclusions</a></p><h2>Overview and source-resolution regional models</h2><ul>'''+links+'''</ul></html>''')
# A factual gross-anatomy checklist: name presence is evidence of availability, not expert validation.
checks={'skeletal':['mandible','frontal bone','parietal','occipital','maxilla','tooth','vertebra','rib','femur','humerus','ligament','cartilage'], 'muscular':['deltoid','pectoralis major','biceps brachii','quadriceps','gluteus maximus','gastrocnemius','diaphragm'], 'nervous':['cerebr','cerebell','spinal cord','median nerve','ulnar nerve','sciatic nerve','vagus'], 'respiratory':['lung','lobe','trachea','bronch'], 'circulatory':['heart','aorta','vena cava','femoral artery','jugular'], 'digestive':['tongue','esophagus','stomach','liver','pancreas','intestin','rectum'], 'urinary':['kidney','ureter','bladder','urethra'], 'reproductive':['prostate','testis','ductus deferens','seminal'], 'endocrine':['thyroid','parathyroid','adrenal','pituitary','pancreas'], 'lymphatic':['spleen','thymus','lymph node','thoracic duct'], 'integumentary':['skin','hair','nail']}
coverage=json.loads((root/'coverage.json').read_text());rows=[]
for system,terms in checks.items():
 for term in terms:
  found=[p for p in m['structures'] if system in p['systems'] and term in p['name'].lower()];rows.append({'system':system,'structureQuery':term,'status':'available' if found else 'missing','evidence':'Name matching only; expert anatomical review pending','structures':[{'id':p['id'],'name':p['name'],'side':p['side'],'region':p['region']} for p in found]})
coverage['checklist']=rows;coverage['checklistMethod']='Gross-anatomy screening by source names, not proof of completeness. Missing means no matched named model; synonyms may require manual review. All structure and registration reviews pending.'
(root/'coverage.json').write_text(json.dumps(coverage,separators=(',',':')))
Path('docs/anatomy-final/COVERAGE.md').write_text('<!-- MIT checklist; source names retain CC licenses. -->\n# Gross-anatomy coverage screening\n\n11 system categories represented; not a complete or reviewed atlas. Exact named structure, side and region evidence is in public/anatomy-final/coverage.json. No structure has been signed off by an anatomist. Name matches are only screening evidence; absent matches require synonym/manual review.\n\n| System | Check | Status | Named matches |\n|---|---|---|---:|\n'+'\n'.join('| '+r['system']+' | '+r['structureQuery']+' | '+r['status']+' | '+str(len(r['structures']))+' |' for r in rows)+'\n\nKnown gaps: '+ '; '.join(m['coverage']['missing'])+'\n\nFactual references: OpenStax Anatomy and Physiology 2e (https://openstax.org/details/books/anatomy-and-physiology-2e), BodyParts3D construction paper (https://pubmed.ncbi.nlm.nih.gov/18835852/). No book artwork, text, or texture is copied.\n')
print('Reports and downloads created')
