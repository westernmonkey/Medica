/** SPDX-License-Identifier: MIT. Source anatomy in lessons is HRA CC-BY-4.0. */
export type OrganId='kidney'|'prostate';export type LessonTab='3d'|'micro'|'function';export type KidneySide='left'|'right';
export const entryOrgan:Record<string,{organ:OrganId;side?:KidneySide}>={
 'bp-FMA7205':{organ:'kidney',side:'left'},'bp-FMA7204':{organ:'kidney',side:'right'},'za-0fa320e13ac298d5':{organ:'prostate'},
};
export interface LessonLocation {organ:OrganId;side:KidneySide;tab:LessonTab}
export function parseLesson(url:URL):LessonLocation|null{const organ=url.searchParams.get('lesson');if(organ!=='kidney'&&organ!=='prostate')return null;const tab=url.searchParams.get('lessonTab');return {organ,side:organ==='kidney'&&url.searchParams.get('side')==='right'?'right':'left',tab:tab==='micro'||tab==='function'?tab:'3d'};}
export function lessonURL(current:string,location:LessonLocation|null){const url=new URL(current);for(const name of ['lesson','side','lessonTab'])url.searchParams.delete(name);if(location){url.searchParams.set('lesson',location.organ);if(location.organ==='kidney')url.searchParams.set('side',location.side);url.searchParams.set('lessonTab',location.tab);}return url.pathname+url.search+url.hash;}
