/** MIT code; transforms BodyParts3D CC-BY-4.0 geometry using Three.js MIT. */
import { Vector3 } from 'three';
import type { LoadedSystem } from './types';

export function interpolateExplode(current: number, target: number, delta: number, reduced: boolean) {
  if (reduced || Math.abs(target-current) < .0005) return target;
  return current + (target-current) * (1-Math.exp(-18*Math.min(delta,.05)));
}

export function applyExplode(system: LoadedSystem, amount: number) {
  const positions=system.mesh.geometry.getAttribute('position');
  const offset=new Vector3();
  for (const part of system.parts) {
    offset.copy(part.center).multiplyScalar(amount);
    for(let v=part.vertexStart;v<part.vertexStart+part.vertexCount;v++) {
      const i=v*3;
      positions.setXYZ(v,system.rest[i]+offset.x,system.rest[i+1]+offset.y,system.rest[i+2]+offset.z);
    }
  }
  positions.needsUpdate=true;
  // One culling volume per system, including every translated part.
  system.mesh.geometry.computeBoundingBox();
  system.mesh.geometry.computeBoundingSphere();
}

export function partAtTriangle(system: LoadedSystem, triangle: number) {
  const index=triangle*3;
  return system.parts.find(part=>index>=part.indexStart && index<part.indexStart+part.indexCount);
}
