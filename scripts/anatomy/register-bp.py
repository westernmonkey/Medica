# MIT registration code; BodyParts3D CC-BY-4.0 and Z-Anatomy CC-BY-SA-4.0 anatomy.
import json,numpy as np
from pathlib import Path
z=json.loads(Path('/tmp/medica-z-anatomy/export/inventory.json').read_text())['structures']
bp=json.loads(Path('public/assets/draco/manifest.json').read_text())
old={p['name'].lower():p for s in bp['systems'] for p in s['parts']}
names=['left femur','right femur','left humerus','right humerus','mandible','frontal bone','sacrum','left clavicle','right clavicle']
src=[];dst=[];matched=[]
for name in names:
 a=old.get(name);b=next((s for s in z if s['name'].lower()==name),None)
 if not a or not b:continue
 f=Path('/tmp/medica-anatomy-source/partof_BP3D_4.0_obj_99')/(a['id']+'.obj')
 if not f.exists():f=Path('/tmp/medica-anatomy-source/isa_BP3D_4.0_obj_99')/(a['id']+'.obj')
 v=np.array([[float(n) for n in line.split()[1:4]] for line in f.read_text().splitlines() if line.startswith('v ')])/1000
 v=v[:,[0,2,1]];v[:,2]*=-1
 src.append((v.min(0)+v.max(0))/2);dst.append((np.array(b['bounds']['min'])+b['bounds']['max'])/2);matched.append(name)
src=np.array(src);dst=np.array(dst);a=src-src.mean(0);b=dst-dst.mean(0)
u,s,vt=np.linalg.svd(a.T@b);R=u@vt
if np.linalg.det(R)<0:u[:,-1]*=-1;R=u@vt
scale=np.trace((a@R).T@b)/np.sum(a*a);t=dst.mean(0)-scale*src.mean(0)@R
res=np.linalg.norm(scale*src@R+t-dst,axis=1)
r={'copyright':'Registration measurements: MIT; input geometry under source licenses','method':'Global least-squares rigid rotation + uniform scale + translation fitted to bounding-box centers of shared bones; no per-organ warping. This is geometric validation, not anatomical review.','scale':float(scale),'rotation':R.tolist(),'translation':t.tolist(),'landmarks':[{'name':n,'residualMM':float(e*1000)} for n,e in zip(matched,res)],'rmsMM':float(np.sqrt(np.mean(res**2))*1000),'maxMM':float(res.max()*1000),'accepted':bool(res.max()<.015)}
Path('docs/anatomy-final/registration.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
