/** SPDX-License-Identifier: MIT. Original teaching text cites HRA/NIDDK research; imported media is CC-BY-4.0. */
import type {OrganId} from './catalog';
export const references={
 kidney:['https://www.niddk.nih.gov/health-information/kidney-disease/kidneys-how-they-work','https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1006108'],
 prostate:['https://www.niddk.nih.gov/health-information/urologic-diseases/prostate-problems','https://pubmed.ncbi.nlm.nih.gov/7279811/','https://pmc.ncbi.nlm.nih.gov/articles/PMC6411034/'],
};
export const steps:Record<OrganId,Array<{title:string;body:string}>>={
 kidney:[
  {title:'Blood arrives',body:'Blood reaches a renal corpuscle through its incoming arteriole.'},
  {title:'Filtration begins',body:'Fluid and small dissolved substances enter the capsular space. Blood cells and most large proteins remain in circulation.'},
  {title:'Useful material returns',body:'The tubule returns much of the filtered water and needed dissolved substances to surrounding blood.'},
  {title:'Selected substances enter',body:'Tubular secretion transfers selected substances from blood into tubular fluid.'},
  {title:'Final fluid adjusts',body:'Later tubular and collecting segments adjust the fluid that will become urine.'},
  {title:'Urine leaves',body:'Urine passes through papillary collecting pathways, calyces, the renal pelvis, and the ureter.'},
 ],
 prostate:[
  {title:'Secretory cells',body:'Luminal epithelial cells line the glandular acinus and contribute components of prostatic fluid.'},
  {title:'Acinar lumen',body:'Their secretions enter the acinar lumen. This is a teaching diagram, not a measured fluid simulation.'},
  {title:'Prostatic ducts',body:'Fluid travels from glandular spaces through prostatic ducts toward the urethra.'},
  {title:'Smooth muscle',body:'Smooth muscle helps move glandular contents during emission and ejaculation.'},
  {title:'Contribution to semen',body:'Prostatic fluid joins contributions from the testes and other glands. The prostate does not produce sperm.'},
 ],
};
export const descriptions:Record<string,string>={
 'Capsule':'Fibrous outer covering of the kidney. Hide it to inspect source-model structures underneath.',
 'Outer cortex':'Outer kidney region containing much of the renal corpuscle and tubular anatomy at a smaller scale.',
 'Renal columns':'Cortical tissue extending between medullary pyramids.',
 'Renal pyramids':'Medullary regions that lead toward renal papillae. Source instances are grouped under one named structure.',
 'Renal papillae':'Papillary tips where urine reaches the collecting pathway. The kidney release notes and node inventory differ; inspect both before treating boundaries as definitive.',
 'Hilum':'Surface landmark where collecting structures and vessels relate to the kidney.',
 'Minor calyces':'First source-model collecting cups receiving urine near papillary tips.',
 'Major calyces':'Larger collecting branches that unite toward the renal pelvis.',
 'Renal pelvis':'Funnel-shaped collecting region continuing into the ureter.',
 'Ureter':'Muscular tube carrying urine toward the bladder.',
 'Peripheral zone':'Glandular region around much of the posterior and lateral prostate.',
 'Central zone':'Glandular region associated with the ejaculatory-duct course near the base.',
 'Transition zone':'Glandular region close to the prostatic urethral course. The urethra itself is not a separate source mesh in this lesson.',
 'Anterior fibromuscular stroma':'Fibrous and muscular anterior tissue; it is not another secretory glandular zone.',
 'Prostatic ducts':'Source-model ducts carrying glandular fluid toward the urethra.',
 'Ejaculatory duct':'Source geometry showing the duct relationship in the prostate assembly.',
 'Prostatic utricle':'Small source-model midline structure opening near the seminal colliculus.',
 'Seminal colliculus':'Surface landmark in the prostatic urethral region, also called the verumontanum.',
 'Apex':'Inferior tip landmark of the prostate.',
 'Base':'Superior part of the prostate nearest the bladder.',
 'Seminal vesicle':'Source context geometry; this gland contributes fluid to semen separately from the prostate.',
 'Deferent ducts':'Source context geometry carrying sperm toward the ejaculatory pathway.',
};
