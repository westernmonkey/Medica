/** MIT procedural surface styling. Geometry/material boundaries retain their source CC licenses. */
import {DoubleSide,MeshStandardMaterial} from 'three';
export function anatomyMaterial(system:string){
 const material=new MeshStandardMaterial({vertexColors:true,roughness:system==='integumentary'?.76:system==='skeletal'?.66:.58,metalness:0,side:DoubleSide});
 if(system==='muscular'){
  material.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vAnatomyPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvAnatomyPosition = position;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vAnatomyPosition;').replace('#include <color_fragment>',`#include <color_fragment>
    float muscleMask = smoothstep(0.10, 0.25, diffuseColor.r - diffuseColor.g);
    float grain = sin(vAnatomyPosition.y * 1900.0 + sin(vAnatomyPosition.x * 160.0) * 1.6);
    float filteredGrain = grain * (1.0 - smoothstep(0.3, 1.0, fwidth(vAnatomyPosition.y * 1900.0)));
    diffuseColor.rgb *= 1.0 + muscleMask * filteredGrain * 0.035;`);
  };
  material.customProgramCacheKey=()=> 'medica-muscle-finish-v1';
 }
 return material;
}
