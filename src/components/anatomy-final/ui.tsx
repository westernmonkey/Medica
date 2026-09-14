/** MIT UI; Z-Anatomy CC-BY-SA-4.0 and BodyParts3D CC-BY-4.0 attribution remains visible. */
'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {AnatomyScene} from './main';
import {Credits} from './credits';
import {StudyBoard} from './study-board';
import type {Manifest,Part,Selection,StudyLayout,SystemStatus} from './types';
import './anatomy-final.css';
function Icon({kind}:{kind:'body'|'search'|'reset'|'arrow'|'close'}){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='body'?<><circle cx="12" cy="4" r="2"/><path d="M5 9h14M12 6v8m-5 7 5-7 5 7M8 9l-2 6m10-6 2 6"/></>:kind==='search'?<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>:kind==='reset'?<><path d="M4 10a8 8 0 1 1 2 8M4 4v6h6"/></>:kind==='close'?<path d="m6 6 12 12M18 6 6 18"/>:<path d="m14 6-6 6 6 6"/>}</svg>;}
export default function AnatomyExplorer(){
 const host=useRef<HTMLDivElement>(null),viewer=useRef<AnatomyScene|null>(null),tooltip=useRef<HTMLDivElement>(null),search=useRef<HTMLInputElement>(null);
 const [manifest,setManifest]=useState<Manifest|null>(null),[statuses,setStatuses]=useState<Record<string,SystemStatus>>({}),[enabled,setEnabled]=useState(['skeletal']),[query,setQuery]=useState(''),[selected,setSelected]=useState<Selection|null>(null),[study,setStudy]=useState(false),[fascia,setFascia]=useState(false),[detail,setDetail]=useState(''),[error,setError]=useState(''),[retry,setRetry]=useState(0),[ready,setReady]=useState(false);
 useEffect(()=>{
  const abort=new AbortController();let active=true;setError('');setReady(false);setManifest(null);setStatuses({});setSelected(null);setEnabled(['skeletal']);setStudy(false);
  void fetch('/anatomy-final/atlas/manifest.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Anatomy index could not load.');return r.json();}).then((data:Manifest)=>{
   if(!active||!host.current)return;if(data.version!==2||data.systems.length!==11)throw Error('Anatomy index is incomplete.');const canonical=new Map(data.structures.map(p=>[p.id,p]));
   for(const group of [...data.systems,...data.details]){const ids=(group as typeof group & {partIds:string[]}).partIds;group.parts=ids.map(id=>{const p=canonical.get(id);if(!p)throw Error('Unknown structure in anatomy index');return p;});}setManifest(data);
   viewer.current=new AnatomyScene(host.current,data,{status:(id,status)=>{if(active)setStatuses(old=>({...old,[id]:status}));},selection:part=>{if(active)setSelected(part);},detail:state=>{if(active)setDetail(state);},hover:(name,x,y)=>{if(!tooltip.current||!host.current)return;tooltip.current.textContent=name;tooltip.current.hidden=!name;tooltip.current.style.left=`${Math.max(8,Math.min(x+16,host.current.clientWidth-232))}px`;tooltip.current.style.top=`${Math.max(8,Math.min(y+16,host.current.clientHeight-70))}px`;},metrics:m=>{if(active&&m.firstInteractiveMs)setReady(true);},error:message=>{if(active)setError(message);}});
  }).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Unable to initialize WebGL.');});
  return()=>{active=false;abort.abort();viewer.current?.dispose();viewer.current=null;};
 },[retry]);
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key==='k'){event.preventDefault();search.current?.focus();}if(event.key==='Escape')viewer.current?.clearSelection();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const byId=useMemo(()=>new Map(manifest?.structures.map(p=>[p.id,p])||[]),[manifest]);
 const matches=useMemo(()=>{const terms=query.trim().toLowerCase().split(/\s+/);return !manifest||!query.trim()?[]:manifest.structures.filter(p=>terms.every(t=>`${p.name} ${p.conceptId||''} ${p.parentName}`.toLowerCase().includes(t)));},[manifest,query]);
 const changeSystems=(next:string[])=>{setEnabled(next);viewer.current?.setSystems(next);};
 const toggle=(id:string)=>changeSystems(enabled.includes(id)?enabled.filter(v=>v!==id):[...enabled,id]);
 const select=useCallback((system:string,id:string)=>{setError('');void viewer.current?.isolate(system,id);},[]);
 const prefetch=useCallback((system:string)=>viewer.current?.prefetch(system),[]);
 const boardLayout=useCallback((layout:StudyLayout,scroll:number,height:number,zoom:number)=>viewer.current?.setBoard(layout,scroll,height,zoom),[]);
 const setBoard=(value:boolean)=>{setStudy(value);viewer.current?.setStudy(value);};
 const count=manifest?.structures.filter(p=>p.systems.some(s=>enabled.includes(s))).length||0;
 return <div className="anatomy-final">
  <header className="af-header"><Link className="af-brand" href="/" aria-label="Medica home"><span className="af-brand-mark"><Icon kind="body"/></span>MEDICA<span className="af-brand-divider"/><span className="af-product">Anatomy atlas</span></Link><Link href="/anatomy" className="af-back" aria-label="Organ library"><Icon kind="arrow"/><span>Organ library</span></Link></header>
  <div className="af-workspace">
   <aside className="af-sidebar" aria-label="Anatomy controls">
    <div className="af-intro"><p className="af-eyebrow">CONNECTED ANATOMY</p><h1>Male anatomy</h1><p className="af-muted">11 systems · anatomical review pending</p></div>
    <div className="af-search-area"><label className="af-search"><Icon kind="search"/><input ref={search} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a structure" aria-label="Search anatomical parts" aria-controls="af-search-results"/><kbd>⌘ K</kbd></label>
     {!!query.trim()&&<div className="af-results" id="af-search-results"><p className="af-result-count" role="status">{matches.length} named structures{matches.length>80?' · first 80 shown':''}</p>{matches.slice(0,80).map(p=><button key={p.id} onClick={()=>select(p.primarySystem,p.id)}><span>{p.name}</span><small>{p.region} · {p.primarySystem}</small></button>)}{!matches.length&&<p className="af-muted">No matching model. Check the coverage report for missing anatomy.</p>}</div>}
    </div>
    <div className="af-section-heading"><h2>Body systems</h2><span>{enabled.length} / 11</span></div>
    <div className="af-systems">{manifest?.systems.map(system=>{
     const status=statuses[system.id]||{state:'idle',progress:0};const members=system.memberIds.map(id=>byId.get(id)!).filter(Boolean);const groups=new Map<string,Part[]>();for(const p of members){const key=p.parentName||p.region;if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(p);}
     return <div key={system.id} className="af-system-row" data-system={system.id}>
      <div className="af-system-actions"><button className="af-system" aria-pressed={enabled.includes(system.id)} onPointerEnter={()=>prefetch(system.id)} onClick={()=>toggle(system.id)}><span className="af-system-dot" style={{backgroundColor:system.color}}/><span className="af-system-name">{system.label}<small>{status.state==='loading'?`Loading ${Math.round(status.progress*100)}%`:status.state==='queued'?'Queued':status.state==='error'?'Load failed':`${members.length} structures`}</small></span><span className="af-switch" aria-hidden="true"/></button><button className="af-only" aria-label={`Show only ${system.label}`} onClick={()=>{changeSystems([system.id]);viewer.current?.resetView();}}>Only</button></div>
      {status.state==='error'&&<button className="af-retry-system" onClick={()=>prefetch(system.id)}>Retry {system.label}</button>}
      {system.id==='muscular'&&<label className="af-fascia"><input type="checkbox" checked={fascia} onChange={e=>{setFascia(e.target.checked);viewer.current?.setFascia(e.target.checked);}}/> Show covering fascia</label>}<details className="af-tree"><summary aria-label={`Browse ${system.label} structures`}>Browse structures</summary>{[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([group,parts])=><details key={group}><summary>{group}<span>{parts.length}</span></summary><ul>{parts.sort((a,b)=>a.name.localeCompare(b.name)).map(p=><li key={p.id}><button onClick={()=>select(system.id,p.id)}>{p.name}</button></li>)}</ul></details>)}</details>
     </div>;
    })}</div>
    <div className="af-explode"><div className="af-section-heading"><label htmlFor="af-explode">Explode / study layout</label><output htmlFor="af-explode">{study?'100%':'0%'}</output></div><input id="af-explode" type="range" min="0" max="100" step="100" value={study?100:0} onChange={e=>setBoard(Number(e.target.value)>0)}/><div className="af-range-labels"><span>Assembled</span><span>Grouped study tiles</span></div></div>
    <details className="af-coverage"><summary>Coverage &amp; source review</summary><p>Named structures, not mesh fragments. Available does not mean anatomically reviewed.</p><ul>{manifest?.coverage.missing.map(text=><li key={text}>{text}</li>)}</ul><a href="/anatomy-final/coverage.json" target="_blank" rel="noreferrer">Full coverage and exclusions ↗</a></details>
   </aside>
   <section className="af-stage" aria-label="3D anatomy explorer">
    <div ref={host} className="af-canvas" data-testid="anatomy-canvas"/>
    {study&&manifest&&<StudyBoard manifest={manifest} enabled={enabled} hidden={!!selected} onLayout={boardLayout} onSelect={select} onPrefetch={prefetch}/>}
    {!study&&<div className="af-stage-heading"><span className="af-eyebrow">MALE GROSS ANATOMY / 3D</span><span className="af-stage-count">{selected?'Structure inspection':`${count} named structures enabled`}</span>{enabled.includes('integumentary')&&!selected&&<span className="af-exterior-note">Exterior view · hide Skin to reveal internal systems</span>}</div>}
    {!ready&&!error&&<div className="af-message" role="status"><h2>Preparing the atlas</h2><p>{statuses.skeletal?.state==='error'?'Skeleton failed to load. Use Retry Skeletal.':`Loading skeleton${statuses.skeletal?.state==='loading'?` · ${Math.round(statuses.skeletal.progress*100)}%`:'…'}`}</p></div>}
    {error&&<div className="af-message" role="alert"><h2>Viewer needs attention</h2><p>{error}</p><button onClick={()=>setRetry(v=>v+1)}>Reload viewer</button></div>}
    {ready&&!enabled.length&&!selected&&!study&&<div className="af-message"><h2>Choose a body system</h2><p>Use Only to study a system without overlapping layers.</p></div>}
    {selected&&<div className="af-selection" aria-live="polite"><div><span className="af-eyebrow">{selected.systemLabel} · {selected.region}</span><h2>{selected.name}</h2><p className="af-detail-status">{detail}</p><p className="af-source-label">{selected.source==='z-anatomy'?'Z-Anatomy · CC-BY-SA 4.0':'BodyParts3D · CC-BY 4.0'} · review pending</p></div><button onClick={()=>viewer.current?.clearSelection()} aria-label={study?'Return to study board':'Clear isolation'}><Icon kind="close"/></button></div>}
    <div ref={tooltip} className="af-tooltip" role="tooltip" hidden/>
    {(!study||selected)&&<div className="af-stage-bottom"><p>Drag to rotate · Scroll to zoom · Select to inspect</p><button onClick={()=>viewer.current?.resetView()} aria-label="Reset camera and clear isolation"><Icon kind="reset"/><span>{study?'Back to board':'Reset view'}</span></button></div>}
   </section>
  </div><Credits/>
 </div>;
}
