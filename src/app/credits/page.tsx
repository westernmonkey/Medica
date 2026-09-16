/** MIT page. Source models retain CC-BY-SA / CC-BY and the inherited notices below. */
import type {Metadata} from 'next';
import Link from 'next/link';
import styles from './credits.module.css';
export const metadata:Metadata={title:'Credits & licenses | Medica',description:'Anatomy sources, open-source software, licenses and model adaptations used by Medica.'};
const sources=[
 {credit:'Z-Anatomy - The libre 3D atlas of anatomy - CC-BY-SA 4.0',source:'https://github.com/Z-Anatomy/Models-of-human-anatomy',license:'https://creativecommons.org/licenses/by-sa/4.0/'},
 {credit:'BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan',source:'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html',license:'https://creativecommons.org/licenses/by-sa/2.1/jp/'},
 {credit:'Cranial Nerves and Foramina - by University of Dundee, CAHID - CC-BY 4.0',source:'https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/b9c9f98066e1e786814603b047c5bd3638c2a864/License.txt',license:'https://creativecommons.org/licenses/by/4.0/'},
 {credit:'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International',source:'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html',license:'https://creativecommons.org/licenses/by/4.0/'},
];
export default function CreditsPage(){return <div className={styles.page}><div className={styles.content}>
 <Link href="/anatomy-final" className={styles.back}>← Back to anatomy atlas</Link>
 <p className={styles.eyebrow}>THE PEOPLE & PROJECTS BEHIND MEDICA</p><h1>Credits &amp; licenses</h1><p className={styles.intro}>Open anatomy, shared knowledge. These are the sources and tools behind our anatomy atlas.</p>
 <section className={styles.card}><h2>Anatomy sources</h2><ul className={styles.sources}>{sources.map(s=><li key={s.credit}><p>{s.credit}</p><div><a href={s.source}>Source ↗</a><a href={s.license}>License ↗</a></div></li>)}</ul></section>
 <section className={styles.card}><h2>Our adaptations</h2><p>Converted, registered, recolored and simplified; noncommercial/uncleared regions excluded.</p><p>Original source coordinates, names and attribution are retained. Regional detail uses unsimplified source geometry with compression. Decorative muscle shading is not validated fibre orientation. Anatomical review is pending.</p><p>Adapted Z-Anatomy models retain CC-BY-SA 4.0 and inherited notices. Direct BodyParts3D components retain CC-BY 4.0. The viewer code is MIT licensed.</p><div className={styles.links}><a href="/anatomy-final/downloads.html">Models &amp; adaptations ↗</a><a href="/anatomy-final/provenance.json">Source versions &amp; provenance ↗</a><a href="/anatomy-final/coverage.json">Coverage &amp; exclusions ↗</a></div></section>
 <section className={styles.card}><h2>Software &amp; typography</h2><p>Viewer · Three.js · React · Next.js · glTF-Transform · meshoptimizer: MIT</p><p>Draco: Apache-2.0 · Site icons: ISC · Poppins: OFL</p><p>Three.js includes OrbitControls, GLTFLoader, the DRACOLoader wrapper, BufferGeometryUtils and RoomEnvironment. The Draco codec has its separate Apache-2.0 license.</p><div className={styles.links}><a href="/anatomy-final/credits.txt">Full credits &amp; licenses ↗</a><a href="/anatomy-final/licenses/Z-Anatomy-inherited-notices.txt">Inherited author notices ↗</a><a href="/anatomy-final/licenses/Medica-MIT.txt">Viewer license ↗</a></div></section>
 </div></div>;}
