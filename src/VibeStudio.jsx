import React,{useState}from'react';
import{Sparkles,Palette,Shuffle,Sunset,CloudMoon,Film,Check}from'lucide-react';
import{presets}from'./presets';
const directions=[
{title:'Neon after dark',desc:'Electric city colour, cool shadows and cinematic glow',id:'cinestill',icon:CloudMoon},
{title:'Golden nostalgia',desc:'Warm sunlight, amber highlights and gentle film texture',id:'golden',icon:Sunset},
{title:'Dream sequence',desc:'Soft luminous bloom and airy colour',id:'dream',icon:Sparkles},
{title:'35mm memories',desc:'Organic grain, warm tones and a nostalgic print finish',id:'portra',icon:Film},
{title:'Teal cinema',desc:'Cool shadows with warm cinematic contrast',id:'cinema',icon:Palette},
{title:'Monochrome drama',desc:'Bold black and white with deep contrast',id:'noir',icon:Shuffle}
];
export default function VibeStudio({onApply,disabled}){
 const[prompt,setPrompt]=useState('');
 const[chosen,setChosen]=useState('');
 const create=()=>{const q=prompt.toLowerCase();const id=q.includes('night')||q.includes('neon')||q.includes('cyber')?'cinestill':q.includes('dream')||q.includes('soft')||q.includes('ethereal')?'dream':q.includes('vintage')||q.includes('retro')||q.includes('film')?'portra':q.includes('warm')||q.includes('sun')||q.includes('gold')?'golden':q.includes('blue')||q.includes('cold')||q.includes('rain')?'bluehour':q.includes('black')||q.includes('noir')?'noir':q.includes('teal')||q.includes('cinema')?'cinema':'editorial';const p=presets.find(x=>x.id===id)||presets[0];setChosen(id);onApply(p);};
 return <div className="vibe-studio"><div className="vibe-hero"><span className="eyebrow">STILLROOM INTELLIGENCE · OFFLINE</span><h2>Find your visual mood.</h2><p>Describe a scene, a feeling or a film aesthetic. The local creative engine turns your words into an editable look recipe.</p><div className="vibe-prompt"><Sparkles size={17}/><input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&prompt.trim()&&!disabled&&create()} placeholder="e.g. rainy neon city, dreamy summer film..."/><button disabled={disabled||!prompt.trim()} onClick={create}>Create <Sparkles size={14}/></button></div><small>No cloud AI. Your prompt stays on this device; matching uses built-in creative recipes.</small></div><div className="vibe-section-head"><span>CURATED DIRECTIONS</span><span>06 MOODS</span></div><div className="vibe-directions">{directions.map(d=>{const Icon=d.icon;return <button key={d.id} disabled={disabled} className={chosen===d.id?'active':''} onClick={()=>{setChosen(d.id);onApply(presets.find(p=>p.id===d.id));}}><span className="vibe-icon"><Icon size={19}/></span><span><b>{d.title}</b><small>{d.desc}</small></span>{chosen===d.id&&<Check size={15}/>}</button>;})}</div></div>;
}