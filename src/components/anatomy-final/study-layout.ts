/** MIT layout algorithm; names are licensed anatomy metadata. Coordinates are CSS pixels. */
import type {Manifest,StudyLayout,StudyTile,StudyGroup} from './types';
export const STUDY_PADDING=10;
export function packStudy(manifest:Manifest,enabled:string[],viewportWidth:number,zoom=1):StudyLayout {
  const width=Math.max(viewportWidth,240),margin=20,base=Math.round(132*Math.max(.75,Math.min(zoom,2)));
  const columns=Math.max(1,Math.floor((width-margin*2)/base));
  const tileSize=Math.floor((width-margin*2)/columns),tileHeight=tileSize+44;
  const tiles:StudyTile[]=[],groups:StudyGroup[]=[];const parts=new Map(manifest.structures.map(p=>[p.id,p]));let y=60;
  for(const system of manifest.systems.filter(s=>enabled.includes(s.id))){
    const members=system.memberIds.map(id=>parts.get(id)).filter(p=>p && p.status!=='missing').sort((a,b)=>a!.name.localeCompare(b!.name,'en')||a!.id.localeCompare(b!.id));
    const top=y;y+=44;
    members.forEach((part,index)=>tiles.push({id:part!.id,systemId:system.id,x:margin+(index%columns)*tileSize,y:y+Math.floor(index/columns)*tileHeight,width:tileSize,height:tileHeight,label:part!.name}));
    y+=Math.ceil(members.length/columns)*tileHeight+32;groups.push({id:system.id,label:system.label,y:top,height:y-top,count:members.length});
  }
  return {tiles,groups,height:Math.max(y,200),width,padding:STUDY_PADDING,tileSize};
}
export function visibleTiles(layout:StudyLayout,scrollTop:number,height:number){return layout.tiles.filter(t=>t.y+t.height>scrollTop && t.y<scrollTop+height);}
