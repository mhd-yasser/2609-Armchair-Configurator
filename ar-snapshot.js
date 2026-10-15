import * as THREE from './vendor/three.module.js';
export function snapshotProduct(root,ar=false){
  // Clone only visible branches. Preserve local transforms and the current animated pose.
  const copy=node=>{
    if(!node.visible||ar&&node.userData.excludeAR)return null;
    let result;
    if(node.isInstancedMesh){
      result=new THREE.Group();THREE.Object3D.prototype.copy.call(result,node,false);
      for(let i=0;i<node.count;i++){let materials=node.material;if(node.instanceColor){const color=new THREE.Color();node.getColorAt(i,color);materials=[materials].flat().map(m=>{const clone=m.clone();clone.color?.multiply(color);return clone;});if(!Array.isArray(node.material))materials=materials[0];}const mesh=new THREE.Mesh(node.geometry,materials);node.getMatrixAt(i,mesh.matrix);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);result.add(mesh);}
    }else if(node.isSkinnedMesh||node.morphTargetInfluences){
      node.skeleton?.update();const geometry=node.geometry.clone(),position=geometry.attributes.position,vertex=new THREE.Vector3();
      for(let i=0;i<position.count;i++){node.getVertexPosition(i,vertex);position.setXYZ(i,vertex.x,vertex.y,vertex.z);}geometry.morphAttributes={};geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.computeVertexNormals();geometry.computeBoundingBox();
      result=new THREE.Mesh(geometry,node.material);THREE.Object3D.prototype.copy.call(result,node,false);
    }else result=node.clone(false);
    result.userData={};
    for(const child of node.children){const c=copy(child);if(c)result.add(c);}
    return result;
  };
  root.updateMatrixWorld(true);return copy(root);
}
