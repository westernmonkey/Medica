/** MIT viewer; Z-Anatomy CC-BY-SA-4.0 and BodyParts3D CC-BY-4.0 data. Three MIT; Draco Apache-2.0. */
import {ACESFilmicToneMapping,AmbientLight,Box3,Color,DirectionalLight,OrthographicCamera,PerspectiveCamera,PMREMGenerator,Raycaster,Scene,Vector2,Vector3,WebGLRenderer} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {SystemLoader} from './loader';
import {partAtTriangle} from './explode';
import {visibleTiles} from './study-layout';
import {prepareStudyMorph,setStudyMorph,transitionAmount} from './study-transition';
import type {LoadedSystem,Manifest,PartRange,StudyLayout,ViewerEvents} from './types';

export class AnatomyScene {
 private scene=new Scene();private camera=new PerspectiveCamera(38,1,.001,50);private tileCamera=new OrthographicCamera(-1,1,1,-1,.001,20);
 private renderer:WebGLRenderer;private controls:OrbitControls;private loader:SystemLoader;private environment;private observer:ResizeObserver;
 private frame=0;private disposed=false;private reduced=matchMedia('(prefers-reduced-motion: reduce)');private enabled=new Set(['skeletal']);
 private showFascia=false;
 private selected:{system:LoadedSystem;part:PartRange}|null=null;private requestToken=0;private raycaster=new Raycaster();private pointer=new Vector2();private start={x:0,y:0};
 private idleTimer:ReturnType<typeof setTimeout>|undefined;private attempted=new Set<string>();private began=performance.now();private first=0;private frames=0;private previous=0;
 private amount=0;private targetAmount=0;private fromAmount=0;private transitionStart=0;private morphDirty=true;
 private board=false;private boardLayout:StudyLayout|null=null;private boardScroll=0;private boardHeight=0;
 private hoverFrame=0;private pointerEvent:PointerEvent|null=null;private detailKeys:string[]=[];
 private suspended=false;
 constructor(private host:HTMLElement,private manifest:Manifest,private events:ViewerEvents,initiallySuspended=false){
  this.suspended=initiallySuspended;
  this.renderer=new WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(new Color('#0B1016'));this.renderer.toneMapping=ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
  this.renderer.info.autoReset=false;
  const canvas=this.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Interactive anatomy. Drag to rotate, scroll to zoom. Search or use the structure list for keyboard selection.');this.host.append(canvas);
  this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=!this.reduced.matches;this.controls.dampingFactor=.12;this.controls.minDistance=.03;this.controls.maxDistance=8;this.controls.addEventListener('change',this.invalidate);this.controls.addEventListener('start',this.invalidate);
  this.scene.add(new AmbientLight(0xffffff,.3));const light=new DirectionalLight(0xffffff,1.4);light.position.set(2,3,4);this.scene.add(light);const fill=new DirectionalLight(0xadcfff,.5);fill.position.set(-2,1,-3);this.scene.add(fill);
  const pmrem=new PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
  this.loader=new SystemLoader((id,status)=>{if(this.disposed)return;this.events.status(id,status);});
  this.loader.setPaused(initiallySuspended);
  this.observer=new ResizeObserver(this.resize);this.observer.observe(host);
  canvas.addEventListener('pointerdown',this.down);canvas.addEventListener('pointermove',this.move);canvas.addEventListener('pointerleave',this.leave);canvas.addEventListener('click',this.click);canvas.addEventListener('keydown',this.key);canvas.addEventListener('webglcontextlost',this.contextLost);
  this.reduced.addEventListener('change',this.motion);document.addEventListener('visibilitychange',this.visibility);
  this.resize();this.fitBody();void this.ensure('skeletal',100).catch(()=>{});
 }
 setSuspended(value:boolean){if(this.suspended===value)return;this.suspended=value;this.loader.setPaused(value);this.controls.enabled=!value&&(!this.board||!!this.selected);if(value){cancelAnimationFrame(this.frame);this.frame=0;cancelAnimationFrame(this.hoverFrame);this.hoverFrame=0;clearTimeout(this.idleTimer);this.events.hover(null,0,0);}else{this.invalidate();this.scheduleIdle();}}
 private motion=()=>{this.controls.enableDamping=!this.reduced.matches;this.invalidate();};
 private visibility=()=>{if(!document.hidden&&!this.suspended){this.invalidate();this.scheduleIdle();}};
 private contextLost=(e:Event)=>{e.preventDefault();this.events.error('Graphics context lost. Reload the viewer to continue.');};
 private resize=()=>{if(this.disposed)return;const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);this.morphDirty=true;this.invalidate();};
 private fit(bounds:Box3){const size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3());const distance=Math.max(size.y,size.x/this.camera.aspect,.03)/(2*Math.tan(this.camera.fov*Math.PI/360))*1.18+size.z/2;this.controls.target.copy(center);this.camera.position.copy(center).add(new Vector3(0,0,distance));this.controls.update();this.invalidate();}
 private fitVisible(){const box=new Box3();for(const s of this.loader.loaded.values())if(!s.definition.id.startsWith('detail:'))for(const p of s.parts)if(p.systems.some(id=>this.enabled.has(id)))box.union(p.bounds);if(box.isEmpty())this.fitBody();else this.fit(box);}
 private fitBody(){this.fit(new Box3(new Vector3().fromArray(this.manifest.bounds.min),new Vector3().fromArray(this.manifest.bounds.max)));}
 private async ensure(id:string,priority:number){const definition=this.manifest.systems.find(s=>s.id===id);if(!definition)throw Error('Unknown system');const system=await this.loader.request(definition,priority);if(!this.disposed){if(!system.mesh.parent)this.scene.add(system.mesh);this.morphDirty=true;this.sync();this.invalidate();if(id==='skeletal')this.scheduleIdle();}return system;}
 prefetch(id:string){void this.ensure(id,10).catch(()=>{});}
 setFascia(value:boolean){this.showFascia=value;this.morphDirty=true;this.sync();this.invalidate();}
 setSystems(ids:string[]){this.requestToken++;this.selected=null;this.events.selection(null);this.enabled=new Set(ids);this.morphDirty=true;this.controls.enabled=!this.board;this.sync();this.invalidate();const owners=new Set(this.manifest.structures.filter(p=>p.systems.some(id=>this.enabled.has(id))).map(p=>p.primarySystem));const token=this.requestToken;void Promise.all([...owners].map(id=>this.ensure(id,100).catch(()=>null))).then(()=>{if(!this.disposed&&token===this.requestToken&&!this.board)this.fitVisible();});}
 setStudy(value:number){if(this.selected)this.clearSelection();this.fromAmount=this.amount;this.targetAmount=Math.max(0,Math.min(1,value));this.transitionStart=performance.now();this.board=this.targetAmount>0||this.amount>0;this.controls.enabled=!this.board;this.host.dataset.study=String(this.board);this.events.hover(null,0,0);if(this.amount===0)this.morphDirty=true;this.sync();this.invalidate();}
 setBoard(layout:StudyLayout,scroll:number,height:number){this.boardLayout=layout;this.boardScroll=scroll;this.boardHeight=height;this.morphDirty=true;this.invalidate();}
 async isolate(systemId:string,partId:string){
  const token=++this.requestToken;const definition=this.manifest.structures.find(p=>p.id===partId);if(!definition)return;
  try{
   const system=await this.ensure(definition.primarySystem,100);if(this.disposed||token!==this.requestToken)return;const part=system.parts.find(p=>p.id===partId);if(!part)throw Error('Structure unavailable');
   this.selected={system,part};this.controls.enabled=true;this.events.selection({...part,systemId:definition.primarySystem,systemLabel:this.manifest.systems.find(s=>s.id===definition.primarySystem)!.label});this.events.detail('Overview · loading regional detail…');this.sync();this.fit(part.bounds);
   const detail=this.manifest.details.find(d=>d.id===definition.detailKey);if(!detail){this.events.detail('Overview');return;}
   const key='detail:'+detail.id;const detailed=await this.loader.request({id:key,label:detail.id,color:'#ffffff',url:detail.url,bytes:detail.bytes,parts:detail.parts,memberIds:detail.parts.map(p=>p.id)},120);
   if(this.disposed)return;
   if(!detailed.mesh.parent)this.scene.add(detailed.mesh);
   this.detailKeys=this.detailKeys.filter(k=>k!==key);this.detailKeys.push(key);
   while(this.detailKeys.length>2){const old=this.detailKeys.shift()!;if(old!==this.selected?.system.definition.id)this.loader.release(old);}
   if(token!==this.requestToken){this.sync();return;}
   const high=detailed.parts.find(p=>p.id===partId);if(!high)throw Error('Detail structure missing');this.selected={system:detailed,part:high};this.events.detail('Source-resolution regional detail');this.sync();this.invalidate();
   while(this.detailKeys.length>2){const old=this.detailKeys.shift()!;if(old!==key)this.loader.release(old);}
  }catch{if(!this.disposed&&token===this.requestToken)this.events.detail(this.selected?'Overview · detail unavailable; select again to retry':'Structure unavailable; retry its system');}
 }
 clearSelection(){this.requestToken++;this.selected=null;this.events.selection(null);this.events.detail('');this.controls.enabled=!this.board;this.sync();if(!this.board)this.fitVisible();this.invalidate();}
 resetView(){this.clearSelection();if(!this.board)this.fitVisible();}
 private sync(){
  const exterior=this.enabled.has('integumentary')&&!this.board;
  for(const system of this.loader.loaded.values()){
   const g=system.mesh.geometry;g.clearGroups();g.addGroup(0,g.index!.count,0);g.setDrawRange(0,Infinity);
   if(this.selected){system.mesh.visible=this.selected.system===system;if(system.mesh.visible)g.setDrawRange(this.selected.part.indexStart,this.selected.part.indexCount);continue;}
   if(system.definition.id.startsWith('detail:')){system.mesh.visible=false;continue;}
   // Exterior mode suppresses internal geometry rather than allowing numerical skin intersections to leak through.
   if(exterior){system.mesh.visible=system.definition.id==='integumentary';continue;}
   const active=system.parts.filter(p=>p.systems.some(id=>this.enabled.has(id))&&(this.showFascia||p.primarySystem!=='muscular'||!(/\bfascia\b/i.test(p.name))));system.mesh.visible=active.length>0;
   if(active.length!==system.parts.length){g.clearGroups();let last:{start:number;count:number}|undefined;for(const p of active){if(last&&last.start+last.count===p.indexStart)last.count+=p.indexCount;else{last={start:p.indexStart,count:p.indexCount};g.groups.push({...last,materialIndex:0});}if(last)g.groups[g.groups.length-1].count=last.count;}}
  }
 }
 private scheduleIdle(){clearTimeout(this.idleTimer);if(this.suspended)return;this.idleTimer=setTimeout(()=>{if(this.disposed||this.suspended||document.hidden||(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData)return;const next=this.manifest.systems.find(s=>!this.loader.loaded.has(s.id)&&!this.attempted.has(s.id));if(next){this.attempted.add(next.id);void this.ensure(next.id,-10).catch(()=>{}).finally(()=>{if(!this.disposed)this.scheduleIdle();});}},1800);}
 private invalidate=()=>{if(!this.frame&&!this.disposed&&!this.suspended&&!document.hidden)this.frame=requestAnimationFrame(this.render);};
 private render=(now:number)=>{
  this.frame=0;if(this.disposed||this.suspended)return;this.renderer.info.reset();
  this.amount=transitionAmount(this.fromAmount,this.targetAmount,now-this.transitionStart,this.reduced.matches);this.board=this.amount>0||this.targetAmount>0;this.controls.enabled=!this.board||!!this.selected;this.host.dataset.explode=String(this.amount);this.host.dataset.study=String(this.board);
  for(const system of this.loader.loaded.values())setStudyMorph(system,0);
  let moving=false;
  if(this.amount>0&&this.amount<1&&!this.selected&&this.boardLayout)this.renderTransition();else if(this.amount===1&&!this.selected&&this.boardLayout)this.renderBoard();else{this.sync();this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,this.host.clientWidth,this.host.clientHeight);moving=this.controls.update();this.renderer.render(this.scene,this.camera);}
  if(!this.first&&this.loader.loaded.has('skeletal'))this.first=performance.now()-this.began;
  this.frames++;const info=this.renderer.info;
  Object.assign(this.host.dataset,{drawCalls:String(info.render.calls),triangles:String(info.render.triangles),renderFrames:String(this.frames),loadedSystems:String([...this.loader.loaded.keys()].filter(k=>!k.startsWith('detail:')).length),firstInteractiveMs:String(Math.round(this.first)),geometries:String(info.memory.geometries),textures:String(info.memory.textures)});
  this.events.metrics({calls:info.render.calls,triangles:info.render.triangles,firstInteractiveMs:this.first,frameMs:this.previous?now-this.previous:0,frames:this.frames,geometries:info.memory.geometries,textures:info.memory.textures});this.previous=now;if(moving||this.amount!==this.targetAmount)this.invalidate();
 };
 private renderTransition(){
  const tiles=new Map<string,import('./types').StudyTile>();for(const tile of this.boardLayout!.tiles)if(!tiles.has(tile.id))tiles.set(tile.id,tile);
  for(const system of this.loader.loaded.values()){
   if(system.definition.id.startsWith('detail:')){system.mesh.visible=false;continue;}
   const parts=system.parts.filter(p=>tiles.has(p.id));system.mesh.visible=parts.length>0;if(!parts.length)continue;
   if(this.morphDirty)prepareStudyMorph(system,tiles,this.host.clientWidth,this.host.clientHeight,this.boardScroll,(name,id)=>this.enabled.has('integumentary')?id==='integumentary':this.showFascia||id!=='muscular'||!(/\bfascia\b/i.test(name)));
   const g=system.mesh.geometry;g.clearGroups();for(const p of parts)g.addGroup(p.indexStart,p.indexCount,0);if(parts.length===system.parts.length){g.clearGroups();g.addGroup(0,g.index!.count,0);}g.setDrawRange(0,Infinity);setStudyMorph(system,this.amount);
  }
  this.morphDirty=false;this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,this.host.clientWidth,this.host.clientHeight);this.renderer.render(this.scene,this.camera);
 }
 private renderBoard(){
  const width=this.host.clientWidth,height=this.host.clientHeight;this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,width,height);this.renderer.clear();this.renderer.autoClear=false;this.renderer.setScissorTest(true);
  for(const s of this.loader.loaded.values())s.mesh.visible=false;
  let count=0;
  for(const tile of visibleTiles(this.boardLayout!,this.boardScroll,this.boardHeight||height)){
   const info=this.manifest.structures.find(p=>p.id===tile.id);const system=info?this.loader.loaded.get(info.primarySystem):undefined;const part=system?.parts.find(p=>p.id===tile.id);if(!system||!part)continue;
   const x=tile.x+10,y=height-(tile.y-this.boardScroll)-tile.width+10,w=tile.width-20,h=w;
   if(y+h<0||y>height)continue;
   const size=part.bounds.getSize(new Vector3()),center=part.center,extent=Math.max(size.x,size.y,.0005)*1.06;
   this.tileCamera.left=-extent/2;this.tileCamera.right=extent/2;this.tileCamera.top=extent/2;this.tileCamera.bottom=-extent/2;this.tileCamera.position.copy(center).add(new Vector3(0,0,Math.max(size.z,extent)*2+.1));this.tileCamera.lookAt(center);this.tileCamera.updateProjectionMatrix();
   system.mesh.visible=true;system.mesh.geometry.clearGroups();system.mesh.geometry.addGroup(part.indexStart,part.indexCount,0);system.mesh.geometry.setDrawRange(part.indexStart,part.indexCount);
   this.renderer.setViewport(x,y,w,h);this.renderer.setScissor(Math.max(0,x),Math.max(0,y),Math.min(w,width-x),Math.min(height,y+h)-Math.max(0,y));this.renderer.clearDepth();this.renderer.render(this.scene,this.tileCamera);count++;system.mesh.visible=false;
  }
  this.renderer.autoClear=true;this.renderer.setScissorTest(false);this.host.dataset.visibleTiles=String(count);
 }
 private down=(e:PointerEvent)=>{this.start={x:e.clientX,y:e.clientY};};
 private pick(e:MouseEvent){const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const systems=[...this.loader.loaded.values()].filter(s=>s.mesh.visible);const hit=this.raycaster.intersectObjects(systems.map(s=>s.mesh),false)[0];if(!hit||hit.faceIndex==null)return null;const system=systems.find(s=>s.mesh===hit.object)!;const part=partAtTriangle(system,hit.faceIndex);return part?{system,part}:null;}
 private move=(e:PointerEvent)=>{if(this.suspended||this.board&&!this.selected)return;this.pointerEvent=e;if(this.hoverFrame||e.buttons)return;this.hoverFrame=requestAnimationFrame(()=>{this.hoverFrame=0;if(this.disposed||!this.pointerEvent)return;const hit=this.pick(this.pointerEvent),r=this.host.getBoundingClientRect();this.events.hover(hit?.part.name||null,this.pointerEvent.clientX-r.left,this.pointerEvent.clientY-r.top);});};
 private leave=()=>{this.pointerEvent=null;this.events.hover(null,0,0);};
 private click=(e:MouseEvent)=>{if(this.suspended||this.board&&!this.selected||Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y)>5)return;const hit=this.pick(e);if(hit)void this.isolate(hit.part.primarySystem,hit.part.id);};
 private key=(e:KeyboardEvent)=>{if(this.suspended)return;if(e.key==='Escape'){this.clearSelection();return;}if(this.board&&!this.selected)return;const offset=this.camera.position.clone().sub(this.controls.target);if(e.key==='ArrowLeft'||e.key==='ArrowRight')offset.applyAxisAngle(new Vector3(0,1,0),e.key==='ArrowLeft'?.1:-.1);else if(e.key==='ArrowUp'||e.key==='ArrowDown')offset.applyAxisAngle(new Vector3(1,0,0),e.key==='ArrowUp'?.1:-.1);else if(e.key==='+'||e.key==='=')offset.multiplyScalar(.9);else if(e.key==='-')offset.multiplyScalar(1.1);else if(e.key==='Home'){this.resetView();return;}else return;e.preventDefault();this.camera.position.copy(this.controls.target).add(offset.clampLength(.03,8));this.controls.update();this.invalidate();};
 dispose(){this.disposed=true;this.requestToken++;cancelAnimationFrame(this.frame);cancelAnimationFrame(this.hoverFrame);clearTimeout(this.idleTimer);this.observer.disconnect();document.removeEventListener('visibilitychange',this.visibility);this.reduced.removeEventListener('change',this.motion);this.controls.dispose();this.loader.dispose();this.environment.dispose();const c=this.renderer.domElement;c.removeEventListener('pointerdown',this.down);c.removeEventListener('pointermove',this.move);c.removeEventListener('pointerleave',this.leave);c.removeEventListener('click',this.click);c.removeEventListener('keydown',this.key);c.removeEventListener('webglcontextlost',this.contextLost);this.renderer.dispose();c.remove();}
}
