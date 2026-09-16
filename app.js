const viewer=document.querySelector('#product-viewer');
const selection=document.querySelector('#selection');
const notice=document.querySelector('#notice');
const marker=document.querySelector('#pick-marker');
const picked=document.querySelector('#picked-part');
const viewerPanel=document.querySelector('.viewer-panel');
const state={size:'180',storage:'drawers-right',desktop:'glass',metal:'black',chair:'black',scene:'studio',light:'soft',lightLevel:100};
const names={'drawers-right':'Keson Sağ','drawers-left':'Keson Sol','metal-legs':'Metal Ayak',glass:'Siyah Cam',walnut:'Ceviz',oak:'Doğal Meşe',black:'Siyah',white:'Beyaz',chrome:'Krom',cognac:'Konyak',olive:'Zeytin',sand:'Kum'};
const presets={desktop:{glass:[[.1098,.1098,.1098,.7216],.5,.5,'BLEND'],walnut:[[.28,.11,.035,1],.36,0,'OPAQUE'],oak:[[.58,.34,.14,1],.42,0,'OPAQUE'],black:[[.025,.025,.025,1],.38,0,'OPAQUE'],white:[[.82,.77,.64,1],.48,0,'OPAQUE']},metal:{black:[[.018,.022,.026,1],.26,.88],white:[[.76,.76,.73,1],.32,.55],chrome:[[.72,.75,.78,1],.14,1]},chair:{black:[[.025,.028,.03,1],.5,0],cognac:[[.34,.13,.055,1],.43,0],olive:[[.11,.14,.075,1],.52,0],sand:[[.58,.48,.34,1],.56,0]}};
const materialNames={desktop:['*5'],metal:['[Color_008]1','[0131_Silver]','HMI- Polished Al1'],chair:['HMI- 3P14 (Vinyl1']};

function activate(selector,current){document.querySelectorAll(selector).forEach(b=>{const on=b===current;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function modelPath(){return `model/desk-${state.size}-${state.storage}.glb`;}
function updateText(){
  const values={size:`${state.size} cm`,storage:names[state.storage],desktop:names[state.desktop],metal:names[state.metal],chair:names[state.chair]};
  selection.textContent=`${values.size} · ${values.storage} · ${values.desktop} · ${values.metal} · ${values.chair}`;
  Object.entries(values).forEach(([key,value])=>{document.querySelectorAll(`[data-summary="${key}"],[data-detail="${key}"]`).forEach(el=>el.textContent=value);});
}
function applyMaterial(group){const p=presets[group][state[group]];if(!p||!viewer.model)return;for(const name of materialNames[group]){const m=[...viewer.model.materials].find(x=>x.name===name);if(!m)continue;const x=m.pbrMetallicRoughness;x.setBaseColorFactor(p[0]);x.setRoughnessFactor(p[1]);x.setMetallicFactor(p[2]);if(group==='desktop'&&p[3])m.setAlphaMode(p[3]);}viewer.requestUpdate?.();}
function applyAll(){Object.keys(materialNames).forEach(applyMaterial);updateText();notice.textContent='';}
function cleanCapture(){marker.hidden=true;picked.hidden=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
function dataUrlToBlob(url){const [meta,data]=url.split(',');const mime=meta.match(/:(.*?);/)[1];const bytes=atob(data);const arr=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);return new Blob([arr],{type:mime});}
async function capturePng(download=true){const markerWas=!marker.hidden,pickedWas=!picked.hidden;await cleanCapture();const url=await viewer.toDataURL('image/png',1);marker.hidden=!markerWas;picked.hidden=!pickedWas;if(download){const a=document.createElement('a');a.href=URL.createObjectURL(dataUrlToBlob(url));a.download=`VREEL_Yonetici_Masasi_${state.size}cm_${state.storage}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}return url;}

viewer.addEventListener('load',applyAll);
viewer.addEventListener('progress',e=>{const bar=viewer.querySelector('.progress'),span=bar?.querySelector('span');if(bar)bar.hidden=false;if(span)span.style.width=`${e.detail.totalProgress*100}%`;if(e.detail.totalProgress===1&&bar)bar.hidden=true;});
viewer.addEventListener('click',e=>{if(Math.abs(e.movementX||0)>3)return;const rect=viewer.getBoundingClientRect();marker.style.left=`${e.clientX-rect.left}px`;marker.style.top=`${e.clientY-rect.top}px`;marker.hidden=false;picked.hidden=false;const material=viewer.materialFromPoint?.(e.clientX,e.clientY);picked.querySelector('strong').textContent=material?.name||'Ürün parçası';});

document.querySelectorAll('[data-model-group]').forEach(b=>b.addEventListener('click',()=>{const g=b.dataset.modelGroup;state[g]=b.dataset.value;activate(`[data-model-group="${g}"]`,b);notice.textContent='Yapılandırma güncelleniyor…';marker.hidden=picked.hidden=true;viewer.src=modelPath();updateText();}));
document.querySelectorAll('[data-material]').forEach(b=>b.addEventListener('click',()=>{const g=b.dataset.material;state[g]=b.dataset.value;activate(`[data-material="${g}"]`,b);applyMaterial(g);updateText();}));
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{activate('.tab',b);document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===b.dataset.tab));}));
document.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>{state.scene=b.dataset.scene;activate('[data-scene]',b);viewerPanel.classList.remove('office','transparent');if(state.scene!=='studio')viewerPanel.classList.add(state.scene);viewer.removeAttribute('skybox-image');}));
const lighting={
  soft:{environment:'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/poly_haven_studio_1k.hdr',exposure:1.05,shadow:.85,softness:1},
  day:{environment:'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/brown_photostudio_02_1k.hdr',exposure:1.28,shadow:1.35,softness:.72},
  dramatic:{environment:'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_06_1k.hdr',exposure:.72,shadow:2,softness:.28}
};
function applyLighting(){const p=lighting[state.light],level=state.lightLevel/100;viewer.environmentImage=p.environment;viewer.exposure=p.exposure*level;viewer.shadowIntensity=p.shadow;viewer.shadowSoftness=p.softness;viewer.removeAttribute('skybox-image');}
document.querySelectorAll('[data-light]').forEach(b=>b.addEventListener('click',()=>{state.light=b.dataset.light;activate('[data-light]',b);applyLighting();}));
document.querySelector('#light-level').addEventListener('input',e=>{state.lightLevel=Number(e.target.value);e.target.nextElementSibling.value=`${state.lightLevel}%`;applyLighting();});
document.querySelector('[data-action="rotate"]').addEventListener('click',e=>{const on=!viewer.hasAttribute('auto-rotate');viewer.toggleAttribute('auto-rotate',on);e.currentTarget.setAttribute('aria-pressed',String(on));});
document.querySelector('[data-action="reset"]').addEventListener('click',()=>{viewer.cameraOrbit='35deg 66deg auto';viewer.cameraTarget='auto auto auto';viewer.fieldOfView='auto';viewer.jumpCameraToGoal?.();});
document.querySelector('[data-action="zoom-in"]').addEventListener('click',()=>{const o=viewer.getCameraOrbit();viewer.cameraOrbit=`${o.theta}rad ${o.phi}rad ${Math.max(o.radius*.82,.2)}m`;});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{const views={orbit:'35deg 66deg auto',front:'0deg 75deg auto',side:'90deg 75deg auto',top:'0deg 10deg auto'};viewer.cameraOrbit=views[b.dataset.view];viewer.jumpCameraToGoal?.();activate('[data-view]',b);}));
document.querySelector('[data-action="snapshot"]').addEventListener('click',async e=>{e.currentTarget.disabled=true;try{await capturePng(true);notice.textContent='PNG görseli indirildi.';}catch{notice.textContent='Görsel oluşturulamadı. Lütfen tekrar deneyin.';}e.currentTarget.disabled=false;});

let pdfDocument=null,pdfPreviewUrl='';
async function makePdf(){
  const productImage=await capturePng(false),canvas=document.createElement('canvas');canvas.width=1240;canvas.height=1754;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,1240,1754);ctx.fillStyle='#0f1b2d';ctx.fillRect(0,0,1240,148);ctx.fillStyle='#fff';ctx.font='700 52px Arial';ctx.fillText('VREEL',82,92);ctx.fillStyle='#b68a4c';ctx.font='600 25px Arial';ctx.fillText('ETKİLEŞİMLİ TASARIM',275,90);
  const img=new Image();img.src=productImage;await img.decode();ctx.fillStyle='#eef1f4';ctx.fillRect(82,200,1076,650);const scale=Math.min(1076/img.width,650/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,82+(1076-w)/2,200+(650-h)/2,w,h);
  ctx.fillStyle='#0f1b2d';ctx.font='700 42px Arial';ctx.fillText('Yönetici Masası',82,930);ctx.fillStyle='#697383';ctx.font='400 24px Arial';ctx.fillText('Seçilen ürün yapılandırmasına göre hazırlanan teknik föy',82,974);ctx.fillStyle='#b68a4c';ctx.fillRect(82,1008,1076,3);
  const rows=[['Masa genişliği',`${state.size} cm`],['Keson yerleşimi',names[state.storage]],['Tabla malzemesi',names[state.desktop]],['Metal yüzey',names[state.metal]],['Koltuk döşemesi',names[state.chair]]];rows.forEach((r,i)=>{const y=1080+i*92;ctx.fillStyle='#697383';ctx.font='400 25px Arial';ctx.fillText(r[0],82,y);ctx.fillStyle='#0f1b2d';ctx.font='700 26px Arial';ctx.fillText(r[1],500,y);ctx.fillStyle='#e2e5e9';ctx.fillRect(82,y+28,1076,2);});
  ctx.fillStyle='#8b929c';ctx.font='400 20px Arial';ctx.fillText(`Oluşturma tarihi: ${new Date().toLocaleDateString('tr-TR')}`,82,1665);ctx.textAlign='right';ctx.fillText('VREEL tarafından geliştirilen etkileşimli ürün deneyimi',1158,1665);ctx.textAlign='left';
  pdfPreviewUrl=canvas.toDataURL('image/jpeg',.92);const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});pdf.addImage(pdfPreviewUrl,'JPEG',0,0,210,297,undefined,'FAST');return pdf;
}
document.querySelector('#datasheet').addEventListener('click',async()=>{notice.textContent='Teknik föy hazırlanıyor…';try{pdfDocument=await makePdf();const preview=document.querySelector('#pdf-preview');preview.innerHTML=`<div class="pdf-sheet"><img src="${pdfPreviewUrl}" alt="Ürün teknik föyü önizlemesi"></div>`;document.querySelector('#pdf-modal').hidden=false;notice.textContent='';}catch{notice.textContent='Teknik föy oluşturulamadı.';}});
document.querySelector('#download-pdf').addEventListener('click',()=>pdfDocument?.save(`VREEL_Yonetici_Masasi_${state.size}cm.pdf`));
document.querySelector('.modal-close').addEventListener('click',()=>document.querySelector('#pdf-modal').hidden=true);
document.querySelector('#pdf-modal').addEventListener('click',e=>{if(e.target.id==='pdf-modal')e.currentTarget.hidden=true;});
document.querySelector('#add').addEventListener('click',()=>notice.textContent='Ürün yapılandırması projeye eklendi.');
updateText();
