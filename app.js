const viewer=document.querySelector('#product-viewer');
const selection=document.querySelector('#selection');
const notice=document.querySelector('#notice');
let upholstery='Light fabric';
let finish='Matte';
let orbit='35deg 72deg auto';

const presets={
 'fabric-light':{label:'Light fabric',color:[.72,.66,.57,1],roughness:.92,metallic:0},
 'fabric-dark':{label:'Dark fabric',color:[.24,.27,.3,1],roughness:.94,metallic:0},
 'leather-brown':{label:'Brown leather',color:[.39,.23,.14,1],roughness:.46,metallic:0},
 'leather-cream':{label:'Cream leather',color:[.82,.72,.57,1],roughness:.42,metallic:0}
};

function updateSummary(){selection.textContent=`${upholstery} · ${finish}`}

function setActive(group,current){
 document.querySelectorAll(group).forEach(el=>{
  const active=el===current;
  el.classList.toggle('active',active);
  el.setAttribute('aria-pressed',String(active));
 });
}

viewer.addEventListener('progress',e=>{
 const bar=viewer.querySelector('.progress');
 const span=bar?.querySelector('span');
 if(span) span.style.width=`${e.detail.totalProgress*100}%`;
 if(e.detail.totalProgress===1 && bar) bar.hidden=true;
});

viewer.addEventListener('load',()=>{
 notice.textContent='';
 applyPreset('fabric-light');
});

function applyPreset(key){
 const preset=presets[key];
 const material=viewer.model?.materials?.[0];
 if(!material){notice.textContent='The material is still loading.';return}
 const pbr=material.pbrMetallicRoughness;
 pbr.setBaseColorFactor(preset.color);
 pbr.setRoughnessFactor(finish==='Satin'?Math.min(preset.roughness,.32):preset.roughness);
 pbr.setMetallicFactor(preset.metallic);
 upholstery=preset.label;
 updateSummary();
 viewer.requestUpdate?.();
}

document.querySelectorAll('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>{
 setActive('[data-preset]',btn);
 applyPreset(btn.dataset.preset);
}));

document.querySelectorAll('[data-finish]').forEach(btn=>btn.addEventListener('click',()=>{
 setActive('[data-finish]',btn);
 finish=btn.dataset.finish==='satin'?'Satin':'Matte';
 const active=document.querySelector('[data-preset].active');
 applyPreset(active?.dataset.preset||'fabric-light');
}));

document.querySelector('[data-action="rotate"]').addEventListener('click',e=>{
 const enabled=!viewer.hasAttribute('auto-rotate');
 viewer.toggleAttribute('auto-rotate',enabled);
 viewer.setAttribute('interaction-prompt',enabled?'none':'auto');
 e.currentTarget.setAttribute('aria-pressed',String(enabled));
 e.currentTarget.textContent=enabled?'Stop':'Rotate';
});

document.querySelector('[data-action="reset"]').addEventListener('click',()=>{
 viewer.cameraOrbit=orbit;
 viewer.cameraTarget='auto auto auto';
 viewer.fieldOfView='auto';
 viewer.jumpCameraToGoal?.();
});

document.querySelector('[data-action="zoom-in"]').addEventListener('click',()=>{
 const orbitData=viewer.getCameraOrbit();
 viewer.cameraOrbit=`${orbitData.theta}rad ${orbitData.phi}rad ${Math.max(orbitData.radius*.82,.2)}m`;
});

document.querySelector('[data-action="zoom-out"]').addEventListener('click',()=>{
 const orbitData=viewer.getCameraOrbit();
 viewer.cameraOrbit=`${orbitData.theta}rad ${orbitData.phi}rad ${orbitData.radius*1.2}m`;
});

document.querySelector('#add').addEventListener('click',()=>{
 notice.textContent=`Added: MAY Armchair — ${selection.textContent}`;
});

document.querySelector('#print').addEventListener('click',()=>{
 document.title=`MAY Armchair — ${selection.textContent}`;
 window.print();
});