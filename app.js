const viewer = document.querySelector('#product-viewer');
const selection = document.querySelector('#selection');
const notice = document.querySelector('#notice');
const state = { leather: 'black', wood: 'walnut', metal: 'chrome' };
const labels = { black:'Black', cognac:'Cognac', cream:'Cream', olive:'Olive', walnut:'Walnut', oak:'Oak', 'black-ash':'Black ash', chrome:'Chrome', brass:'Brass' };
const finishes = {
  leather: {
    black:{color:[.025,.025,.028,1],roughness:.38,metallic:0}, cognac:{color:[.31,.12,.045,1],roughness:.42,metallic:0},
    cream:{color:[.69,.55,.38,1],roughness:.48,metallic:0}, olive:{color:[.095,.12,.065,1],roughness:.5,metallic:0}
  },
  wood: {
    walnut:{color:[.29,.105,.035,1],roughness:.32,metallic:0}, oak:{color:[.62,.38,.16,1],roughness:.42,metallic:0},
    'black-ash':{color:[.035,.028,.023,1],roughness:.4,metallic:0}
  },
  metal: {
    chrome:{color:[.72,.75,.78,1],roughness:.16,metallic:1}, black:{color:[.025,.03,.035,1],roughness:.25,metallic:.85},
    brass:{color:[.62,.38,.09,1],roughness:.24,metallic:1}
  }
};
let materials = {};
function identifyMaterials(){
  const list = [...(viewer.model?.materials || [])];
  materials = { metal:list[0], leather:list[1], wood:list[2] };
  if(list.length < 3) notice.textContent = 'This model does not contain three independently configurable materials.';
}
function apply(group){
  const material = materials[group]; const preset = finishes[group][state[group]];
  if(!material || !preset) return;
  const pbr = material.pbrMetallicRoughness;
  pbr.setBaseColorFactor(preset.color); pbr.setRoughnessFactor(preset.roughness); pbr.setMetallicFactor(preset.metallic);
  viewer.requestUpdate?.();
}
function updateSummary(){ selection.textContent = `${labels[state.leather]} · ${labels[state.wood]} · ${labels[state.metal]}`; }
function setActive(group,current){document.querySelectorAll(`[data-group="${group}"]`).forEach(el=>{const active=el===current;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});}
viewer.addEventListener('progress',e=>{const bar=viewer.querySelector('.progress');const span=bar?.querySelector('span');if(span)span.style.width=`${e.detail.totalProgress*100}%`;if(e.detail.totalProgress===1&&bar)bar.hidden=true;});
viewer.addEventListener('load',()=>{identifyMaterials();Object.keys(state).forEach(apply);updateSummary();});
document.querySelectorAll('[data-group][data-option]').forEach(btn=>btn.addEventListener('click',()=>{const group=btn.dataset.group;state[group]=btn.dataset.option;setActive(group,btn);apply(group);updateSummary();}));
document.querySelector('[data-action="rotate"]').addEventListener('click',e=>{const enabled=!viewer.hasAttribute('auto-rotate');viewer.toggleAttribute('auto-rotate',enabled);viewer.setAttribute('interaction-prompt',enabled?'none':'auto');e.currentTarget.setAttribute('aria-pressed',String(enabled));e.currentTarget.textContent=enabled?'Stop':'Rotate';});
document.querySelector('[data-action="reset"]').addEventListener('click',()=>{viewer.cameraOrbit='35deg 68deg auto';viewer.cameraTarget='auto auto auto';viewer.fieldOfView='auto';viewer.jumpCameraToGoal?.();});
document.querySelector('[data-action="zoom-in"]').addEventListener('click',()=>{const o=viewer.getCameraOrbit();viewer.cameraOrbit=`${o.theta}rad ${o.phi}rad ${Math.max(o.radius*.82,.2)}m`;});
document.querySelector('[data-action="zoom-out"]').addEventListener('click',()=>{const o=viewer.getCameraOrbit();viewer.cameraOrbit=`${o.theta}rad ${o.phi}rad ${o.radius*1.2}m`;});
document.querySelector('#add').addEventListener('click',()=>{notice.textContent=`Added: Lounge Chair — ${selection.textContent}`;});
document.querySelector('#print').addEventListener('click',()=>{document.title=`Lounge Chair — ${selection.textContent}`;window.print();});
