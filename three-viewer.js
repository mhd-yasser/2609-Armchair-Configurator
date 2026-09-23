import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

// Small adapter for the configurator UI. Every visible finish is a real Three.js material.
export function createViewer(element){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(35,1,.01,1000);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.VSMShadowMap;
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
  light.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);
  light.shadow.bias=-.0001;light.shadow.normalBias=.003;
  light.shadow.intensity=.72;light.shadow.blurSamples=8;
  light.shadow.camera.near=.1;light.shadow.camera.far=100;
  light.shadow.radius=5;scene.add(light);
  // Studio fill lights illuminate the opposite faces without casting extra shadows.
  const fill=new THREE.DirectionalLight(0xe9f1ff,1.7);
  fill.position.set(5,5,-4);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffffff,.65);
  rim.position.set(1,7,5);scene.add(rim);
  const ambient=new THREE.HemisphereLight(0xffffff,0xd7dce2,1.15);scene.add(ambient);
  const lightingPresets={
    default:{key:3.2,fill:1.35,rim:.45,ambient:1.35,exposure:1.08,environment:.65,position:[-2,10,5],shadow:.65},
    studio:{key:4.4,fill:1.7,rim:.65,ambient:1.15,exposure:1.12,environment:.55,position:[-2.8,11,4],shadow:.72},
    cinematic:{key:4.1,fill:.95,rim:1.25,ambient:.85,exposure:1.03,environment:.4,position:[-3.5,10,3],shadow:.78}
  };
  let lightingMode='studio',shadowsEnabled=true;
  function applyLighting(){const p=lightingPresets[lightingMode];light.intensity=p.key;fill.intensity=p.fill;rim.intensity=p.rim;ambient.intensity=p.ambient;
    light.position.set(...p.position);light.shadow.intensity=p.shadow;light.castShadow=shadowsEnabled;
    renderer.toneMappingExposure=p.exposure;scene.environmentIntensity=p.environment;renderer.shadowMap.needsUpdate=true;
  }
  let object=null,ground=null,materialAdapters=[],radius=3,baseRadius=3,environmentUrl='',darkScene=false,measurementBoxes=null;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const moduleRoot=new URL('./',import.meta.url);
  const draco=new DRACOLoader();draco.setDecoderPath(new URL('vendor/addons/libs/draco/',moduleRoot).href);
  const ktx2=new KTX2Loader();ktx2.setTranscoderPath(new URL('vendor/addons/libs/basis/',moduleRoot).href);ktx2.detectSupport(renderer);
  const loader=new GLTFLoader();loader.setDRACOLoader(draco);loader.setKTX2Loader(ktx2);loader.setMeshoptDecoder(MeshoptDecoder);
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
    return {name:material.name,raw:material,pbrMetallicRoughness:pbr,setAlphaMode(mode){material.transparent=mode==='BLEND';material.needsUpdate=true;}};
  }
  function visibleBox(){return object?new THREE.Box3().setFromObject(object):new THREE.Box3();}
  function reframe(){
    if(!object)return;
    object.updateWorldMatrix(true,true);
    const box=visibleBox();if(box.isEmpty())return;
    const dim=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());controls.target.copy(center);
    radius=Math.max(dim.length()*1.78,1.25);baseRadius=radius;camera.near=Math.max(.01,radius/1000);camera.far=radius*30;camera.updateProjectionMatrix();face();
    if(ground){ground.position.y=box.min.y-.012;ground.scale.setScalar(Math.max(dim.x,dim.z)*1.65);}
  }
  async function setModel(url){
    element.dispatchEvent(new CustomEvent('progress',{detail:{totalProgress:0}}));
    try{
      const bytes=await fetch(url).then(r=>{if(!r.ok)throw new Error(`Model: ${r.status}`);return r.arrayBuffer();});
      const gltf=await new Promise((resolve,reject)=>loader.parse(bytes,'',resolve,reject));
      if(object)scene.remove(object);
      if(ground){scene.remove(ground);ground.geometry.dispose();ground.material.dispose();}
      object=gltf.scene;scene.add(object);
      object.updateWorldMatrix(true,true);
      const deskBox=new THREE.Box3(),cabinetBox=new THREE.Box3();
      object.traverse(node=>{if(!node.isMesh)return;const names=[node.material].flat().map(material=>material?.name);
        if(names.some(name=>['VREEL_desktop','VREEL_cabinet','VREEL_cabinet_fronts','VREEL_deskMetal','VREEL_frontPanel'].includes(name)))deskBox.expandByObject(node);
        if(names.some(name=>['VREEL_cabinet','VREEL_cabinet_fronts'].includes(name)))cabinetBox.expandByObject(node);
      });
      measurementBoxes={desk:deskBox.isEmpty()?new THREE.Box3().setFromObject(object):deskBox,cabinet:cabinetBox};
      const materials=new Map();
      object.traverse(node=>{if(!node.isMesh)return;node.castShadow=true;node.receiveShadow=true;
        for(const material of [node.material].flat())if(material)materials.set(material.name,material);
      });
      materialAdapters=[...materials.values()].map(wrapMaterial);
      const box=new THREE.Box3().setFromObject(object),dim=box.getSize(new THREE.Vector3());
      const center=box.getCenter(new THREE.Vector3());controls.target.copy(center);
      radius=Math.max(dim.length()*1.78,2);baseRadius=radius;camera.near=Math.max(.01,radius/1000);camera.far=radius*30;camera.updateProjectionMatrix();face();
      for(const studioLight of [light,fill,rim]){studioLight.target.position.copy(center);scene.add(studioLight.target);}
      const extent=Math.max(dim.x,dim.z)*1.65;
      light.shadow.camera.left=-extent;light.shadow.camera.right=extent;light.shadow.camera.top=extent;light.shadow.camera.bottom=-extent;light.shadow.camera.updateProjectionMatrix();
      const floorSize=extent*30;
      // One opaque floor receives the shadow directly; layered transparent planes
      // can produce overlapping patches and depth artifacts around the furniture.
      ground=new THREE.Mesh(new THREE.PlaneGeometry(floorSize,floorSize),new THREE.MeshStandardMaterial({color:darkScene?0x343d49:0xe9edf0,roughness:1,metalness:0}));
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
      const old=scene.environment;scene.environment=texture;scene.environmentIntensity=lightingPresets[lightingMode].environment;scene.environmentRotation.y=THREE.MathUtils.degToRad(25);
      if(old)old.dispose();
    },undefined,error=>console.warn('Studio environment unavailable',error));
  }
  function fromPoint(x,y){if(!object)return null;const rect=renderer.domElement.getBoundingClientRect();
    pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObject(object,true)[0];if(!hit)return null;
    const material=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex||0]:hit.object.material;
    const adapter=materialAdapters.find(m=>m.raw===material)||materialAdapters.find(m=>m.name===material?.name)||null;
    if(adapter)adapter.object=hit.object;
    return adapter;
  }
  let last=performance.now();
  function frame(now){requestAnimationFrame(frame);const delta=Math.min((now-last)/1000,.1);last=now;
    if(controls.autoRotate)controls.autoRotateSpeed=Math.max(.1,Number(element.dataset.rotationSpeed||40)/30);
    controls.update(delta);renderer.render(scene,camera);
  }requestAnimationFrame(frame);
  Object.defineProperties(element,{
    src:{set:setModel},
    model:{get:()=>object?{materials:materialAdapters,root:object}:null},
    environmentImage:{set:environment},
    exposure:{set:value=>renderer.toneMappingExposure=value},
    shadowIntensity:{set:value=>{shadowsEnabled=Number(value)>0;light.castShadow=shadowsEnabled;renderer.shadowMap.needsUpdate=true;}},
    lightingPreset:{set:value=>{if(!lightingPresets[value])return;lightingMode=value;applyLighting();},get:()=>lightingMode},
    sceneTheme:{set:value=>{darkScene=value==='dark';if(ground)ground.material.color.setHex(darkScene?0x343d49:0xe9edf0);}},
    shadowSoftness:{set:value=>{light.shadow.radius=Math.max(2.5,Number(value)*7);light.shadow.needsUpdate=true;}},
    cameraOrbit:{set(value){const [theta,phi,r]=value.split(' ');
      radius=r==='auto'?baseRadius:(parseFloat(r)||radius);
      const degrees=v=>v.endsWith('rad')?THREE.MathUtils.radToDeg(parseFloat(v)):parseFloat(v);
      face(degrees(theta),degrees(phi));}},
    cameraTarget:{set(value){if(value.startsWith('auto')&&object)controls.target.copy(visibleBox().getCenter(new THREE.Vector3()));}},
    fieldOfView:{set(){}},
  });
  element.getCameraOrbit=()=>{const v=camera.position.clone().sub(controls.target);return {theta:Math.atan2(v.x,v.z),phi:Math.acos(THREE.MathUtils.clamp(v.y/v.length(),-1,1)),radius:v.length()};};
  element.jumpCameraToGoal=()=>controls.update();
  element.materialFromPoint=fromPoint;
  element.createTexture=(url)=>new Promise((resolve,reject)=>textureLoader.load(url,texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;resolve(texture);},undefined,reject));
  element.requestUpdate=()=>renderer.render(scene,camera);
  element.reframe=reframe;
  element.findObjects=name=>{const matches=[];object?.traverse(node=>{if(node.name===name)matches.push(node);});return matches;};
  element.setObjectsVisible=(names,visible)=>{const wanted=new Set(names);object?.traverse(node=>{if(wanted.has(node.name))node.visible=visible;});reframe();};
  element.toDataURL=()=>{renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');};
  element.to4KDataURL=()=>{const width=3840,height=2160,oldSize=renderer.getSize(new THREE.Vector2()),oldRatio=renderer.getPixelRatio(),oldAspect=camera.aspect;
    try{renderer.setPixelRatio(1);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');}
    finally{renderer.setPixelRatio(oldRatio);renderer.setSize(oldSize.x,oldSize.y,false);camera.aspect=oldAspect;camera.updateProjectionMatrix();}}
  element.panView=direction=>{const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);const amount=radius*.08*direction;camera.position.addScaledVector(right,amount);controls.target.addScaledVector(right,amount);controls.update();};
  element.getDimensions=()=>{if(!object)return null;const box=new THREE.Box3().setFromObject(object),d=box.getSize(new THREE.Vector3());return {x:d.x*100,y:d.y*100,z:d.z*100,width:d.x,depth:d.z,height:d.y};};
  element.getMeasurementGuides=()=>{if(!measurementBoxes)return null;
    const project=(x,y,z)=>{const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x+1)*element.clientWidth/2,y:(1-p.y)*element.clientHeight/2};};
    const guides=[];
    for(const [part,box] of Object.entries(measurementBoxes)){if(box.isEmpty())continue;const d=box.getSize(new THREE.Vector3());
      const add=(axis,start,end,offset)=>guides.push({part,label:`${axis} ${Math.round((axis==='G'?d.x:axis==='D'?d.z:d.y)*100)} cm`,start:project(...start),end:project(...end),offset});
      add('G',[box.min.x,box.min.y,box.max.z],[box.max.x,box.min.y,box.max.z],{x:0,y:part==='desk'?32:16});
      add('D',[box.min.x,box.min.y,box.min.z],[box.min.x,box.min.y,box.max.z],{x:part==='desk'?-24:-15,y:8});
      add('Y',[box.max.x,box.min.y,box.max.z],[box.max.x,box.max.y,box.max.z],{x:part==='desk'?29:18,y:0});
    }return guides;};
  element.setRotationSpeed=value=>{element.dataset.rotationSpeed=value;};
  element.setAutoRotate=value=>{controls.autoRotate=value;};
  return element;
}
