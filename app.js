(function(){
'use strict';
const $=id=>document.getElementById(id),{mission,defaults}=FlightModel;
const sliderUnits={range:' km',pax:' 人',hover:' min',ld:'',reserve:' min',groundSpeed:' km/h',overhead:' min'};
const inputIds=[...Object.keys(sliderUnits),'capacity','usable','costHour','turnaround','ferry'];
const scenarios={airport:{range:50,pax:4,hover:2,ld:14,reserve:20,groundSpeed:35,overhead:25},urban:{range:15,pax:2,hover:2,ld:14,reserve:20,groundSpeed:25,overhead:35},regional:{range:100,pax:4,hover:2,ld:14,reserve:20,groundSpeed:65,overhead:35}};
let current,selectedScenario='airport';
function inputs(){const p={};inputIds.forEach(id=>{p[id]=Number($(id).value);});p.usable/=100;p.ferry/=100;return p;}
function fmt(n,d=1){return n.toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d});}
function update(){
 if(!$('modelForm').checkValidity()){ $('modelStatus').className='model-status warning';$('modelStatus').textContent='请将输入调整到标注范围内，计算结果暂保留上一次有效值。';return; }
 const p=inputs();current=mission(p);
 Object.entries(sliderUnits).forEach(([id,u])=>{$(id+'Out').value=fmt(p[id],id==='hover'?1:0)+u;const el=$(id);const percent=(Number(el.value)-Number(el.min))/(Number(el.max)-Number(el.min))*100;el.style.background=`linear-gradient(to right,#37775a ${percent}%,#d5dfca ${percent}%)`;});
 const m=current;
 $('tripResult').textContent=fmt(m.tripEnergy);
 $('requiredResult').textContent=fmt(m.requiredEnergy);
 $('capacityCaption').textContent=`假设可用 ${fmt(m.usableEnergy,0)} kWh；备份 ${fmt(m.reserveEnergy)} kWh`;
 $('timeResult').textContent=(m.timeSaved>=0?'+':'−')+fmt(Math.abs(m.timeSaved));
 $('timeResult').className=m.timeSaved>=0?'positive':'negative';
 $('timeCaption').textContent=m.timeSaved>=0?'分钟，空中方案节省时间':'分钟，空中方案耗时更长';
 $('fareResult').textContent='¥ '+fmt(m.fare,0);
 const status=$('modelStatus');status.className='model-status'+(m.margin<0?' warning':'');
 status.textContent=m.margin>=0?`能量比较：剩余 ${fmt(m.margin)} kWh 裕量。仅满足本模型的能量条件；峰值功率、故障、风与运行法规仍需另行验证。`:`能量比较：缺口 ${fmt(-m.margin)} kWh。当前参数组合超过假设可用容量，不能据此安排任务；下方票价仅为成本算式结果。`;
 $('intensityResult').textContent=fmt(m.intensity,0)+' Wh / 客·巡航km（电池端）';
 const segments=[['悬停',m.hoverEnergy,'#225d49'],['过渡',m.transitionEnergy,'#6c9871'],['爬升补偿',m.climbEnergy,'#b8c6a0'],['巡航',m.cruiseEnergy,'#9db6aa'],['备份',m.reserveEnergy,'#d5a16a']];
 $('energyBar').innerHTML=segments.map(([name,v,c])=>`<div style="width:${v/m.requiredEnergy*100}%;background:${c}" title="${name} ${fmt(v)} kWh"></div>`).join('');
 $('energyBar').setAttribute('aria-label',segments.map(([name,v])=>`${name} ${fmt(v)} kWh`).join('，'));
 $('energyLegend').innerHTML=segments.map(([name,v,c])=>`<li><i style="background:${c}"></i>${name}<b>${fmt(v)}</b></li>`).join('');
 drawRange(p);
 const maxTime=Math.max(m.airDoor,m.roadDoor);$('airTimeBar').style.width=m.airDoor/maxTime*100+'%';$('roadTimeBar').style.width=m.roadDoor/maxTime*100+'%';$('airTimeLabel').textContent=fmt(m.airDoor)+' min';$('roadTimeLabel').textContent=fmt(m.roadDoor)+' min';
}
function drawRange(p){
 const w=660,h=250,left=47,right=22,top=25,bottom=36,pw=w-left-right,ph=h-top-bottom;
 const curve=Array.from({length:23},(_,i)=>mission({...p,range:10+i*5}));
 const ymax=Math.ceil(Math.max(...curve.map(m=>m.requiredEnergy),current.usableEnergy)*1.15/25)*25;
 const X=r=>left+(r-10)/110*pw,Y=e=>top+(1-e/ymax)*ph;
 let s='';
 for(let i=0;i<=4;i++){const v=ymax*i/4,y=Y(v);s+=`<path d="M${left} ${y}H${w-right}" stroke="#e3e7de" stroke-width="1"/><text x="${left-9}" y="${y+4}" text-anchor="end">${fmt(v,0)}</text>`;}
 [10,30,50,70,90,120].forEach(v=>s+=`<text x="${X(v)}" y="${h-12}" text-anchor="middle">${v}</text>`);
 const points=curve.map(m=>`${X(m.range)},${Y(m.requiredEnergy)}`).join(' ');
 s+=`<polygon points="${left},${Y(0)} ${points} ${w-right},${Y(0)}" fill="#edf2e7"/>`;
 s+=`<line x1="${left}" y1="${Y(current.usableEnergy)}" x2="${w-right}" y2="${Y(current.usableEnergy)}" stroke="#d99149" stroke-dasharray="6 4" stroke-width="1.5"/>`;
 s+=`<polyline points="${points}" fill="none" stroke="#21664e" stroke-width="2.5"/>`;
 s+=`<line x1="${X(p.range)}" y1="${Y(current.requiredEnergy)}" x2="${X(p.range)}" y2="${Y(0)}" stroke="#819e76" stroke-dasharray="3 4"/>`;
 s+=`<circle cx="${X(p.range)}" cy="${Y(current.requiredEnergy)}" r="5" fill="#21664e" stroke="#fffefa" stroke-width="2"/>`;
 const anchor=p.range>95?'end':'start',tx=X(p.range)+(anchor==='end'?-10:10),ty=Math.max(17,Y(current.requiredEnergy)-11);
 s+=`<text x="${tx}" y="${ty}" text-anchor="${anchor}" style="fill:#21664e;font-weight:600">${fmt(current.requiredEnergy)} kWh</text><text x="${left}" y="13">kWh</text><text x="${w-right}" y="${h-1}" text-anchor="end">巡航距离 / km</text>`;
 $('rangeChart').innerHTML=s;$('rangeChart').setAttribute('aria-label',`巡航距离10至120公里时消耗加备份能量的变化。当前${p.range}公里，需要${fmt(current.requiredEnergy)}千瓦时，可用${fmt(current.usableEnergy)}千瓦时。`);
}
function selectScenario(name){
 selectedScenario=name;Object.entries(scenarios[name]).forEach(([id,v])=>$(id).value=v);
 document.querySelectorAll('[data-scenario]').forEach(b=>{const yes=b.dataset.scenario===name;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));});update();
}
inputIds.forEach(id=>$(id).addEventListener('input',()=>{selectedScenario=null;document.querySelectorAll('[data-scenario]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});update();}));
$('modelForm').addEventListener('submit',e=>e.preventDefault());
document.querySelectorAll('[data-scenario]').forEach(b=>b.addEventListener('click',()=>selectScenario(b.dataset.scenario)));
document.querySelectorAll('[data-load]').forEach(b=>b.addEventListener('click',()=>{selectScenario(b.dataset.load);$('lab').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}));
$('resetBtn').addEventListener('click',()=>{$('modelForm').reset();selectScenario('airport');});
$('downloadBtn').addEventListener('click',()=>{
 if(!$('modelForm').reportValidity())return;
 const rows=[['类型','参数','数值','单位或说明'],['说明','模型','概念设计估算','未经 Joby 实机功率数据校准；成本为人民币教学假设'],['说明','资料截止','2026-11-17','固定研究日期']];
 const units={range:'km，巡航段',pax:'人，不含飞行员',hover:'min，垂直阶段等效总时间',ld:'无量纲',reserve:'min，巡航等效，非适航符合性结论',groundSpeed:'km/h',overhead:'min，两端接驳与候乘等',baseMass:'kg，含飞行员、机体和电池的示例基础质量',personMass:'kg/人，含行李',diameter:'m，示例桨径',rho:'kg/m3',fm:'悬停品质因数',motor:'电机逆变器效率',prop:'巡航螺旋桨效率',speed:'km/h，巡航速度',aux:'kW',transition:'min',transitionFactor:'不含辅机的悬停功率倍数',height:'m',capacity:'kWh，假设名义容量',usable:'可用比例',chargeEff:'壁端到电池效率',costHour:'CNY/机时，含周转的分摊，已含电池折旧',landing:'CNY/航段，合计场站成本',tariff:'CNY/kWh',turnaround:'min',ferry:'空驶/收费航段比，假定等成本',roadFactor:'道路距离/巡航距离',mass:'kg',weight:'N',area:'m2',hoverPower:'kW，电池端',cruisePower:'kW，电池端',cruiseTime:'min',hoverEnergy:'kWh',transitionEnergy:'kWh',climbEnergy:'kWh',cruiseEnergy:'kWh',tripEnergy:'kWh，预计消耗',reserveEnergy:'kWh，计划保留',requiredEnergy:'kWh，消耗加备份',usableEnergy:'kWh',margin:'kWh，负值为能量缺口',airborne:'min',airDoor:'min',roadDistance:'km',roadDoor:'min',timeSaved:'min，正值为空中节省',wallEnergy:'kWh，不计未使用备份',cost:'CNY/收费航段',fare:'CNY/付费乘客，不含利润',intensity:'Wh/客·巡航km，电池端',reserveFraction:'备份占总需求比例'};
 Object.entries(current).forEach(([k,v])=>rows.push([Object.hasOwn(defaults,k)?'输入或固定假设':'输出',k,Number(v.toFixed(6)),units[k]||'']));
 const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download='joby-mission-calculation.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
const phaseData={hover:{kicker:'THRUST-BORNE',title:'以推力支撑重量',text:'垂直起降时，推进单元主要向上提供推力。低速下机翼难以独立承担重量，悬停功率对重量、总盘面积和空气密度敏感。',equation:'T ≈ W',constraint:'重点约束：电池峰值功率、地面效应、下洗与起降场空间。',angle:0,lift:0,label:'推力承担主要垂直支撑'},transition:{kicker:'CONVERSION / INTERACTION',title:'在变化的来流中转移支撑',text:'推进单元逐步倾转，机翼升力增加。推力既参与垂直支撑，也提供加速；控制系统需要协调推力、倾转和气动操纵面。',equation:'L + Tᵥ ≈ W',constraint:'重点约束：配平、功率边界、失速与非定常安装干扰。',angle:45,lift:.65,label:'推力垂直分量与机翼升力共同支撑'},cruise:{kicker:'WING-BORNE',title:'由机翼支撑，以推力克服阻力',text:'在定常机翼承载巡航近似下，机翼提供主要升力，推进单元朝前提供推力。较高升阻比有助于降低单位距离的能量需求。',equation:'L ≈ W；T ≈ D',constraint:'重点约束：升阻比、推进效率、持续功率与能量备份。',angle:90,lift:1,label:'机翼承担主要支撑；推力朝向前进方向'}};
function phase(name,focus=false){const d=phaseData[name];['Kicker','Title','Text','Equation','Constraint'].forEach(k=>$('phase'+k).textContent=d[k.toLowerCase()]);$('phaseSvgLabel').textContent=d.label;['A','B'].forEach((r,i)=>{const x=i?416:235,y=i?116:130;$('rotor'+r).setAttribute('transform',`translate(${x} ${y}) rotate(${-d.angle})`);const endX=x-Math.sin(d.angle*Math.PI/180)*66,endY=y-Math.cos(d.angle*Math.PI/180)*66;$('thrust'+(i+1)).setAttribute('d',`M${x} ${y-13}L${endX} ${endY-13}`);});$('wingLift').setAttribute('opacity',d.lift);$('phase-panel').setAttribute('aria-labelledby','tab-'+name);document.querySelectorAll('[data-phase]').forEach(b=>{const selected=b.dataset.phase===name;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;if(selected&&focus)b.focus();});$('phaseSvg').setAttribute('aria-label',d.title+'，'+d.label);}
const tabs=[...document.querySelectorAll('[data-phase]')];tabs.forEach((b,i)=>{b.addEventListener('click',()=>phase(b.dataset.phase));b.addEventListener('keydown',e=>{let j;if(e.key==='ArrowRight')j=(i+1)%3;else if(e.key==='ArrowLeft')j=(i+2)%3;else if(e.key==='Home')j=0;else if(e.key==='End')j=2;else return;e.preventDefault();phase(tabs[j].dataset.phase,true);});});
$('printBtn').addEventListener('click',()=>window.print());
let printDetails=[];window.addEventListener('beforeprint',()=>{printDetails=[...document.querySelectorAll('details')].map(el=>({el,open:el.open}));printDetails.forEach(({el})=>el.open=true);});window.addEventListener('afterprint',()=>printDetails.forEach(({el,open})=>el.open=open));
const navLinks=[...document.querySelectorAll('.sidebar nav a')];const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(!visible.length)return;const id=visible[0].target.id;navLinks.forEach(a=>{const active=a.hash==='#'+id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});},{rootMargin:'-10% 0px -65% 0px',threshold:0});document.querySelectorAll('section[id]').forEach(s=>observer.observe(s));
update();
})();
