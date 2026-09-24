import * as THREE from 'three';
import {createViewer} from './three-viewer.js';

const page=document.body.dataset.product;
const viewer=createViewer(document.querySelector('#product-viewer'));
const ui={groups:document.querySelector('#material-groups'),details:document.querySelector('#material-details'),selection:document.querySelector('#selection'),notice:document.querySelector('#notice'),wheel:document.querySelector('#material-wheel'),wheelOptions:document.querySelector('#wheel-options')};
const asset=(path)=>new URL(path,import.meta.url).href;

const leather=[
  {id:'black-matte',label:'Siyah · Yarı Mat',image:asset('sofa/assets/black.webp'),roughness:.72,leather:true},
  {id:'black-glossy',label:'Siyah · ⅔ Parlak',image:asset('sofa/assets/black.webp'),roughness:.54,leather:true},
  {id:'brown-matte',label:'Koyu Kahverengi · Yarı Mat',image:asset('sofa/assets/brown.webp'),roughness:.72,leather:true},
  {id:'brown-glossy',label:'Koyu Kahverengi · ⅔ Parlak',image:asset('sofa/assets/brown.webp'),roughness:.54,leather:true},
  {id:'burgundy-matte',label:'Bordo · Yarı Mat',image:asset('sofa/assets/burgundy.webp'),roughness:.72,leather:true},
  {id:'burgundy-glossy',label:'Bordo · ⅔ Parlak',image:asset('sofa/assets/burgundy.webp'),roughness:.54,leather:true},
];
const wood=[
  {id:'original',label:'Mevcut Ahşap',original:true,color:'#966f50'},
  ...[['oak-imbir','Meşe · Imbir'],['oak-nefrit','Meşe · Nefrit'],['oak-qvarz','Meşe · Qvarz'],['oak-marrakesh','Meşe · Marrakesh'],['oak-muskat','Meşe · Muskat'],['walnut-american','Amerikan Ceviz']].map(([id,label])=>({id,label,image:asset(`textures/wood/${id}.webp`),roughness:.78,factor:[1,1,1],wood:true})),
];
const solids=[
  {id:'white',label:'Düz Beyaz · Yarı Mat',color:'#eeeae1',factor:[.86,.84,.8],roughness:.38},
  {id:'anthracite',label:'Antrasit · Yarı Mat',color:'#34383d',factor:[.035,.041,.048],roughness:.38},
];
const metal=[
  {id:'black',label:'Siyah Boyalı · Mat',color:'#171a1e',factor:[.018,.022,.027],metalness:.35,roughness:.78},
  {id:'white',label:'Beyaz Boyalı · Mat',color:'#ecebe7',factor:[.84,.83,.79],metalness:.18,roughness:.78},
  {id:'bronze',label:'Bronz · Yarı Parlak',color:'#8d6949',factor:[.33,.19,.095],metalness:1,roughness:.32},
  {id:'gold',label:'Altın · Yarı Parlak',color:'#c9a34b',factor:[.73,.48,.13],metalness:1,roughness:.3},
  {id:'chrome',label:'Krom · Parlak',color:'#dce4e8',factor:[.78,.84,.88],metalness:1,roughness:.07},
  {id:'chrome-matte',label:'Krom · Mat',color:'#bec5c8',factor:[.58,.63,.65],metalness:1,roughness:.46},
];
const glass=[
  {id:'smoked-black',label:'Siyah Füme Cam',color:'#1b2027',factor:[.02,.025,.035],metalness:.05,roughness:.48,glass:true,opacity:.68},
  {id:'frosted-clear',label:'Şeffaf Buzlu Cam',color:'#d9e1e3',factor:[.62,.72,.74],metalness:0,roughness:.72,glass:true,opacity:.48},
];

const materialName=(material)=>material.userData.vreelOriginalName||material.name;
const group=(label,materials,options,initial,target=()=>true)=>({label,materials,options,initial,target});
const configs={
  sofa:{title:'Lounge Duo',file:asset('sofa/model/Sofa.glb'),download:'VREEL_Lounge_Duo.glb',groups:{leather:group('Deri Yüzeyi',['Sofa_Fills_Leather_Black'],leather,'black-matte')}},
  chair:{title:'Aura Yönetici Koltuğu',file:asset('chair/model/Chair.glb'),download:'VREEL_Aura_Yonetici_Koltugu.glb',groups:{
    leather:group('Deri Yüzeyi',['Material__2147483027'],leather,'black-matte'),
    wood:group('Ahşap Detay',['WD'],wood,'original'),
    metal:group('Metal Detay',['MetalBlackMatte'],metal,'black'),
  }},
  desk:{title:'Axis Executive Desk',file:asset('desk/model/Desk.glb'),download:'VREEL_Axis_Executive_Desk.glb',groups:{
    desktop:group('Masa Üstü ve Ahşap Ayaklar',['Material__2147483063'],[...wood,...solids],'original',node=>/^Top/.test(node.name)||/^Leg/.test(node.name)),
    cabinet:group('Keson Gövdesi',['Material__2147482989'],wood,'original',node=>node.name==='KesonUnitBody'),
    cabinetFace:group('Keson Kapakları',['MDFBlack'],[...wood,...solids],'anthracite',node=>node.name==='KesonUnitFaces'),
    frontPanel:group('Ön Panel',['Material__2147482989'],[...wood.filter(option=>!option.original),...solids,...glass],'frosted-clear',node=>node.name.startsWith('FrontPanel')),
    metal:group('Metal Ayaklar',['MetalBlackMatte'],metal,'black'),
  }},
};
const config=configs[page];
const state=Object.fromEntries(Object.entries(config.groups).map(([key,value])=>[key,value.initial]));
const textures=new Map();let modelBlob=null,pointerStart=null,wheelGroup=null,wheelObject=null,wheelPage=0,pdfDocument=null;
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const choice=(key,id=state[key])=>config.groups[key].options.find(option=>option.id===id);
const swatch=option=>option.image?`background-image:url('${option.image}')`:`background-color:${option.color}`;

function isolateMaterials(){viewer.model.root.traverse(node=>{if(!node.isMesh)return;const list=[node.material].flat().map(material=>{
  const clone=material.clone();clone.name=material.name;clone.userData.vreelOriginalName=material.name;clone.userData.vreelOriginal={map:material.map,color:material.color.clone(),metalness:material.metalness,roughness:material.roughness,transparent:material.transparent,opacity:material.opacity,depthWrite:material.depthWrite,roughnessMap:material.roughnessMap,metalnessMap:material.metalnessMap,normalMap:material.normalMap,bumpMap:material.bumpMap,bumpScale:material.bumpScale,side:material.side,transmission:material.transmission,thickness:material.thickness,alphaMap:material.alphaMap};return clone;
});node.material=Array.isArray(node.material)?list:list[0];});}
async function loadTexture(url,original,color=false){if(!textures.has(url))textures.set(url,viewer.createTexture(url));const base=await textures.get(url),texture=base.clone();texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;if(original?.map){texture.channel=original.map.channel;texture.offset.copy(original.map.offset);texture.repeat.copy(original.map.repeat);texture.center.copy(original.map.center);texture.rotation=original.map.rotation;texture.wrapS=original.map.wrapS;texture.wrapT=original.map.wrapT;}texture.needsUpdate=true;return texture;}
function alignMaps(material,option,maps){if(!option.wood)return;for(const map of maps){if(!map)continue;map.wrapS=map.wrapT=THREE.RepeatWrapping;if(page==='desk'&&(material.userData.deskTopProjection||material.userData.frontPanelProjection)){map.offset.set(0,0);map.repeat.set(1,1);map.rotation=0;}else{map.repeat.multiplyScalar(page==='chair'?4:2);}map.needsUpdate=true;}}
function semanticNode(node){for(let n=node;n;n=n.parent)if(n.userData.sourceName)return n;return node;}
function targetMaterials(node,key){const spec=config.groups[key];if(!node.isMesh||!spec.target(semanticNode(node)))return[];return [node.material].flat().filter(material=>key==='frontPanel'&&page==='desk'||spec.materials.includes(materialName(material)));}
async function paint(node,key,option){for(const material of targetMaterials(node,key)){const original=material.userData.vreelOriginal;const revision=(material.userData.paintRevision||0)+1;material.userData.paintRevision=revision;if(option.original){material.map=original.map;material.color.copy(original.color);material.metalness=original.metalness;material.roughness=original.roughness;material.transparent=original.transparent;material.opacity=original.opacity;material.depthWrite=original.depthWrite;material.transmission=original.transmission??0;material.thickness=original.thickness??0;material.alphaMap=original.alphaMap;material.roughnessMap=original.roughnessMap;material.bumpMap=original.bumpMap;material.bumpScale=original.bumpScale;material.side=original.side;material.metalnessMap=original.metalnessMap;material.normalMap=original.normalMap;}else{const [nextMap,roughMap,bumpMap,normalMap]=await Promise.all([option.image?loadTexture(option.image,original,true):null,option.wood||option.leather?loadTexture(asset(`textures/pbr/${option.wood?option.id:'leather'}-gloss.webp`),original):null,option.wood?loadTexture(asset(`textures/pbr/${option.id}-bump.webp`),original):null,option.leather?loadTexture(asset('textures/pbr/leather-normal.webp'),original):null]);if(material.userData.paintRevision!==revision)return;material.map=nextMap;material.roughnessMap=roughMap;material.metalnessMap=null;material.normalMap=normalMap;material.normalScale.set(.3,.3);material.bumpMap=bumpMap;material.bumpScale=bumpMap?.012:0;material.side=option.glass?THREE.DoubleSide:original.side;alignMaps(material,option,[nextMap,roughMap,bumpMap]);material.color.setRGB(...(option.factor||[1,1,1]));material.metalness=option.metalness??0;material.roughness=option.roughness??.55;material.transparent=Boolean(option.glass);material.opacity=option.opacity??1;material.depthWrite=!option.glass;if(key==='frontPanel'){material.transmission=option.glass?(original.transmission??0):0;material.thickness=option.glass?(original.thickness??0):0;material.alphaMap=option.glass?original.alphaMap:null;if(!option.glass){material.opacity=1;material.transparent=false;material.depthWrite=true;}}}material.userData.finishId=option.id;material.needsUpdate=true;}}
async function applyGroup(key,option=choice(key),single=null){const jobs=[];(single?[single]:[viewer.model.root]).forEach(root=>root.traverse?root.traverse(node=>jobs.push(paint(node,key,option))):jobs.push(paint(root,key,option)));await Promise.all(jobs);viewer.requestUpdate();}
function buildMaterials(){ui.groups.replaceChildren();ui.details.replaceChildren();for(const [key,spec] of Object.entries(config.groups)){const card=document.createElement('details');card.className='option-card';card.dataset.group=key;card.open=key===Object.keys(config.groups)[0];card.innerHTML=`<summary><span>${esc(spec.label)}</span><b data-summary="${key}"></b></summary><div class="option-body swatches">${spec.options.map(option=>`<button type="button" class="swatch" data-material="${key}" data-value="${option.id}" aria-label="${esc(option.label)}"><i style="${swatch(option)}"></i><span>${esc(option.label)}</span></button>`).join('')}</div>`;ui.groups.append(card);const row=document.createElement('div');row.innerHTML=`<dt>${esc(spec.label)}</dt><dd data-detail="${key}"></dd>`;ui.details.append(row);}ui.groups.addEventListener('click',event=>{const button=event.target.closest('[data-material]');if(button)select(button.dataset.material,button.dataset.value);});updateText();}
function updateText(){ui.selection.textContent=Object.entries(config.groups).map(([key,spec])=>`${spec.label}: ${choice(key).label}`).join(' · ');for(const key of Object.keys(config.groups)){document.querySelectorAll(`[data-summary="${key}"],[data-detail="${key}"]`).forEach(node=>node.textContent=choice(key).label);document.querySelectorAll(`[data-material="${key}"]`).forEach(node=>node.classList.toggle('active',node.dataset.value===state[key]));}}
function select(key,id){state[key]=id;updateText();applyGroup(key);if(wheelGroup===key)renderWheel();}

function addVariantCard(title,options,initial,onChange){const card=document.createElement('details');card.className='option-card';card.open=true;card.innerHTML=`<summary><span>${title}</span><b>${options.find(x=>x.id===initial).label}</b></summary><div class="option-body variant-options">${options.map(x=>`<button type="button" data-variant="${x.id}" class="${x.id===initial?'active':''}">${x.label}</button>`).join('')}</div>`;ui.groups.prepend(card);card.addEventListener('click',event=>{const button=event.target.closest('[data-variant]');if(!button)return;card.querySelectorAll('[data-variant]').forEach(x=>x.classList.toggle('active',x===button));card.querySelector('summary b').textContent=options.find(x=>x.id===button.dataset.variant).label;onChange(button.dataset.variant);});return card;}
let resetConfiguration=()=>{};
function setupSofa(){
  const nodes=viewer.model.nodes;
  // Original GLB node IDs: every unit includes its multi-material body and pillow.
  const units=[[11,13,9],[5,7],[1,3]].map(ids=>ids.map(id=>nodes[id]));
  const apply=count=>{units.forEach((unit,index)=>unit.forEach(node=>node.visible=index<count));closeWheel();viewer.reframe();updateDimensions();};
  const card=addVariantCard('Modül Sayısı',[{id:'one',label:'Tekli'},{id:'two',label:'İkili'},{id:'three',label:'Üçlü'}],'two',id=>apply({one:1,two:2,three:3}[id]));apply(2);
  resetConfiguration=()=>card.querySelector('[data-variant="two"]').click();
}
function setupDesk(){
 const n=viewer.model.nodes;let size='200',layout='storage-right';
 const stretch={160:[21,23],200:[1,3],240:[17,19]};
 // All three desktop pieces sample the same physical plane. Recalculate when
 // the left section moves, including the hidden stretch variants.
 const tops=[];viewer.model.root.traverse(mesh=>{
   if(!mesh.isMesh||!/^Top/.test(semanticNode(mesh).name))return;
   if(![mesh.material].flat().some(m=>config.groups.desktop.materials.includes(materialName(m))))return;
   mesh.geometry=mesh.geometry.clone();tops.push(mesh);
   [mesh.material].flat().forEach(m=>{if(config.groups.desktop.materials.includes(materialName(m)))m.userData.deskTopProjection=true;});
 });
 // The five front panels in this GLB have POSITION and NORMAL, but no UVs.
 // Without UVs a selected wood image cannot appear; only its flat color does.
 const panels=[];viewer.model.root.traverse(mesh=>{
   if(!mesh.isMesh||!semanticNode(mesh).name.startsWith('FrontPanel'))return;
   mesh.geometry=mesh.geometry.clone();panels.push(mesh);
   [mesh.material].flat().forEach(m=>{m.userData.frontPanelProjection=true;});
 });
 const point=new THREE.Vector3();
 const projectTops=()=>{viewer.model.root.updateMatrixWorld(true);for(const mesh of tops){
   const positions=mesh.geometry.getAttribute('position');let uv=mesh.geometry.getAttribute('uv');
   if(!uv||uv.count!==positions.count){uv=new THREE.BufferAttribute(new Float32Array(positions.count*2),2);mesh.geometry.setAttribute('uv',uv);}
   for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);uv.setXY(i,point.z/.75,point.x/2.4);}
   uv.needsUpdate=true;
 }for(const mesh of panels){
   const positions=mesh.geometry.getAttribute('position');let uv=mesh.geometry.getAttribute('uv');
   if(!uv||uv.count!==positions.count){uv=new THREE.BufferAttribute(new Float32Array(positions.count*2),2);mesh.geometry.setAttribute('uv',uv);}
   for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);uv.setXY(i,point.y/.4,point.x/.9);}
   uv.needsUpdate=true;
 }};
 // LeftSide also includes the left storage body and drawer fronts.
 const moving=[9,11,13,29,31].map(id=>n[id]);const origins=moving.map(node=>node.position.clone());
 const apply=()=>{Object.entries(stretch).forEach(([key,ids])=>ids.forEach(id=>n[id].visible=key===size));
 moving.forEach((node,i)=>{node.position.copy(origins[i]);node.position.x+=(Number(size)-200)/100;});
 n[13].visible=layout!=='storage-left';n[15].visible=layout!=='storage-right';
 [25,27].forEach(id=>n[id].visible=layout==='storage-right');[29,31].forEach(id=>n[id].visible=layout==='storage-left');
 projectTops();closeWheel();viewer.reframe();updateDimensions();};
 const sizes=addVariantCard('Masa Ölçüsü',[{id:'160',label:'160 cm'},{id:'200',label:'200 cm'},{id:'240',label:'240 cm'}],size,id=>{size=id;apply();});
 const layouts=addVariantCard('Ayak / Keson Düzeni',[{id:'storage-right',label:'Keson Sağda'},{id:'storage-left',label:'Keson Solda'},{id:'two-legs',label:'İki Metal Ayak'}],layout,id=>{layout=id;apply();});apply();
 resetConfiguration=()=>{sizes.querySelector('[data-variant="200"]').click();layouts.querySelector('[data-variant="storage-right"]').click();};
}

function inferGroup(object,material){return Object.keys(config.groups).find(key=>targetMaterials(object,key).includes(material.raw))||Object.keys(config.groups).find(key=>config.groups[key].materials.includes(materialName(material.raw))&&config.groups[key].target(object));}
function renderWheel(){const spec=config.groups[wheelGroup],pages=Math.ceil(spec.options.length/8);wheelPage=Math.max(0,Math.min(wheelPage,pages-1));const options=spec.options.slice(wheelPage*8,wheelPage*8+8);ui.wheelOptions.innerHTML='';options.forEach((option,index)=>{const theta=(-90+360*index/options.length)*Math.PI/180,button=document.createElement('button');button.className='wheel-swatch';button.style.setProperty('--x',`${Math.cos(theta)*(ui.wheel.clientWidth/2-34)}px`);button.style.setProperty('--y',`${Math.sin(theta)*(ui.wheel.clientWidth/2-34)}px`);button.style.cssText+=`;${swatch(option)}`;button.dataset.value=option.id;button.title=option.label;ui.wheelOptions.append(button);});document.querySelector('#wheel-title').textContent=spec.label;let selected;wheelObject.traverse(node=>{if(!selected)selected=targetMaterials(node,wheelGroup)[0]?.userData.finishId;});document.querySelector('#wheel-current').textContent=spec.options.find(o=>o.id===selected)?.label||'Mevcut';ui.wheelOptions.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.value===selected));document.querySelector('#wheel-prev').disabled=wheelPage===0;document.querySelector('#wheel-next').disabled=wheelPage===pages-1;ui.wheel.querySelector('.wheel-pages').hidden=pages<2;document.querySelector('#wheel-page').textContent=`${wheelPage+1} / ${pages}`;}
function closeWheel(){ui.wheel.hidden=true;wheelGroup=null;wheelObject=null;}
function openWheel(key,object,x,y){wheelGroup=key;wheelObject=semanticNode(object);wheelPage=0;const box=ui.wheel.parentElement.getBoundingClientRect(),radius=matchMedia('(max-width:500px)').matches?125:147;ui.wheel.style.left=`${Math.max(radius,Math.min(x-box.left,box.width-radius))}px`;ui.wheel.style.top=`${Math.max(radius+25,Math.min(y-box.top,box.height-radius-30))}px`;ui.wheel.hidden=false;renderWheel();}
ui.wheelOptions.addEventListener('click',event=>{const button=event.target.closest('[data-value]');if(button&&wheelGroup&&wheelObject)applyGroup(wheelGroup,choice(wheelGroup,button.dataset.value),wheelObject).then(()=>{if(wheelGroup)renderWheel();});});
const wheelHandle=document.querySelector('#wheel-drag');let dragWheel=null;
wheelHandle.addEventListener('pointerdown',event=>{event.preventDefault();wheelHandle.setPointerCapture(event.pointerId);dragWheel={x:event.clientX,y:event.clientY,left:parseFloat(ui.wheel.style.left),top:parseFloat(ui.wheel.style.top)};});
wheelHandle.addEventListener('pointermove',event=>{if(!dragWheel)return;const area=ui.wheel.parentElement.getBoundingClientRect(),radius=ui.wheel.offsetWidth/2;ui.wheel.style.left=`${Math.max(radius,Math.min(area.width-radius,dragWheel.left+event.clientX-dragWheel.x))}px`;ui.wheel.style.top=`${Math.max(radius,Math.min(area.height-radius,dragWheel.top+event.clientY-dragWheel.y))}px`;});
wheelHandle.addEventListener('pointerup',()=>{dragWheel=null;});wheelHandle.addEventListener('pointercancel',()=>{dragWheel=null;});
ui.wheel.querySelector('#wheel-close').addEventListener('click',closeWheel);document.querySelector('#wheel-prev').addEventListener('click',()=>{wheelPage--;renderWheel();});document.querySelector('#wheel-next').addEventListener('click',()=>{wheelPage++;renderWheel();});
viewer.addEventListener('pointerdown',event=>pointerStart={x:event.clientX,y:event.clientY});viewer.addEventListener('pointerup',event=>{if(!pointerStart||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>7)return;const hit=viewer.materialFromPoint(event.clientX,event.clientY);const key=hit&&inferGroup(hit.object,hit);if(key)openWheel(key,hit.object,event.clientX,event.clientY);else closeWheel();});

viewer.addEventListener('load',async()=>{document.querySelector('#model-loading').hidden=true;isolateMaterials();if(page==='sofa')setupSofa();if(page==='desk')setupDesk();for(const key of Object.keys(config.groups))await applyGroup(key);updateText();ui.notice.textContent='';});
viewer.addEventListener('error',()=>{ui.notice.textContent='3D model yüklenemedi. Lütfen sayfayı yenileyin.';});viewer.addEventListener('progress',event=>{const bar=viewer.querySelector('.progress'),span=bar?.querySelector('span');if(span)span.style.width=`${event.detail.totalProgress*100}%`;if(bar)bar.hidden=event.detail.totalProgress===1;});
async function load(){ui.notice.textContent='3D model yükleniyor…';const response=await fetch(config.file);if(!response.ok)throw new Error(response.status);modelBlob=await response.blob();viewer.src=URL.createObjectURL(modelBlob);}load().catch(error=>{console.error(error);ui.notice.textContent='3D model yüklenemedi.';});

const studio={environment:'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/brown_photostudio_02_1k.hdr',exposure:1.12,shadow:1.35,softness:.72};viewer.environmentImage=studio.environment;viewer.exposure=studio.exposure;viewer.shadowIntensity=studio.shadow;viewer.shadowSoftness=studio.softness;viewer.setRotationSpeed(40);
const activate=(selector,current)=>document.querySelectorAll(selector).forEach(node=>node.classList.toggle('active',node===current));
document.querySelectorAll('.tab').forEach(button=>button.addEventListener('click',()=>{activate('.tab',button);document.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.toggle('active',panel.id===button.dataset.tab));}));
document.querySelector('[data-action="rotate"]').addEventListener('click',event=>{const on=event.currentTarget.getAttribute('aria-pressed')!=='true';viewer.setAutoRotate(on);event.currentTarget.setAttribute('aria-pressed',on);});document.querySelector('#rotation-speed').addEventListener('input',event=>{viewer.setRotationSpeed(event.target.value);event.target.nextElementSibling.value=`${event.target.value}°/sn`;});
document.querySelectorAll('[data-lighting]').forEach(button=>button.addEventListener('click',()=>{viewer.lightingPreset=button.dataset.lighting;document.querySelectorAll('[data-lighting]').forEach(node=>node.setAttribute('aria-pressed',node===button));}));const lighting=document.querySelector('.lighting-presets');document.querySelector('[data-action="lighting-menu"]').addEventListener('click',()=>lighting.hidden=!lighting.hidden);
document.querySelector('[data-action="fullscreen"]').addEventListener('click',()=>document.fullscreenElement?document.exitFullscreen():viewer.parentElement.requestFullscreen());document.querySelector('[data-action="reset"]').addEventListener('click',()=>viewer.reframe());document.querySelector('[data-action="zoom-in"]').addEventListener('click',()=>{const o=viewer.getCameraOrbit();viewer.cameraOrbit=`${o.theta}rad ${o.phi}rad ${o.radius*.82}m`;});document.querySelector('[data-action="zoom-out"]').addEventListener('click',()=>{const o=viewer.getCameraOrbit();viewer.cameraOrbit=`${o.theta}rad ${o.phi}rad ${o.radius*1.22}m`;});document.querySelector('[data-action="pan-left"]').addEventListener('click',()=>viewer.panView(-1));document.querySelector('[data-action="pan-right"]').addEventListener('click',()=>viewer.panView(1));document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{const views={front:'0deg 75deg auto',side:'90deg 75deg auto',top:'0deg 10deg auto'};viewer.cameraOrbit=views[button.dataset.view];activate('[data-view]',button);}));
document.querySelector('[data-action="snapshot"]').addEventListener('click',()=>{const link=document.createElement('a');link.href=viewer.toDataURL();link.download=config.download.replace('.glb','.png');link.click();});document.querySelector('[data-action="snapshot-4k"]').addEventListener('click',()=>{const link=document.createElement('a');link.href=viewer.to4KDataURL();link.download=config.download.replace('.glb','_4K.png');link.click();});document.querySelector('[data-action="dimensions"]').addEventListener('click',event=>{const box=document.querySelector('#dimensions-overlay');box.hidden=!box.hidden;updateDimensions();event.currentTarget.setAttribute('aria-pressed',!box.hidden);});
document.querySelector('#reset-materials').addEventListener('click',()=>{resetConfiguration();for(const [key,spec] of Object.entries(config.groups)){state[key]=spec.initial;applyGroup(key);}updateText();});document.querySelector('#source-download').addEventListener('click',()=>{if(!modelBlob)return;const link=document.createElement('a');link.href=URL.createObjectURL(modelBlob);link.download=config.download;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),60000);});
document.querySelector('#datasheet').addEventListener('click',()=>{try{const {jsPDF}=window.jspdf,pdf=new jsPDF({unit:'mm',format:'a4'}),image=viewer.toDataURL();pdf.setFillColor(15,27,45);pdf.rect(0,0,210,28,'F');pdf.setTextColor(255,255,255);pdf.setFontSize(20);pdf.text('VREEL',16,18);pdf.setTextColor(15,27,45);pdf.setFontSize(20);pdf.text(config.title,16,44);pdf.addImage(image,'PNG',16,54,178,100,undefined,'FAST');pdf.setFontSize(10);let y=166;for(const [key,spec] of Object.entries(config.groups)){pdf.text(`${spec.label}: ${choice(key).label}`,16,y);y+=7;}pdfDocument=pdf;document.querySelector('#pdf-preview').innerHTML=`<img src="${image}" alt="${esc(config.title)} teknik föy önizlemesi">`;document.querySelector('#pdf-modal').hidden=false;}catch(error){console.error(error);ui.notice.textContent='PDF teknik föyü oluşturulamadı.';}});document.querySelector('#download-pdf').addEventListener('click',()=>pdfDocument?.save(config.download.replace('.glb','.pdf')));document.querySelector('#pdf-modal .modal-close').addEventListener('click',()=>document.querySelector('#pdf-modal').hidden=true);document.querySelector('#add').addEventListener('click',()=>document.querySelector('#order-modal').hidden=false);document.querySelector('[data-close-order]').addEventListener('click',()=>document.querySelector('#order-modal').hidden=true);document.querySelector('#order-form').addEventListener('submit',event=>{event.preventDefault();document.querySelector('#order-status').textContent='Talep gönderilmedi: sipariş alıcısı henüz bağlı değil.';});
buildMaterials();

function updateDimensions(){viewer.setDimensionsVisible(!document.querySelector('#dimensions-overlay').hidden);}
setInterval(updateDimensions,250);
