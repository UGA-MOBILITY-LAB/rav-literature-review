const chapters=[
{id:'overview',name:'Overview',time:'0:00–0:40',label:'01 / OVERVIEW',title:'From AV research to rural service'},
{id:'findings',name:'Key findings',time:'0:40–3:00',label:'02 / WHAT THE LITERATURE SAYS',title:'What the evidence tells us'},
{id:'framework',name:'Framework',time:'3:00–4:15',label:'03 / THE TWO-TIER FRAMEWORK',title:'How the capabilities fit together'},
{id:'evidence',name:'Evidence Map',time:'4:15–5:30',label:'04 / EVIDENCE MAP',title:'From a theme to its sources'},
{id:'recommendations',name:'Recommendations',time:'5:30–6:40',label:'05 / RECOMMENDATIONS',title:'What each stakeholder can do'},
{id:'pilots',name:'Field pilots',time:'6:40–8:00',label:'06 / FIELD PILOT COMPARISON',title:'What operating experience adds'},
{id:'methodology',name:'Review Methodology',time:'8:00–9:10',label:'07 / REVIEW METHODOLOGY',title:'How the evidence was assembled'},
{id:'references',name:'References & citation',time:'9:10–10:00',label:'08 / REFERENCES AND CITATION',title:'Keep the review traceable'}
];
let current=Math.max(0,Math.min(chapters.length-1,(Number(location.hash.slice(1))||1)-1)),tier2=false,focused=false,pilot=0;
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showDialog(html){$('#sourceContent').innerHTML=html;$('#sourceDialog').showModal()}
function paper(n){const p=PAPERS.find(p=>p.n===n);if(!p)return;const url=p.doi?'https://doi.org/'+p.doi:p.arxiv?'https://arxiv.org/abs/'+p.arxiv:p.url;showDialog(`<span class="tag">REFERENCE ${p.n} / ${esc(p.rural)}</span><h2>${esc(p.title)}</h2><p>${esc(p.authors)} · ${p.year}</p><p>${esc(p.venue)}</p><p><strong>${esc(p.cat)}</strong><br>${esc(p.etype)} · Evidence strength: ${esc(p.strength)}</p><p>${esc(p.rav)}</p><a class="source-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open original source ↗</a><p><small>Labels reflect the review team’s coding. They are not formal risk-of-bias or deployment-readiness scores.</small></p>`)}
function sources(ns){showDialog(`<span class="tag">SUPPORTING SOURCES</span><h2>Inspect the evidence</h2>${ns.map(n=>{let p=PAPERS.find(p=>p.n===n);return `<p><button data-paper="${n}">[${n}] ${esc(p.title)} (${p.year})</button></p>`}).join('')}`)}
function framework(){return `<div class="map-title">CAPABILITIES AND VALIDATION</div><svg viewBox="0 0 650 520" role="img" aria-label="Tier one vehicle and fleet, tier two infrastructure communication and cooperation, with field validation"><text x="35" y="70" class="map-small">TIER 1 / OPERATING BASELINE</text><rect class="module-box" x="35" y="90" width="275" height="110" rx="8"/><rect class="module-box" x="330" y="90" width="285" height="110" rx="8"/><text x="55" y="125" class="module-label">Autonomous Driving</text><text x="55" y="163" class="map-small">Sensing · positioning · fallback</text><text x="350" y="125" class="module-label">Fleet Management</text><text x="350" y="163" class="map-small">Dispatch · charging · supervision</text><g id="tierSupport" opacity="${tier2?1:.15}" style="transition:opacity .5s"><path d="M170 200V250M470 200V250" stroke="#315b78" stroke-width="2"/><text x="35" y="240" class="map-small">TIER 2 / SELECTIVE SUPPORT</text>${['Infrastructure','Communication','Cooperative Driving'].map((t,i)=>`<rect class="module-box t2" x="${35+i*198}" y="260" width="184" height="90" rx="8"/><text x="${47+i*198}" y="310" class="module-label" style="font-size:15px">${t}</text>`).join('')}</g><path d="M325 355V400" stroke="#a51c30" stroke-width="2"/><text x="325" y="438" text-anchor="middle" fill="#a51c30" font-size="24">Field pilots validate the limits</text><text x="325" y="474" text-anchor="middle" class="map-small">Defined conditions before broader operation</text></svg><div class="caption">The tiers organize the review. They are not SAE automation levels.</div>`}
function evidence(){return `<div class="legend"><span><i style="background:var(--red)"></i>12 direct rural</span><span><i style="background:#c3c8cd"></i>99 transferable</span><span><i style="background:var(--gold)"></i>7 context-limited</span></div><div class="point-area ${focused?'focus':''}">${PAPERS.map(p=>`<button class="point ${p.rural==='Direct rural evidence'?'direct':p.rural==='Context-limited'?'context':''}" data-paper="${p.n}" aria-label="Reference ${p.n}: ${esc(p.title)}. ${esc(p.rural)}" title="[${p.n}] ${esc(p.title)}"></button>`).join('')}</div><div class="evidence-stat"><b>10.2%</b><span>direct rural relevance<br>12 / 118 source records</span></div>`}
const pilots=[['goMARTI','Grand Rapids, Minnesota','On-demand','Flexible booking and accessible support for dispersed riders. The reviewed operation is low-speed and geofenced with an onboard safety operator.',[14,15]],['ADASTEC','Sleeping Bear Dunes, Michigan','Fixed route','A defined route supports a scheduled service, with supervised operation and energy and interruption planning.',[16]],['TEDDY','Yellowstone National Park','Fixed route','Remote park service connects weather, communication and service interruptions within a bounded operating setting.',[116]],['CASSI','Wright Brothers + North Carolina sites','Fixed route','Multiple public sites provide operating experience. Comparable reporting helps identify recurring barriers.',[116,117]]];
function photoView(i){const p=PHOTOS[i];return `<figure class="field-photo"><div class="photo-window"><img class="photo-shot" src="${esc(p.src)}" alt="${esc(p.alt)}" decoding="async" referrerpolicy="no-referrer"></div><figcaption><span>PROJECT PHOTOGRAPH</span><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.credit)} ↗</a></figcaption></figure>`;}
function mission(){
 if(beat===0)return `<div class="project-mission mission-platform"><div class="project-kicker">TRAVELS / RESEARCH PLATFORMS</div><div class="vehicle-pair"><figure class="vehicle-portrait"><div class="vehicle-window"><img src="assets/uga-research-vehicle.png" alt="University of Georgia research vehicle with roof-mounted sensors and UGA branding" width="719" height="539" decoding="async"></div><figcaption><strong>University of Georgia</strong><span>Research vehicle</span></figcaption></figure><figure class="vehicle-portrait"><div class="vehicle-window vehicle-window-uw"><img src="assets/uw-research-van.png" alt="UW–Madison research van shown in the TRAVELS kickoff, with Dataspeed branding" width="1024" height="1024" decoding="async"></div><figcaption><strong>UW–Madison</strong><span>Research van · Dataspeed</span></figcaption></figure></div><p class="fleet-source">TRAVELS kickoff, slide 4</p><div class="mission-purpose">Research platforms.<br><em>A service-level question.</em></div><div class="mission-services" aria-label="TRAVELS service concepts"><span>Healthcare</span><span>Work and daily needs</span><span>Tourism and events</span></div><div class="caption">Service concepts from the TRAVELS kickoff, slides 12–14.</div></div>`;

}
function pilotView(){if(beat===2)return `<div class="review-story"><div class="story-kicker">READ THE PILOTS TOGETHER</div><div class="story-statement">Different service patterns.<br>Shared operating limits.</div><div class="story-rows"><div><span>Dispersed requests</span><p>goMARTI<br>Demand-responsive booking and accessible passenger support.</p></div><div><span>Predictable circulation</span><p>ADASTEC · TEDDY · CASSI<br>Fixed routes in park and public-site settings.</p></div><div><span>Shared boundary</span><p>Supervised operations within defined geographic and operating limits.</p></div></div><p class="story-boundary">Compare the trip pattern, support needs and interruptions before transferring a service model.</p><div class="story-citations"><span>Sources</span>${[14,15,16,116,117].map(n=>`<button data-paper="${n}" aria-label="Inspect reference ${n}">[${n}]</button>`).join('')}</div></div>`;const p=pilots[pilot];return `<div class="pilot-gallery"><div class="pilot-tabs" aria-label="Select a field pilot">${pilots.map((p,i)=>`<button data-pilot="${i}" aria-pressed="${i===pilot}"><span>0${i+1}</span>${p[0]}</button>`).join('')}</div>${photoView(pilot)}<div class="pilot-heading"><div><h2>${p[0]}</h2><p>${p[1]}</p></div><span class="service-type">${p[2]}</span></div><div class="pilot-details">${p[3]} <button class="secondary" id="pilotSources">Sources ↗</button></div></div>`;}

function render(){
 const c=chapters[current];
 $('#eyebrow').textContent=c.label;$('#title').textContent=c.title;
 $('#details').innerHTML='';
 $('#visual').className='visual';
 const views={overview:mission,findings:reviewFindings,framework,evidence:evidenceMapView,recommendations:reviewRecommendations,pilots:pilotView,methodology:reviewMethod,references:reviewReferences};
 $('#visual').innerHTML=views[c.id]();
 let actions='<button class="action" id="begin">'+(current===chapters.length-1&&beat===lastBeat()?'Back to review':beat<lastBeat()?'Continue':'Next: '+chapters[current+1].name)+'</button>';

 $('#actions').innerHTML=actions;
 $('#number').textContent=String(current+1).padStart(2,'0');$('#chapterName').textContent=c.name;$('#time').textContent=c.time;
 $('#chapters').innerHTML=chapters.map((c,i)=>`<button aria-label="Chapter ${i+1}: ${c.name}" aria-current="${i===current}" data-chapter="${i}" title="${c.name}"></button>`).join('');
 $('#announcement').textContent=`Chapter ${current+1}: ${c.name}`;
}
function go(n){n=Math.max(0,Math.min(chapters.length-1,n));if(n===current)return;current=n;beat=0;applyBeat();history.replaceState(null,'','#'+(current+1));render();$('#stage').classList.remove('enter');void $('#stage').offsetWidth;$('#stage').classList.add('enter');window.scrollTo(0,0)}
document.addEventListener('click',e=>{const t=e.target.closest('button,[data-hazard]');if(!t)return;if(t.dataset.chapter!==undefined)return go(+t.dataset.chapter);if(t.dataset.paper)return paper(+t.dataset.paper);if(t.dataset.reviewTheme){sendReviewTarget('theme:'+t.dataset.reviewTheme);return;}if(t.dataset.pilot!==undefined){pilot=+t.dataset.pilot;beat=pilot===0?0:1;return render()}if(t.dataset.hazard)return sources(t.dataset.hazard==='markings'?[1,2,3]:[9,50,92]);switch(t.id){case 'begin':if(current===chapters.length-1&&beat===lastBeat()){if(parent!==window){if(parent.RAVFinish)parent.RAVFinish();else parent.postMessage({type:'rav-finish'},location.origin);}else location.href='../';}else advance(1);break;case 'next':advance(1);break;case 'prev':advance(-1);break;case 'fullButton':if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>{$('#announcement').textContent='Fullscreen unavailable. Use your browser fullscreen command.'});break;case 'pilotSources':sources(pilots[pilot][4]);break;}if(t.classList.contains('close'))$('#sourceDialog').close()});
document.addEventListener('keydown',e=>{if($('#sourceDialog').open||e.target.closest('video,audio,textarea,select'))return;if(e.target.closest('[data-hazard]')&&['Enter',' '].includes(e.key)){e.preventDefault();e.target.closest('[data-hazard]').dispatchEvent(new MouseEvent('click',{bubbles:true}));return}if(e.key.toLowerCase()==='f'){$('#fullButton').click();return}if(e.target.closest('button,a,input'))return;if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();advance(1)}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();advance(-1)}if(e.key==='Home'){e.preventDefault();go(0)}if(e.key==='End'){e.preventDefault();go(chapters.length-1)}});
window.addEventListener('hashchange',()=>{current=Math.max(0,Math.min(chapters.length-1,(Number(location.hash.slice(1))||1)-1));beat=0;applyBeat();render();window.scrollTo(0,0)});
$('#sourceDialog').addEventListener('click',e=>{if(e.target===$('#sourceDialog'))$('#sourceDialog').close()});
if(new URLSearchParams(location.search).has('embedded'))document.body.classList.add('embedded');
let beat=0;
function lastBeat(){return BEATS[current].length-1;}
function applyBeat(){const id=chapters[current].id;tier2=id==='framework'&&beat>0;focused=id==='findings'&&beat===3;if(id==='pilots')pilot=beat===0?0:beat===1?1:3;}
function advance(delta){
 if(delta>0){if(beat<lastBeat())beat++;else if(current<chapters.length-1){current++;beat=0;}else return;}
 else{if(beat>0)beat--;else if(current>0){current--;beat=lastBeat();}else return;}
 applyBeat();history.replaceState(null,'','#'+(current+1));render();$('#stage').classList.remove('enter');void $('#stage').offsetWidth;$('#stage').classList.add('enter');window.scrollTo(0,0);
}
function renderBeat(){
 let b=BEATS[current][beat];
 $('#intro').textContent=b[1];let lead=$('#beatLead');if(!lead){lead=document.createElement('div');lead.id='beatLead';$('#intro').before(lead);}lead.textContent=b[0];
 $('#eyebrow').textContent=chapters[current].label+' · STEP '+(beat+1)+' / '+BEATS[current].length;
 const atStart=current===0&&beat===0,atEnd=current===chapters.length-1&&beat===lastBeat();
 $('#prev').disabled=atStart;$('#next').disabled=atEnd;
 sendReviewTarget(chapters[current].id==='pilots'&&beat<2?'pilot:'+pilot:b[2]);
}
function sendReviewTarget(target){
 const info={type:'rav-chapter',chapter:current,step:beat,name:chapters[current].name,target,atStart:current===0&&beat===0,atEnd:current===chapters.length-1&&beat===lastBeat()};
 if(parent!==window){if(parent.RAVSync)parent.RAVSync(info);else parent.postMessage(info,location.origin);}
}
applyBeat();
const originalRender=render;
render=function(){originalRender();renderBeat();};
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='rav-control')return;if(e.data.action==='next')advance(1);if(e.data.action==='previous')advance(-1);});
render();


window.RAVPresentation={next:()=>advance(1),previous:()=>advance(-1)};

document.addEventListener("error",e=>{if(e.target.matches?.(".photo-shot")){e.target.hidden=true;e.target.parentElement.classList.add("photo-unavailable");e.target.parentElement.textContent="Photo unavailable — open the credited source below.";}},true);
