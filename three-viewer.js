import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';

// Small adapter for the configurator UI. Every visible finish is a real Three.js material.
export function createViewer(element){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(35,1,.01,1000);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const mobile=matchMedia('(max-width:700px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.5:2));
  renderer.domElement.setAttribute('aria-label',element.getAttribute('aria-label')||'3D ürün görünümü');
  element.append(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.08;
  controls.minPolarAngle=.1;controls.maxPolarAngle=Math.PI/2;
  controls.autoRotateSpeed=1.3;
  // A high key light keeps the floor shadow close to the furniture.
  const light=new THREE.DirectionalLight(0xfff8ef,4.4);
  light.position.set(-2.8,11,4);light.castShadow=true;
  light.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);light.shadow.bias=-.0003;
  light.shadow.camera.near=.1;light.shadow.camera.far=100;
  light.shadow.radius=4;scene.add(light);
  // Studio fill lights illuminate the opposite faces without casting extra shadows.
  const fill=new THREE.DirectionalLight(0xe9f1ff,1.7);
  fill.position.set(5,5,-4);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffffff,.65);
  rim.position.set(1,7,5);scene.add(rim);
  const ambient=new THREE.HemisphereLight(0xffffff,0xd7dce2,1.15);scene.add(ambient);
  let object=null,ground=null,materialAdapters=[],radius=3,baseRadius=3,environmentUrl='';
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const draco=new DRACOLoader();draco.setDecoderPath('vendor/addons/libs/draco/');
  const loader=new GLTFLoader();loader.setDRACOLoader(draco);
  const textureLoader=new THREE.TextureLoader();

  function size(){const w=Math.max(1,element.clientWidth),h=Math.max(1,element.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
  new ResizeObserver(size).observe(element);size();
  function face(theta=35,phi=66){const t=THREE.MathUtils.degToRad(theta),p=THREE.MathUtils.degToRad(phi);camera.position.copy(controls.target).add(new THREE.Vector3(radius*Math.sin(p)*Math.sin(t),radius*Math.cos(p),radius*Math.sin(p)*Math.cos(t)));controls.update();}
  function wrapMaterial(material){
    const pbr={
      baseColorTexture:{get texture(){return material.map||null;},setTexture(texture){material.map=texture;material.needsUpdate=true;}},
      get baseColorFactor(){return [material.color.r,material.color.g,material.color.b,material.opacity];},
      get metallicFactor(){return material.metalness??0;},
      get roughnessFactor(){return material.roughness??1;},
      setBaseColorFactor(f){material.color.setRGB(f[0],f[1],f[2]);material.opacity=f[3]??1;material.needsUpdate=true;},
      setMetallicFactor(v){material.metalness=v;material.needsUpdate=true;},
      setRoughnessFactor(v){material.roughness=v;material.needsUpdate=true;}
    };
    return {name:material.name,pbrMetallicRoughness:pbr,setAlphaMode(mode){material.transparent=mode==='BLEND';material.needsUpdate=true;}};
  }
  async function setModel(url){
    element.dispatchEvent(new CustomEvent('progress',{detail:{totalProgress:0}}));
    try{
      const bytes=await fetch(url).then(r=>{if(!r.ok)throw new Error(`Model: ${r.status}`);return r.arrayBuffer();});
      const gltf=await new Promise((resolve,reject)=>loader.parse(bytes,'',resolve,reject));
      if(object)scene.remove(object);if(ground)scene.remove(ground);
      object=gltf.scene;scene.add(object);
      const materials=new Map();
      object.traverse(node=>{if(!node.isMesh)return;node.castShadow=true;node.receiveShadow=true;
        for(const material of [node.material].flat())if(material)materials.set(material.name,material);
      });
      materialAdapters=[...materials.values()].map(wrapMaterial);
      const box=new THREE.Box3().setFromObject(object),dim=box.getSize(new THREE.Vector3());
      const center=box.getCenter(new THREE.Vector3());controls.target.copy(center);
      radius=Math.max(dim.length()*1.28,2);baseRadius=radius;camera.near=Math.max(.01,radius/1000);camera.far=radius*30;camera.updateProjectionMatrix();face();
      for(const studioLight of [light,fill,rim]){studioLight.target.position.copy(center);scene.add(studioLight.target);}
      const extent=Math.max(dim.x,dim.z)*1.65;
      light.shadow.camera.left=-extent;light.shadow.camera.right=extent;light.shadow.camera.top=extent;light.shadow.camera.bottom=-extent;light.shadow.camera.updateProjectionMatrix();
      ground=new THREE.Mesh(new THREE.PlaneGeometry(extent*3,extent*3),new THREE.ShadowMaterial({opacity:.14}));
      ground.rotation.x=-Math.PI/2;ground.position.y=box.min.y-.012;ground.receiveShadow=true;scene.add(ground);
      element.dispatchEvent(new CustomEvent('progress',{detail:{totalProgress:1}}));
      element.dispatchEvent(new Event('load'));
    }catch(err){console.error(err);element.dispatchEvent(new Event('error'));}
  }
  function environment(url){
    if(!url||url===environmentUrl)return;environmentUrl=url;
    new RGBELoader().load(url,texture=>{
      if(url!==environmentUrl){texture.dispose();return;}
      texture.mapping=THREE.EquirectangularReflectionMapping;
      const old=scene.environment;scene.environment=texture;scene.environmentIntensity=.55;scene.environmentRotation.y=THREE.MathUtils.degToRad(25);
      if(old)old.dispose();
    },undefined,error=>console.warn('Studio environment unavailable',error));
  }
  function fromPoint(x,y){if(!object)return null;const rect=renderer.domElement.getBoundingClientRect();
    pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObject(object,true)[0];if(!hit)return null;
    const material=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex||0]:hit.object.material;
    return materialAdapters.find(m=>m.name===material?.name)||null;
  }
  let last=performance.now();
  function frame(now){requestAnimationFrame(frame);const delta=Math.min((now-last)/1000,.1);last=now;
    if(controls.autoRotate)controls.autoRotateSpeed=Math.max(.1,Number(element.dataset.rotationSpeed||40)/30);
    controls.update(delta);renderer.render(scene,camera);
  }requestAnimationFrame(frame);
  Object.defineProperties(element,{
    src:{set:setModel},
    model:{get:()=>object?{materials:materialAdapters}:null},
    environmentImage:{set:environment},
    exposure:{set:value=>renderer.toneMappingExposure=value},
    shadowIntensity:{set:value=>{light.castShadow=Number(value)>0;if(ground)ground.visible=Number(value)>0;renderer.shadowMap.needsUpdate=true;}},
    shadowSoftness:{set:value=>{light.shadow.radius=Math.max(1,Number(value)*4);light.shadow.needsUpdate=true;}},
    cameraOrbit:{set(value){const [theta,phi,r]=value.split(' ');
      radius=r==='auto'?baseRadius:(parseFloat(r)||radius);
      const degrees=v=>v.endsWith('rad')?THREE.MathUtils.radToDeg(parseFloat(v)):parseFloat(v);
      face(degrees(theta),degrees(phi));}},
    cameraTarget:{set(value){if(value==='auto'&&object)controls.target.copy(new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()));}},
    fieldOfView:{set(){}},
  });
  element.getCameraOrbit=()=>{const v=camera.position.clone().sub(controls.target);return {theta:Math.atan2(v.x,v.z),phi:Math.acos(THREE.MathUtils.clamp(v.y/v.length(),-1,1)),radius:v.length()};};
  element.jumpCameraToGoal=()=>controls.update();
  element.materialFromPoint=fromPoint;
  element.createTexture=(url)=>new Promise((resolve,reject)=>textureLoader.load(url,texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;resolve(texture);},undefined,reject));
  element.requestUpdate=()=>renderer.render(scene,camera);
  element.toDataURL=()=>{renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');};
  element.setRotationSpeed=value=>{element.dataset.rotationSpeed=value;};
  element.setAutoRotate=value=>{controls.autoRotate=value;};
  return element;
}
