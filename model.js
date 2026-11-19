/* Conceptual mission model. All configurable values are teaching assumptions.
   SI internally; electrical power in kW and battery energy in kWh. */
(function (root) {
  'use strict';
  const defaults = Object.freeze({range:50,pax:4,hover:2,ld:14,reserve:20,groundSpeed:35,overhead:25,
    baseMass:1900,personMass:90,diameter:3,rho:1.225,fm:0.72,motor:0.92,prop:0.82,
    speed:200,aux:3,transition:2,transitionFactor:0.6,height:500,capacity:150,usable:0.8,
    chargeEff:0.92,costHour:1800,landing:180,tariff:1.2,turnaround:12,ferry:0.15,roadFactor:1.35});
  function mission(input={}) {
    const p={...defaults,...input};
    Object.entries(p).forEach(([k,v])=>{if(!Number.isFinite(v))throw new Error('Invalid parameter: '+k);});
    if(p.pax<1||p.pax>4||p.range<=0||p.ld<=0||p.rho<=0||p.diameter<=0||p.fm<=0||p.motor<=0||p.prop<=0||p.speed<=0||p.groundSpeed<=0||p.chargeEff<=0||p.capacity<=0||p.usable<=0||p.usable>1||p.hover<0||p.reserve<0)throw new Error('Parameter outside model domain');
    const mass=p.baseMass+p.personMass*p.pax,weight=mass*9.81,area=6*Math.PI*(p.diameter/2)**2;
    const hoverPower=weight*Math.sqrt(weight/(2*p.rho*area))/(p.fm*p.motor)/1000+p.aux;
    const cruisePower=weight*(p.speed/3.6)/(p.ld*p.prop*p.motor)/1000+p.aux;
    const cruiseTime=p.range/p.speed*60;
    const hoverEnergy=hoverPower*p.hover/60;
    const transitionEnergy=(p.transitionFactor*(hoverPower-p.aux)+p.aux)*p.transition/60;
    // Added potential energy is a deliberately separate conservative allowance.
    // Transition power represents level support; no regeneration is credited.
    const climbEnergy=weight*p.height/(p.prop*p.motor*3.6e6);
    const cruiseEnergy=cruisePower*cruiseTime/60;
    const tripEnergy=hoverEnergy+transitionEnergy+climbEnergy+cruiseEnergy;
    const reserveEnergy=cruisePower*p.reserve/60,requiredEnergy=tripEnergy+reserveEnergy;
    const usableEnergy=p.capacity*p.usable,margin=usableEnergy-requiredEnergy;
    const airborne=cruiseTime+p.hover+p.transition;
    const airDoor=airborne+p.overhead,roadDistance=p.range*p.roadFactor,roadDoor=roadDistance/p.groundSpeed*60;
    const wallEnergy=tripEnergy/p.chargeEff;
    const cost=(p.costHour*(airborne+p.turnaround)/60+p.landing+wallEnergy*p.tariff)*(1+p.ferry);
    return {...p,mass,weight,area,hoverPower,cruisePower,cruiseTime,hoverEnergy,transitionEnergy,climbEnergy,cruiseEnergy,tripEnergy,reserveEnergy,requiredEnergy,usableEnergy,margin,airborne,airDoor,roadDistance,roadDoor,timeSaved:roadDoor-airDoor,wallEnergy,cost,fare:cost/p.pax,intensity:tripEnergy*1000/(p.pax*p.range),reserveFraction:reserveEnergy/requiredEnergy};
  }
  const api={defaults,mission};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.FlightModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
