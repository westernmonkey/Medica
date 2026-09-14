/** MIT study UI; displayed model names retain their source CC licenses. */
'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {packStudy,visibleTiles} from './study-layout';
import type {Manifest,StudyLayout} from './types';
export function StudyBoard({manifest,enabled,hidden,progress,onLayout,onSelect,onPrefetch}:{manifest:Manifest;enabled:string[];hidden:boolean;progress:number;onLayout:(layout:StudyLayout,scroll:number,height:number,zoom:number)=>void;onSelect:(system:string,id:string)=>void;onPrefetch:(system:string)=>void}){
 const ref=useRef<HTMLDivElement>(null);const [size,setSize]=useState({width:395,height:600}),[top,setTop]=useState(0),[zoom,setZoom]=useState(1);
 const drag=useRef<{y:number;top:number;moved:boolean}|null>(null),suppress=useRef(false);
 useEffect(()=>{const el=ref.current;if(!el)return;const observer=new ResizeObserver(()=>setSize({width:el.clientWidth,height:el.clientHeight}));observer.observe(el);return()=>observer.disconnect();},[]);
 const layout=useMemo(()=>packStudy(manifest,enabled,size.width,zoom),[manifest,enabled,size.width,zoom]);
 useEffect(()=>onLayout(layout,top,size.height,zoom),[layout,top,size.height,zoom,onLayout]);
 useEffect(()=>{const el=ref.current;if(!el)return;const wheel=(e:WheelEvent)=>{if(e.ctrlKey||e.metaKey){e.preventDefault();setZoom(z=>Math.max(.75,Math.min(2,z+(e.deltaY<0?.1:-.1))));}};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);},[]);
 const visible=visibleTiles(layout,top,size.height);
 useEffect(()=>{if(hidden)return;for(const system of new Set(visible.map(t=>manifest.structures.find(p=>p.id===t.id)!.primarySystem)))onPrefetch(system);},[layout,top,size.height,manifest,onPrefetch,hidden]); // eslint-disable-line react-hooks/exhaustive-deps
 return <div className="af-board" aria-hidden={hidden||progress<1} inert={hidden||progress<1} style={{visibility:hidden?'hidden':'visible',opacity:Math.max(0,(progress-.7)/.3),pointerEvents:hidden||progress<1?'none':'auto'}}>
  <div className="af-board-toolbar"><span>Study board <strong>Not to anatomical scale</strong></span><div><button aria-label="Smaller study tiles" onClick={()=>setZoom(z=>Math.max(.75,z-.25))}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label="Larger study tiles" onClick={()=>setZoom(z=>Math.min(2,z+.25))}>+</button></div></div>
  <div className="af-board-scroll" ref={ref} tabIndex={0} aria-label="Anatomy study board. Scroll or drag to pan; use plus and minus to zoom." onScroll={e=>setTop(e.currentTarget.scrollTop)} onPointerDown={e=>{if(e.button===0){drag.current={y:e.clientY,top:e.currentTarget.scrollTop,moved:false};suppress.current=false;}}} onPointerMove={e=>{if(drag.current&&e.buttons===1){const delta=e.clientY-drag.current.y;if(Math.abs(delta)>5){drag.current.moved=true;suppress.current=true;ref.current!.scrollTop=drag.current.top-delta;}}}} onPointerUp={()=>{drag.current=null;}} onPointerLeave={()=>{drag.current=null;}} onClickCapture={e=>{if(suppress.current){e.preventDefault();e.stopPropagation();suppress.current=false;}}}>
   <div className="af-board-content" style={{height:layout.height}}>
    {layout.groups.filter(g=>g.y+g.height>top&&g.y<top+size.height).map(g=><h2 key={g.id} className="af-board-group" style={{top:g.y,left:20}}>{g.label}<span>{g.count} structures</span></h2>)}
    {visible.map(tile=><button key={`${tile.systemId}:${tile.id}`} className="af-study-tile" data-structure={tile.id} data-system={tile.systemId} style={{left:tile.x,top:tile.y,width:tile.width,height:tile.height}} onClick={()=>onSelect(tile.systemId,tile.id)} aria-label={`Inspect ${tile.label}`}><span className="af-tile-space" style={{height:tile.width}}/><span className="af-tile-name">{tile.label}</span></button>)}
    {enabled.length===0&&<p className="af-board-empty">Choose a system to lay out its structures.</p>}
   </div>
  </div>
 </div>;
}
