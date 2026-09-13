const source=document.querySelector('#source'),explanation=document.querySelector('#explanation'),divider=document.querySelector('#divider'),ratio=document.querySelector('#ratio');
let chapter=0;
const anchors=['','findings','framework','papers','pilot-comparison','recommendations'];
function send(action){const api=explanation.contentWindow.RAVPresentation;if(api&&api[action])api[action]();else explanation.contentWindow.postMessage({type:'rav-control',action},location.origin)}
function size(value){value=Math.max(30,Math.min(65,value));document.documentElement.style.setProperty('--left',value+'%');ratio.value=value;divider.setAttribute('aria-valuenow',Math.round(value))}
ratio.addEventListener('input',()=>size(+ratio.value));
divider.addEventListener('pointerdown',e=>{divider.setPointerCapture(e.pointerId);document.body.classList.add('dragging')});
divider.addEventListener('pointermove',e=>{if(divider.hasPointerCapture(e.pointerId))size(e.clientX/innerWidth*100)});
divider.addEventListener('pointerup',e=>{divider.releasePointerCapture(e.pointerId);document.body.classList.remove('dragging')});
divider.addEventListener('pointercancel',()=>document.body.classList.remove('dragging'));
divider.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();size(+ratio.value+(e.key==='ArrowLeft'?-2:2))}});
document.querySelector('#sync').onclick=()=>{const target=source.contentDocument.getElementById(anchors[chapter]||'overview');if(target)target.scrollIntoView({behavior:'smooth',block:'start'});};
document.querySelector('#focus').onclick=e=>{const active=document.body.classList.toggle('focus');e.target.textContent=active?'Restore split view':'Expand explanation'};
document.querySelector('#mobileSwitch').onclick=e=>{const active=document.body.classList.toggle('source-mode');e.target.textContent=active?'Show explanation':'Show original review'};
document.querySelector('#previous').onclick=()=>send('previous');document.querySelector('#following').onclick=()=>send('next');document.querySelector('#notes').onclick=()=>send('notes');
source.addEventListener('load',()=>document.body.classList.add('loaded'));
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==explanation.contentWindow||e.data?.type!=='rav-chapter')return;chapter=e.data.chapter;document.querySelector('#previous').disabled=chapter===0;document.querySelector('#following').disabled=chapter===5;document.querySelector('#sync').title='Locate '+e.data.name+' in the original review'});
document.addEventListener('keydown',e=>{if(e.target.closest('input,button,a,[role=separator]'))return;if(e.key==='ArrowRight'){e.preventDefault();send('next')}if(e.key==='ArrowLeft'){e.preventDefault();send('previous')}if(e.key.toLowerCase()==='n')send('notes')});


document.querySelector('#exit').onclick=()=>{if(parent!==window&&parent.RAVClosePresentation)parent.RAVClosePresentation();else if(parent!==window)parent.postMessage({type:'rav-exit-presentation'},location.origin);else location.href='../';};


