/** MIT tests; Three.js and TypeScript MIT; exercise transformations of CC-BY-4.0 anatomy geometry. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const {BufferGeometry,BufferAttribute,Mesh,MeshStandardMaterial,Vector3,Box3}=require('three');
const moduleUnderTest={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('src/components/anatomy-final/explode.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(require,moduleUnderTest,moduleUnderTest.exports);
const {applyExplode,interpolateExplode,partAtTriangle}=moduleUnderTest.exports;
function fixture(){
 const rest=new Float32Array([-2,0,0,-1,0,0,-2,1,0,1,0,0,2,0,0,1,1,0]);
 const geometry=new BufferGeometry().setAttribute('position',new BufferAttribute(rest.slice(),3)).setIndex([0,1,2,3,4,5]);
 const parts=[{id:'left',vertexStart:0,vertexCount:3,indexStart:0,indexCount:3,center:new Vector3(-1.5,.5,0),bounds:new Box3(new Vector3(-2,0,0),new Vector3(-1,1,0))},{id:'right',vertexStart:3,vertexCount:3,indexStart:3,indexCount:3,center:new Vector3(1.5,.5,0),bounds:new Box3(new Vector3(1,0,0),new Vector3(2,1,0))}];
 return {rest,parts,mesh:new Mesh(geometry,new MeshStandardMaterial())};
}
test('explode uses immutable rest positions, returns exactly, and keeps all displaced vertices inside system bounds',()=>{
 const system=fixture();
 for(let pass=0;pass<10;pass++){
  applyExplode(system,1);const positions=system.mesh.geometry.getAttribute('position');
  assert.equal(positions.getX(0),-3.5);assert.equal(positions.getX(3),2.5);
  for(let i=0;i<positions.count;i++){const p=new Vector3().fromBufferAttribute(positions,i);assert(system.mesh.geometry.boundingBox.containsPoint(p));assert(p.distanceTo(system.mesh.geometry.boundingSphere.center)<=system.mesh.geometry.boundingSphere.radius+1e-6);}
  applyExplode(system,0);assert.deepEqual(positions.array,system.rest);
 }
 system.mesh.geometry.dispose();system.mesh.material.dispose();
});
test('triangle selection respects decoded index ranges and does not leak into neighboring parts',()=>{
 const system=fixture();assert.equal(partAtTriangle(system,0).id,'left');assert.equal(partAtTriangle(system,1).id,'right');assert.equal(partAtTriangle(system,2),undefined);
 system.mesh.geometry.dispose();system.mesh.material.dispose();
});
test('clock interpolation is time based, reduced motion is immediate, and eventually settles',()=>{
 let a=0,b=0;for(let i=0;i<15;i++)a=interpolateExplode(a,1,1/60,false);for(let i=0;i<10;i++)b=interpolateExplode(b,1,1/40,false);
 assert(Math.abs(a-b)<1e-10);assert.equal(interpolateExplode(.2,1,.001,true),1);
 for(let i=0;i<120;i++)a=interpolateExplode(a,1,1/60,false);assert.equal(a,1);
});
