import React,{useState}from'react';
import{SlidersHorizontal,Palette,CircleDot,Type,RotateCcw,Sun,Contrast}from'lucide-react';
const colours=['red','orange','yellow','green','cyan','blue','purple','magenta'];
const title={red:'Red',orange:'Orange',yellow:'Yellow',green:'Green',cyan:'Cyan',blue:'Blue',purple:'Purple',magenta:'Magenta'};
function ToneCurve({values,onChange}){
 const channels=[['Master','curveMaster','#d8c49a'],['Red','curveRed','#ed7770'],['Green','curveGreen','#82c58c'],['Blue','curveBlue','#82a9e8']];
 const [channel,setChannel]=React.useState('curveMaster'),[selected,setSelected]=React.useState(null);
 const drag=React.useRef(null);
 const active=channels.find(c=>c[1]===channel),points=values[channel]||[{x:0,y:0},{x:1,y:1}],sorted=[...points].sort((a,b)=>a.x-b.x);
 const path=sorted.map((p,i)=>(i?'L':'M')+' '+(12+p.x*216)+' '+(168-p.y*156)).join(' ');
 const coords=e=>{const r=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*240,y:(e.clientY-r.top)/r.height*180};};
 const publish=next=>onChange({...values,[channel]:next});
 const change=(index,p)=>{const next=[...sorted];if(index===0||index===next.length-1)return;const minX=next[index-1].x+.005,maxX=next[index+1].x-.005;next[index]={x:Math.max(minX,Math.min(maxX,(p.x-12)/216)),y:Math.max(0,Math.min(1,(168-p.y)/156))};publish(next);};
 const begin=e=>{const p=coords(e),nearest=sorted.map((v,i)=>({i,x:12+v.x*216,y:168-v.y*156})).map(v=>({...v,d:Math.hypot(v.x-p.x,v.y-p.y)})).sort((a,b)=>a.d-b.d)[0];if(!nearest||nearest.d>18)return;e.preventDefault();drag.current={index:nearest.i,pointerId:e.pointerId};setSelected(nearest.i);e.currentTarget.setPointerCapture(e.pointerId);};
 const move=e=>{if(!drag.current||drag.current.pointerId!==e.pointerId)return;e.preventDefault();change(drag.current.index,coords(e));};
 const finish=e=>{if(drag.current&&drag.current.pointerId===e.pointerId)drag.current=null;};
 const add=e=>{const p=coords(e),point={x:Math.max(0,Math.min(1,(p.x-12)/216)),y:Math.max(0,Math.min(1,(168-p.y)/156))};if(sorted.length>=12)return;const next=[...sorted,point].sort((a,b)=>a.x-b.x);publish(next);setSelected(next.indexOf(point));};
 const reset=()=>{publish([{x:0,y:0},{x:1,y:1}]);setSelected(null);drag.current=null;};
 const remove=()=>{if(selected===null||selected===0||selected===sorted.length-1)return;publish(sorted.filter((_,i)=>i!==selected));setSelected(null);};
 return <div className="tone-curve-editor">
  <div className="tone-curve-tabs">{channels.map(([label,key,color])=><button key={key} className={channel===key?'active':''} style={{'--curve-channel':color}} onClick={()=>{setChannel(key);setSelected(null);drag.current=null;}}>{label}</button>)}</div>
  <svg className="tone-curve-graph" viewBox="0 0 240 180" preserveAspectRatio="none" role="img" aria-label={active[0]+' tone curve. Drag a point; double-click to add.'} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onDoubleClick={add}>
   {[0,1,2,3,4].map(n=><g key={n}><path d={'M '+(12+n*54)+' 12 V 168'} stroke="#ffffff18"/><path d={'M 12 '+(12+n*39)+' H 228'} stroke="#ffffff18"/></g>)}
   <path d="M12 168 L228 12" stroke="#817761" strokeDasharray="4 4" fill="none" pointerEvents="none"/><path d={path} stroke={active[2]} strokeWidth="2.8" fill="none" strokeLinejoin="round" pointerEvents="none"/>
   {sorted.map((p,i)=><circle key={i} cx={12+p.x*216} cy={168-p.y*156} r={selected===i?6:5.5} fill={active[2]} stroke="#181713" strokeWidth="2" pointerEvents="none"/>)}
  </svg>
  <div className="tone-curve-actions"><span>Drag a control point · double-click to add · endpoints are fixed</span><button className="pro-reset" disabled={selected===null||selected===0||selected===sorted.length-1} onClick={remove}>Remove point</button><button className="pro-reset" onClick={reset}>Reset channel</button></div>
 </div>;
}
function Range({label,value,min=-100,max=100,onChange}){return <label className="pro-range"><span>{label}<output>{value}</output></span><input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function Wheel({name,description,color,amount,onColor,onAmount}){return <div className="colour-wheel-control"><div className="colour-wheel-heading"><span className={'colour-wheel-disc '+name} style={{'--wheel-tint':color}}/><div><b>{name}</b><small>{description}</small></div></div><label className="wheel-tint-picker">Tint <input type="color" value={color} onChange={e=>onColor(e.target.value)}/></label><Range label="Strength" min={0} max={100} value={amount} onChange={onAmount}/></div>}
export default function ProStudio({values,onChange,design,onDesignChange,disabled}){
 const [colour,setColour]=useState('orange');
 const set=(key,val)=>onChange({...values,[key]:val});
 const setDesign=(key,val)=>onDesignChange({...design,[key]:val});
 const resetWheels=()=>onChange({...values,shadowTint:'#ffffff',midTint:'#ffffff',highlightTint:'#ffffff',shadowTintAmount:0,midTintAmount:0,highlightTintAmount:0});
 return <div className="pro-studio">
  <section className="pro-section"><header><Palette size={15}/><div><b>HSL COLOUR MIXER</b><small>Fine-tune individual colour ranges</small></div></header>
   <div className="hsl-swatches">{colours.map(k=><button key={k} className={colour===k?'active':''} title={title[k]} onClick={()=>setColour(k)}><i className={'hsl-'+k}/></button>)}</div>
   <div className="pro-selected">{title[colour]} channel</div>
   <Range label="Hue" min={-100} max={100} value={values['hsl'+colour+'Hue']||0} onChange={n=>set('hsl'+colour+'Hue',n)}/>
   <Range label="Saturation" value={values['hsl'+colour+'Sat']||0} onChange={n=>set('hsl'+colour+'Sat',n)}/>
   <Range label="Luminance" value={values['hsl'+colour+'Lum']||0} onChange={n=>set('hsl'+colour+'Lum',n)}/>
  </section>
  <section className="pro-section"><header><Contrast size={15}/><div><b>THREE-WAY COLOUR GRADING</b><small>Separate colour tint for tonal ranges</small></div><button className="pro-reset" onClick={resetWheels}><RotateCcw size={12}/></button></header>
   <p className="colour-wheel-note">Tint shadows, midtones and highlights independently. Strength controls how much each tint influences its tonal range.</p>
   <Wheel name="Shadows" description="Deep tones" color={values.shadowTint||'#ffffff'} amount={values.shadowTintAmount||0} onColor={v=>set('shadowTint',v)} onAmount={v=>set('shadowTintAmount',v)}/>
   <Wheel name="Midtones" description="Balanced tones" color={values.midTint||'#ffffff'} amount={values.midTintAmount||0} onColor={v=>set('midTint',v)} onAmount={v=>set('midTintAmount',v)}/>
   <Wheel name="Highlights" description="Bright tones" color={values.highlightTint||'#ffffff'} amount={values.highlightTintAmount||0} onColor={v=>set('highlightTint',v)} onAmount={v=>set('highlightTintAmount',v)}/>
  </section>
  <section className="pro-section"><header><SlidersHorizontal size={15}/><div><b>RGB TONE CURVES</b><small>Shape luminance and individual colour channels</small></div></header><ToneCurve values={values} onChange={onChange}/><div className="tone-curve-footnote">Curves are applied during image rendering and export.</div></section>
  <section className="pro-section"><header><CircleDot size={15}/><div><b>RADIAL LIGHT MASK</b><small>Feathered local exposure adjustment</small></div></header>
   <Range label="Exposure" value={values.maskAmount||0} onChange={n=>set('maskAmount',n)}/><Range label="Horizontal position" min={0} max={100} value={Math.round((values.maskX??.5)*100)} onChange={n=>set('maskX',n/100)}/><Range label="Vertical position" min={0} max={100} value={Math.round((values.maskY??.5)*100)} onChange={n=>set('maskY',n/100)}/><Range label="Radius" min={5} max={90} value={Math.round((values.maskRadius??.35)*100)} onChange={n=>set('maskRadius',n/100)}/><Range label="Feather" min={1} max={80} value={Math.round((values.maskFeather??.2)*100)} onChange={n=>set('maskFeather',n/100)}/><button className="pro-reset" onClick={()=>onChange({...values,maskAmount:0,maskX:.5,maskY:.5,maskRadius:.35,maskFeather:.2})}>Reset radial mask</button>
  </section>
  <section className="pro-section"><header><Type size={15}/><div><b>SOCIAL CANVAS</b><small>Editorial text overlay included in export</small></div></header>
   <input className="pro-text" value={design.text||''} maxLength={90} onChange={e=>setDesign('text',e.target.value)} placeholder="Write a title or caption..."/>
   <div className="pro-two"><label>Placement<select value={design.position||'bottom'} onChange={e=>setDesign('position',e.target.value)}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></label><label>Alignment<select value={design.align||'center'} onChange={e=>setDesign('align',e.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></div>
   <div className="pro-two"><label>Colour<input type="color" value={design.color||'#ffffff'} onChange={e=>setDesign('color',e.target.value)}/></label><label>Size<input type="range" min=".025" max=".1" step=".005" value={design.size||.055} onChange={e=>setDesign('size',Number(e.target.value))}/></label></div>
   <button className="pro-reset" onClick={()=>onDesignChange({text:'',color:'#ffffff',position:'bottom',align:'center',size:.055})}>Clear text</button>
  </section>
 </div>;
}
