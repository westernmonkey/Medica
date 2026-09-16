/** SPDX-License-Identifier: MIT. Imported HRA models/illustrations are CC-BY-4.0. */
import type {OrganId,KidneySide} from './catalog';
export interface LessonAsset{id:string;kind:'glb'|'svg';url:string;bytes:number;sha256:string;sourceSha256:string;sourceUrl:string;doi:string;license:string;version:string;citation:string;citationOverall:string}
export interface LessonStructure{id:string;label:string;group:string;conceptId:string;assetId:string;nodeName:string;nodeType:string;representation:'source-3d';reviewState:'pending'}
export interface DiagramGroup{id:string;label:string;elementIds:string[]}
export interface LessonDiagram extends LessonAsset{groups:DiagramGroup[]}
export interface LessonManifest{version:1;id:OrganId;side:KidneySide|'midline';title:string;atlasEntryIds:string[];reviewState:'pending';sources:LessonAsset[];modelAssets:LessonAsset[];diagrams:LessonDiagram[];structures:LessonStructure[];groups:string[];missing:string[]}
