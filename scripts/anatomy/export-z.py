# MIT exporter; Z-Anatomy geometry CC-BY-SA-4.0. Blender is an offline GPL authoring tool.
# Embedded source scripts are never executed. See z-source.json for excluded third-party regions.
import bpy, json, re, hashlib, array
from pathlib import Path
from mathutils import Vector
OUT=Path('/tmp/medica-z-anatomy/export');OUT.mkdir(exist_ok=True)
ROOTS={'skeletal':['1: Skeletal system','3: Joints'], 'muscular':['4: Muscular system'], 'circulatory':['5: Cardiovascular system'], 'lymphatic':['6: Lymphoid organs','Lymphoid system'], 'nervous':['7: Nervous system & Sense organs'], 'digestive':['Digestive system'], 'respiratory':['Respiratory system'], 'urinary':['Urinary system'], 'reproductive':["Genital systems'"], 'endocrine':['Endocrine glands'], 'integumentary':['9: Regions of human body']}
parents={}
for c in bpy.data.collections:
 for child in c.children:parents.setdefault(child.name,[]).append(c.name)
def ancestors(names):
 result=set(names); todo=list(names)
 while todo:
  for p in parents.get(todo.pop(),[]):
   if p not in result:result.add(p);todo.append(p)
 return result
# Entire potentially affected regions are quarantined, not merely models bearing recognizable authors' names.
blocked_roots=['Brain','Internal ear','Kidney']
blocked_names=set()
for c in bpy.data.collections:
 if any(root in ancestors([c.name]) for root in blocked_roots):blocked_names.update(o.name for o in c.objects)
blocked_bases={re.sub(r'\.[lr](?:\.\d+)?$','',name) for name in blocked_names}
PALETTE={'bone':[.86,.80,.65],'cartilage':[.69,.80,.81],'muscle':[.62,.16,.18],'tendon':[.91,.86,.72],'artery':[.73,.075,.09],'vein':[.12,.32,.58],'nerve':[.94,.71,.27],'organ':[.66,.34,.27],'lung':[.77,.45,.49],'skin':[.73,.49,.34],'lymph':[.48,.62,.28],'gland':[.74,.46,.29]}
records=[];excluded=[];dg=bpy.context.evaluated_depsgraph_get()
for o in sorted(bpy.data.objects,key=lambda x:x.name):
 if o.type not in ['MESH','CURVE','SURFACE']:continue
 name=o.name
 if re.search(r'\.(?:g|j|i|ol|or|il|ir)$',name) or name.startswith('?') or 'profile' in name.lower():continue
 if o.type=='MESH' and len(o.data.polygons)==0:continue
 direct=[c.name for c in o.users_collection];allcollections=ancestors(direct)
 memberships=[s for s,roots in ROOTS.items() if any(r in allcollections for r in roots)]
 if not memberships:continue
 if '2: Muscular insertions' in direct:continue
 n=name.lower()
 if re.sub(r'\.[lr](?:\.\d+)?$','',name) in blocked_bases or ('7: Nervous system & Sense organs' in direct and 'Head' in allcollections and 'Peripheral nervous system' not in allcollections and 'Nerves' not in allcollections) or any(t in n for t in ['kidney','renal pyramid','cochle','labyrinth','semicircular','vestibul','organ of corti','white matter','medulla oblongata','pyramid of medulla','cerebell','thalam','cerebr','cortical','hypothalam','fornix','hippocamp','corpus callosum']):
  excluded.append({'name':name,'reason':'NC or insufficiently identified inherited source: kidney, inner ear or brain/white matter'});continue
 if 'female' in n or any(t in n for t in ['uterus','ovary','vagina','clitoris']):continue
 # Prefer anatomical collections over annotation/innervation cross-links.
 if '1: Skeletal system' in direct or '3: Joints' in direct:primary='skeletal'
 elif '9: Regions of human body' in direct:primary='integumentary'
 elif '4: Muscular system' in direct:primary='muscular'
 elif '6: Lymphoid organs' in direct:primary='lymphatic'
 elif '5: Cardiovascular system' in direct:primary='circulatory'
 elif '7: Nervous system & Sense organs' in direct:primary='nervous'
 else:primary=next((s for s in ['endocrine','urinary','reproductive','respiratory','digestive','lymphatic'] if s in memberships),None)
 if primary is None:continue
 memberships=[primary]
 if name=='Mandible' or 'tooth' in n or 'teeth' in n:memberships+=['digestive']
 if 'pancreas' in n:memberships+=['endocrine','digestive']
 if 'diaphragm' in n:memberships+=['respiratory']
 if 'laryngeal cartilage' in n or 'thyroid cartilage' in n or 'cricoid cartilage' in n:memberships+=['respiratory']
 # Annotations and insertion patches may be actual triangles; omit all glyph materials.
 if any(m and m.name.lower() in ['text','text.001'] for m in o.data.materials):continue
 side='left' if re.search(r'\.l(?:\.\d+)?$',name) else 'right' if re.search(r'\.r(?:\.\d+)?$',name) else 'midline'
 label=re.sub(r'\.[lr](?:\.\d+)?$','',name).strip(" '")
 label=(side+' '+label[0].lower()+label[1:]) if side!='midline' else label
 ident='za-'+hashlib.sha256(name.encode()).hexdigest()[:16]
 region=next((r for r in ['Head','Neck','Left upper limb','Right upper limb','Left lower limb','Right lower limb','Pelvis','Abdomen','Thorax','Trunk'] if r in allcollections),'Whole body')
 subtype=next((r for r in ['Bones of upper limb','Bones of lower limb','Cranium','Vertebral column','Muscles of head','Muscles of neck','Muscles of upper limb','Muscles of lower limb','Central nervous system','Peripheral nervous system','Lungs','Bronchi','Larynx','Heart','Systemic arteries','Systemic veins','Endocrine glands'] if r in allcollections),region)
 evaluated=o.evaluated_get(dg)
 try:mesh=evaluated.to_mesh(preserve_all_data_layers=True,depsgraph=dg)
 except Exception as err:excluded.append({'name':name,'reason':'Evaluation failed: '+str(err)});continue
 if not mesh or not mesh.polygons:evaluated.to_mesh_clear();continue
 mesh.calc_loop_triangles();positions=array.array('f');normals=array.array('f');colors=array.array('f');indices=array.array('I');uv=array.array('f');remap={};matnames=set()
 matrix=o.matrix_world;normalmatrix=matrix.to_3x3().inverted().transposed();activeuv=mesh.uv_layers.active
 tissue={'skeletal':'bone','muscular':'muscle','circulatory':'artery','nervous':'nerve','respiratory':'lung','integumentary':'skin','lymphatic':'lymph','endocrine':'gland'}.get(primary,'organ')
 for tri in mesh.loop_triangles:
  material=mesh.materials[tri.material_index] if tri.material_index<len(mesh.materials) else None
  matname=material.name if material else '';matnames.add(matname);m=matname.lower()
  kind=tissue
  if any(t in m for t in ['tendon','fascia','ligament','aponeuros']):kind='tendon'
  elif any(t in m for t in ['cartilage','suture']):kind='cartilage'
  elif primary=='circulatory':kind='vein' if any(t in n for t in ['vein','venous','vena','sinus','plexus']) else 'artery'
  elif primary=='respiratory' and any(t in n for t in ['bronch','trachea']):kind='cartilage'
  for loop in tri.loops:
   vi=mesh.loops[loop].vertex_index;key=(vi,kind,tuple(activeuv.data[loop].uv) if activeuv else None)
   if key not in remap:
    remap[key]=len(positions)//3;p=matrix@mesh.vertices[vi].co;normal=(normalmatrix@mesh.vertices[vi].normal).normalized()
    positions.extend([p.x,p.z,-p.y]);normals.extend([normal.x,normal.z,-normal.y]);colors.extend(PALETTE[kind])
    if activeuv:uv.extend(activeuv.data[loop].uv)
   indices.append(remap[key])
 # Reflections in a negative-scale source transform require winding correction.
 if matrix.determinant()<0:
  for i in range(0,len(indices),3):indices[i+1],indices[i+2]=indices[i+2],indices[i+1]
 metadata={'id':ident,'name':label,'sourceName':name,'source':'z-anatomy','license':'CC-BY-SA-4.0','primarySystem':primary,'systems':list(dict.fromkeys(memberships)),'region':region,'parentId':primary+':'+subtype,'parentName':subtype,'side':side,'status':'available','reviewStatus':'pending','sourceMaterials':sorted(matnames),'vertices':len(positions)//3,'triangles':len(indices)//3,'hasUV':bool(activeuv)}
 for suffix,values in [('position',positions),('normal',normals),('color',colors),('indices',indices)]+([('uv',uv)] if activeuv else []):
  (OUT/(ident+'.'+suffix+'.bin')).write_bytes(values.tobytes())
 metadata['bounds']={'min':[min(positions[i::3]) for i in range(3)],'max':[max(positions[i::3]) for i in range(3)]}
 records.append(metadata);evaluated.to_mesh_clear()
 if len(records)%250==0:print('EXPORTED',len(records),flush=True)
(OUT/'inventory.json').write_text(json.dumps({'sourceRevision':'b9c9f98066e1e786814603b047c5bd3638c2a864','structures':records,'excluded':excluded,'imagesUsed':[],'materials':'Original material boundaries retained as vertex colors with documented tissue palette; no texture images imported.'}))
print('DONE',len(records),'structures',len(excluded),'excluded')
