/* SPDX-License-Identifier: MIT. Source assets: HuBMAP/HRA CC-BY-4.0. */
export const HRA_REVISION='8cf7ee34c9c16f7fa5f129bc577e906270d50393';
const cdn='https://cdn.humanatlas.io/digital-objects/';
const raw=`https://raw.githubusercontent.com/hubmapconsortium/hra-kg/${HRA_REVISION}/digital-objects/`;
export const assets=[
 {id:'kidney-left',kind:'glb',object:'ref-organ/kidney-male-left/v1.3',file:'3d-vh-m-kidney-l.glb',sha256:'1e9f54281652d0b05c9ae54a06380a41a8d9c62c1036829180750995b1730fac',doi:'10.48539/HBM759.JKKF.434'},
 {id:'kidney-right',kind:'glb',object:'ref-organ/kidney-male-right/v1.3',file:'3d-vh-m-kidney-r.glb',sha256:'f23bac3f62fd050b689bdee86bb8a20bff6997e830cb508c847f74c03c6a964b',doi:'10.48539/HBM364.QTSC.334'},
 {id:'ureter-left',kind:'glb',object:'ref-organ/ureter-male-left/v1.2',file:'3d-vh-m-ureter-l.glb',sha256:'ebdd493c2e8095ccb6e795f49bf26c94e8d205c94097a7e1f9a9d7b168a1173c',doi:'10.48539/HBM434.VLQJ.299'},
 {id:'ureter-right',kind:'glb',object:'ref-organ/ureter-male-right/v1.2',file:'3d-vh-m-ureter-r.glb',sha256:'215978b67cf4d3876249a8dafb8c83a13471b5e1eb601559dca25a61a7c9d091',doi:'10.48539/HBM852.SVFJ.388'},
 {id:'prostate',kind:'glb',object:'ref-organ/prostate-male/v1.2',file:'3d-vh-m-prostate.glb',sha256:'b456bf89571b8ad46f7c01941cdc45d6c2176c1554849755b009819231142321',doi:'10.48539/HBM545.CTNV.442'},
 {id:'nephron',kind:'svg',object:'2d-ftu/kidney-nephron/v1.3',file:'2d-ftu-kidney-nephron.svg',sha256:'15ab50baba234c836c98992cd536b107b115a79d128c8034c826d17f906647b9',doi:'10.48539/HBM496.MJDK.347'},
 {id:'renal-corpuscle',kind:'svg',object:'2d-ftu/kidney-renal-corpuscle/v1.4',file:'2d-ftu-kidney-renal-corpuscle.svg',sha256:'2c519055d48170541d839aaaa9fb3d3d5c0c1bf7c00fffa7365f7bb9d9ee476e',doi:'10.48539/HBM489.GJJK.324'},
 {id:'prostate-acinus',kind:'svg',object:'2d-ftu/prostate-prostate-glandular-acinus/v1.3',file:'2d-ftu-prostate-prostate-glandular-acinus.svg',sha256:'426640309fdf8e092d0afd61ae8c2314d778c1385f8905d1cc0f5c3a9fa8e031',doi:'10.48539/HBM346.TQTN.357'},
].map(a=>({...a,url:cdn+a.object+'/assets/'+a.file,metadataUrl:raw+a.object+'/raw/metadata.yaml',crosswalkUrl:cdn+a.object+'/assets/crosswalk.csv'}));
export const crosswalkAliases={
 'Prostate_Gland_Microvascular_Endothelial_Cell_1':'Prostate_Gland_Microvascular_endothelial_Cell_1',
 'Prostate_Gland_Microvascular_Endothelial_Cell_2':'Prostate_Gland_Microvascular_endothelial_Cell_2',
 'Prostate_Gland_Microvascular_Endothelial_Cell_3':'Prostate_Gland_Microvascular_endothelial_Cell_3',
};
