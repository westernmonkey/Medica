/** MIT page code; Z-Anatomy CC-BY-SA and BodyParts3D CC-BY assets; viewer dependency notices are displayed persistently. */
import type { Metadata } from 'next';
import AnatomyExplorer from '@/components/anatomy-final/ui';
export const metadata:Metadata={title:'Anatomy Atlas | Medica',description:'Explore eleven male gross-anatomy systems, inspect regional detail, and browse a grouped study board. Anatomical review pending.'};
export default function AnatomyFinalPage(){return <AnatomyExplorer/>;}
