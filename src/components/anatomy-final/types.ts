/** MIT types; anatomy source licenses are attached to each structure (CC-BY / CC-BY-SA). */
import type {Box3, Mesh, BufferGeometry, MeshStandardMaterial, Vector3} from 'three';
export interface Part {id:string;name:string;conceptId?:string;primarySystem:string;systems:string[];region:string;parentId:string;parentName:string;side:string;source:string;license:string;status:'available'|'missing'|'reconstructed'|'reviewed';reviewStatus:string;detailKey?:string;fragmentCount?:number;sourceMaterials?:string[]}
export interface SystemDefinition {id:string;label:string;color:string;url:string;bytes:number;parts:Part[];memberIds:string[];coverageNote?:string}
export interface DetailDefinition {id:string;url:string;bytes:number;systemId:string;parts:Part[]}
export interface Manifest {version:2;copyright:string;bounds:{min:number[];max:number[]};systems:SystemDefinition[];structures:Part[];details:DetailDefinition[];sources:Array<{id:string;license:string;url:string;attribution:string}>;coverage:{url:string;reviewStatus:string;missing:string[]}}
export interface PartRange extends Part {indexStart:number;indexCount:number;vertexStart:number;vertexCount:number;center:Vector3;bounds:Box3}
export interface LoadedSystem {definition:SystemDefinition;mesh:Mesh<BufferGeometry,MeshStandardMaterial[]>;parts:PartRange[];rest:Float32Array}
export type LoadState='idle'|'queued'|'loading'|'ready'|'error';
export interface SystemStatus {state:LoadState;progress:number;error?:string}
export interface Selection extends Part {systemId:string;systemLabel:string}
export interface Metrics {calls:number;triangles:number;firstInteractiveMs:number;frameMs:number;frames:number;geometries:number;textures:number}
export interface ViewerEvents {status:(id:string,status:SystemStatus)=>void;selection:(part:Selection|null)=>void;hover:(name:string|null,x:number,y:number)=>void;metrics:(metrics:Metrics)=>void;error:(message:string)=>void;detail:(state:string)=>void}
export interface StudyTile {id:string;systemId:string;x:number;y:number;width:number;height:number;label:string}
export interface StudyGroup {id:string;label:string;y:number;height:number;count:number}
export interface StudyLayout {tiles:StudyTile[];groups:StudyGroup[];height:number;width:number;padding:number;tileSize:number}
