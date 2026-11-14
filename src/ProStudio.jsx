import React,{useState}from'react';
import{SlidersHorizontal,Palette,CircleDot,Type,RotateCcw,Sun,Contrast}from'lucide-react';
const colours=['red','orange','yellow','green','cyan','blue','purple','magenta'];
const title={red:'Red',orange:'Orange',yellow:'Yellow',green:'Green',cyan:'Cyan',blue:'Blue',purple:'Purple',magenta:'Magenta'};
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
  <section className="pro-section"><header><SlidersHorizontal size={15}/><div><b>TONE CURVE</b><small>Five-zone tonal shaping</small></div><button className="pro-reset" onClick={()=>onChange({...values,curveBlacks:0,curveShadows:0,curveMidtones:0,curveHighlights:0,curveWhites:0})}><RotateCcw size={12}/></button></header>
   <div className="curve-preview"><svg viewBox="0 0 240 120" role="img" aria-label="Tonal curve preview"><path d="M8 8V112H232" stroke="#686252" fill="none"/><path d="M8 112L232 8" stroke="#77715e" strokeDasharray="3 4" fill="none"/><path d={`M8 ${112-(values.curveBlacks||0)*.25} C55 ${95-(values.curveShadows||0)*.4},85 ${75-(values.curveMidtones||0)*.4},120 ${60-(values.curveMidtones||0)*.3} S190 ${25-(values.curveHighlights||0)*.4},232 ${8-(values.curveWhites||0)*.25}`} stroke="#d4bd8c" strokeWidth="2.5" fill="none"/></svg></div>
   <Range label="Blacks" value={values.curveBlacks||0} onChange={n=>set('curveBlacks',n)}/><Range label="Shadows" value={values.curveShadows||0} onChange={n=>set('curveShadows',n)}/><Range label="Midtones" value={values.curveMidtones||0} onChange={n=>set('curveMidtones',n)}/><Range label="Highlights" value={values.curveHighlights||0} onChange={n=>set('curveHighlights',n)}/><Range label="Whites" value={values.curveWhites||0} onChange={n=>set('curveWhites',n)}/>
  </section>
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
