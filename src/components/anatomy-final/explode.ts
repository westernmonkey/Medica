/** MIT selection lookup; named anatomy ranges retain source CC licenses. */
import type { LoadedSystem } from './types';

export function partAtTriangle(system: LoadedSystem, triangle: number) {
  const index=triangle*3;
  return system.parts.find(part=>index>=part.indexStart && index<part.indexStart+part.indexCount);
}
