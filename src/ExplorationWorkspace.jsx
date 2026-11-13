import React,{useCallback,useEffect,useMemo,useRef,useState}from'react';
import{ArrowLeft,Copy,Download,ExternalLink,FileImage,Link2,MousePointer2,Plus,Save,Sparkles,MessageCircle,Trash2,ZoomIn,ZoomOut}from'lucide-react';

const DB_NAME='stillroom-projects';
const STORE='projects';
const PROJECT_ID='stillroom-exploration-v1';
const uid=()=>globalThis.crypto?.randomUUID?.()||'node-'+Date.now()+'-'+Math.random().toString(36).slice(2);
function openDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function readProject(){const db=await openDb();return new Promise((resolve,reject)=>{const request=db.transaction(STORE,'readonly').objectStore(STORE).get(PROJECT_ID);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});}
async function writeProject(project){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(project);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}

async function renderExperimentBlob(sourceBlob,settings,intensity){
 let bitmap=null,url=null;
 try{
  if(typeof createImageBitmap==='function'){try{bitmap=await createImageBitmap(sourceBlob,{resizeWidth:1536,resizeQuality:'high'});}catch(error){console.warn('[Stillroom experiment] Resized bitmap unavailable; using image fallback.',error);}}
  if(!bitmap){url=URL.createObjectURL(sourceBlob);bitmap=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not decode the experiment source.'));image.src=url;});}
  const sw=bitmap.width||bitmap.naturalWidth,sh=bitmap.height||bitmap.naturalHeight,ratio=Math.min(1,1536/Math.max(sw,sh)),width=Math.max(1,Math.round(sw*ratio)),height=Math.max(1,Math.round(sh*ratio)),canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Could not create a local variation canvas.');
  ctx.drawImage(bitmap,0,0,width,height);const frame=ctx.getImageData(0,0,width,height),pixels=frame.data,t=Math.max(0,Math.min(1,intensity/100));
  for(let i=0;i<pixels.length;i+=4){
   let r=pixels[i],g=pixels[i+1],b=pixels[i+2],l=.2126*r+.7152*g+.0722*b;
   const contrast=1+(settings.contrast-1)*t,brightness=settings.brightness*t,saturation=1+(settings.saturation-1)*t,warm=settings.warm*t,shadow=settings.shadowLift*t*Math.max(0,1-l/150);
   r=(r-127.5)*contrast+127.5+brightness+shadow+warm;g=(g-127.5)*contrast+127.5+brightness+shadow;b=(b-127.5)*contrast+127.5+brightness+shadow-warm;
   const y=.2126*r+.7152*g+.0722*b;r=y+(r-y)*saturation;g=y+(g-y)*saturation;b=y+(b-y)*saturation;
   pixels[i]=Math.max(0,Math.min(255,r));pixels[i+1]=Math.max(0,Math.min(255,g));pixels[i+2]=Math.max(0,Math.min(255,b));
  }
  ctx.putImageData(frame,0,0);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not render this variation.')),'image/jpeg',.94));
  return {blob,width,height};
 }finally{bitmap?.close?.();if(url)URL.revokeObjectURL(url);}
}

export default function ExplorationWorkspace(){
 const [nodes,setNodes]=useState([]),[edges,setEdges]=useState([]),[offset,setOffset]=useState({x:80,y:70}),[scale,setScale]=useState(1),[selected,setSelected]=useState([]),[connectMode,setConnectMode]=useState(false),[projectName,setProjectName]=useState('Untitled exploration'),[status,setStatus]=useState('Loading local project…'),[ready,setReady]=useState(false);
 const [urls,setUrls]=useState({}),[variationIntensity,setVariationIntensity]=useState(100),[variationBusy,setVariationBusy]=useState(false);
 const [compareOpen,setCompareOpen]=useState(false),[comparePosition,setComparePosition]=useState(50),[compareVariationId,setCompareVariationId]=useState(null),[discoverOpen,setDiscoverOpen]=useState(false),[collabOpen,setCollabOpen]=useState(false),[collabBusy,setCollabBusy]=useState(false),[collabResult,setCollabResult]=useState(null),[collabError,setCollabError]=useState('');
 const urlRegistry=useRef(new Map());
 const stage=useRef(null),world=useRef(null),drag=useRef(null),pan=useRef(null),fileInput=useRef(null),saveTimer=useRef(null),raf=useRef(0),pointer=useRef(null);
 useEffect(()=>{let alive=true;readProject().then(project=>{if(!alive)return;if(project){setNodes(project.nodes||[]);setEdges(project.edges||[]);setProjectName(project.name||'Untitled exploration');}setStatus(project?'Project restored from this device':'New local project');setReady(true);}).catch(error=>{console.error('[Stillroom workspace] IndexedDB read failed',error);setStatus('Local project storage unavailable');setReady(true);});return()=>{alive=false;};},[]);
 useEffect(()=>{
  const liveIds=new Set(nodes.map(node=>node.id));
  let changed=false;
  for(const [id,entry] of urlRegistry.current){if(!liveIds.has(id)){URL.revokeObjectURL(entry.url);urlRegistry.current.delete(id);changed=true;}}
  for(const node of nodes){if(node.blob&&!urlRegistry.current.has(node.id)){urlRegistry.current.set(node.id,{blob:node.blob,url:URL.createObjectURL(node.blob)});changed=true;}}
  if(changed){const next={};for(const [id,entry] of urlRegistry.current)next[id]=entry.url;setUrls(next);}
},[nodes]);
 useEffect(()=>()=>{for(const entry of urlRegistry.current.values())URL.revokeObjectURL(entry.url);urlRegistry.current.clear();},[]);
 const save=useCallback(async()=>{if(!ready)return;try{await writeProject({id:PROJECT_ID,name:projectName,nodes,edges,updatedAt:Date.now(),version:1});setStatus('Saved on this device');}catch(error){console.error('[Stillroom workspace] Save failed',error);setStatus('Could not save locally — check browser storage');}},[ready,projectName,nodes,edges]);
 useEffect(()=>{if(!ready)return;clearTimeout(saveTimer.current);saveTimer.current=setTimeout(save,450);return()=>clearTimeout(saveTimer.current);},[save,ready]);
 const importFiles=async files=>{const list=[...files].filter(file=>file.type.startsWith('image/'));if(!list.length)return;const added=[];for(const file of list){const id=uid();added.push({id,type:'image',role:nodes.length?'experiment':'source',title:file.name.replace(/\.[^.]+$/,''),blob:file,x:80+(nodes.length+added.length)*34,y:80+(nodes.length+added.length)*28,width:260,height:210,createdAt:Date.now()});}setNodes(current=>[...current,...added]);setSelected([added[0].id]);setStatus('Photograph added to your canvas');};
 const duplicate=()=>{const source=nodes.find(node=>node.id===selected[selected.length-1]);if(!source)return;const copy={...source,id:uid(),role:'experiment',title:source.title+' — experiment',x:source.x+42,y:source.y+48,createdAt:Date.now()};setNodes(current=>[...current,copy]);setEdges(current=>[...current,{id:uid(),from:source.id,to:copy.id}]);setSelected([copy.id]);};
 const discoveryDirections=[
  {id:'cinematic',title:'After the light',description:'Try restrained contrast, deeper shadows, and cinematic colour separation.',hint:'In Refine: explore Cinematic looks, then adjust highlights and shadows.'},
  {id:'dreamlike',title:'Somewhere unreal',description:'Explore a softer, more atmospheric version with gentle colour shifts.',hint:'In Refine: try softer contrast, muted saturation, and a warmer or cooler palette.'},
  {id:'graphic',title:'Shape and silence',description:'Emphasize bold silhouettes and simplify the visual palette.',hint:'In Refine: experiment with monochrome, strong tonal separation, and crop.'},
  {id:'unexpected',title:'Against the mood',description:'Invert the expected feeling of the photograph using contrasting colour and light.',hint:'In Refine: choose a look outside your usual category and refine manually.'}
 ];
 const selectedNode=nodes.find(node=>node.id===selected[selected.length-1]);
 const compareStage=useRef(null),compareDragging=useRef(false);
 const moveCompareDivider=event=>{if(!compareDragging.current||!compareStage.current)return;const rect=compareStage.current.getBoundingClientRect();setComparePosition(Math.max(0,Math.min(100,((event.clientX-rect.left)/rect.width)*100)));};
 const compareParent=selectedNode?(nodes.find(node=>node.id===selectedNode.creativeDirection?.baseNodeId)||nodes.find(node=>edges.some(edge=>edge.from===node.id&&edge.to===selectedNode.id))):null;
 const compareSiblings=compareParent?nodes.filter(node=>node.id!==compareParent.id&&(node.creativeDirection?.baseNodeId===compareParent.id||edges.some(edge=>edge.from===compareParent.id&&edge.to===node.id))):[];
 const compareVariation=compareSiblings.find(node=>node.id===compareVariationId)||selectedNode;
 useEffect(()=>{setVariationIntensity(selectedNode?.creativeDirection?.intensity??100);},[selectedNode?.id]);
 const analyzeSelectedPhoto=async()=>{
  if(!selectedNode?.blob)return;
  setCollabBusy(true);setCollabError('');setCollabResult(null);
  let bitmap=null,objectUrl=null;
  try{
   if(typeof createImageBitmap==='function'){try{bitmap=await createImageBitmap(selectedNode.blob,{resizeWidth:128,resizeQuality:'low'});}catch(error){console.warn('[Stillroom composition] ImageBitmap resize unavailable; using image fallback.',error);}}
   if(!bitmap){objectUrl=URL.createObjectURL(selectedNode.blob);bitmap=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not read this photograph locally.'));image.src=objectUrl;});}
   const sourceWidth=bitmap.width||bitmap.naturalWidth,sourceHeight=bitmap.height||bitmap.naturalHeight,factor=Math.min(1,128/Math.max(sourceWidth,sourceHeight)),width=Math.max(1,Math.round(sourceWidth*factor)),height=Math.max(1,Math.round(sourceHeight*factor));
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Local image analysis is unavailable in this browser.');
   ctx.drawImage(bitmap,0,0,width,height);const data=ctx.getImageData(0,0,width,height).data;
   let lum=0,lum2=0,sat=0,warmth=0,count=0;const zones=Array.from({length:9},()=>({lum:0,sat:0,warm:0,count:0}));
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),l=.2126*r+.7152*g+.0722*b,v=max===0?0:(max-min)/max,w=r-b;lum+=l;lum2+=l*l;sat+=v;warmth+=w;count++;const col=Math.min(2,Math.floor(x/width*3)),row=Math.min(2,Math.floor(y/height*3)),z=zones[row*3+col];z.lum+=l;z.sat+=v;z.warm+=w;z.count++;}
   const mean=lum/count,contrast=Math.sqrt(Math.max(0,lum2/count-mean*mean)),saturation=sat/count,temperature=warmth/count,names=['Upper left','Upper centre','Upper right','Middle left','Centre','Middle right','Lower left','Lower centre','Lower right'];
   const spatial=zones.map((z,i)=>({name:names[i],brightness:z.lum/Math.max(1,z.count),saturation:z.sat/Math.max(1,z.count),warmth:z.warm/Math.max(1,z.count)})),brightest=[...spatial].sort((a,b)=>b.brightness-a.brightness)[0],darkest=[...spatial].sort((a,b)=>a.brightness-b.brightness)[0];
   const observations=[];
   observations.push(mean>.62?'The overall frame is bright; protect highlights while shaping the mood.':mean<.34?'The frame is relatively dark; lift selective midtones before pushing contrast.':'The frame has a mid-range brightness that leaves room to explore both light and shadow.');
   observations.push(contrast<.16?'Tonal contrast is gentle; a more defined tonal structure may help.':contrast>.29?'There is already strong tonal separation; avoid crushing the shadows.':'The frame has moderate tonal separation.');
   observations.push(saturation<.25?'The palette is restrained; selective colour could become a focal point.':saturation>.55?'Colour is already expressive; try a controlled palette rather than adding more saturation.':'The colour intensity is moderate, leaving room for subtle palette changes.');
   observations.push('The brightest sampled region is '+brightest.name.toLowerCase()+', while '+darkest.name.toLowerCase()+' is the darkest.');
   if(Math.abs(temperature)>.08)observations.push(temperature>0?'The sampled palette leans warm overall.':'The sampled palette leans cool overall.');
   const suggestions=[];
   if(brightest.name.startsWith('Upper'))suggestions.push({id:'light-anchor',title:'Shape the light',reason:'The upper part of the frame carries the strongest brightness. Keep it luminous while adding depth elsewhere.',hint:'In Refine, protect highlights and gently deepen shadows; compare before and after.'});
   if(darkest.name.startsWith('Lower')||darkest.name.startsWith('Middle'))suggestions.push({id:'depth-layers',title:'Find depth in darker layers',reason:'A darker region sits '+darkest.name.toLowerCase()+'. Explore contrast without losing its detail.',hint:'Lift shadows selectively, then add restrained midtone contrast.'});
   if(saturation>.42)suggestions.push({id:'quiet-palette',title:'A quieter palette',reason:'Colour is already prominent. Try reducing overall intensity and keeping one colour as an accent.',hint:'Reduce global saturation slightly, then use HSL controls to restore a chosen colour.'});
   if(contrast<.2)suggestions.push({id:'shape-silence',title:'Shape and silence',reason:'The tonal structure is relatively gentle. Explore clearer separation between large forms.',hint:'Try a muted or monochrome look and add a small amount of contrast.'});
   if(temperature>.08)suggestions.push({id:'cool-counterpoint',title:'A cooler counterpoint',reason:'The palette leans warm. A cooler treatment could create a deliberate contrast.',hint:'Experiment with cooler colour temperature while preserving warm highlights.'});
   if(temperature<-.08)suggestions.push({id:'warm-counterpoint',title:'A warmer counterpoint',reason:'The palette leans cool. A restrained warm treatment could change the emotional tone.',hint:'Experiment with warmth in the midtones while keeping highlights controlled.'});
   if(!suggestions.length)suggestions.push({id:'unexpected',title:'Against the mood',reason:'The sampled composition is fairly balanced. Try a deliberately contrasting visual treatment.',hint:'Choose a look opposite to the current mood, then refine its colour balance.'});
   setCollabResult({observations,suggestions:suggestions.slice(0,3),metrics:{brightness:Math.round(mean*100),contrast:Math.round(contrast*100),saturation:Math.round(saturation*100)},spatial});
  }catch(error){console.error('[Stillroom local collaborator]',error);setCollabError(error.message||'Could not analyze this image.');}
  finally{bitmap?.close?.();if(objectUrl)URL.revokeObjectURL(objectUrl);setCollabBusy(false);}
 };
 const createCollaboratorBranch=async suggestion=>{
  if(!selectedNode?.blob||collabBusy)return;
  setCollabBusy(true);setCollabError('');setStatus('Creating a small local preview variation…');
  let bitmap=null,objectUrl=null;
  try{
   if(typeof createImageBitmap==='function'){try{bitmap=await createImageBitmap(selectedNode.blob,{resizeWidth:1536,resizeQuality:'high'});}catch(error){console.warn('[Stillroom variation] Resized bitmap unavailable; using canvas fallback.',error);}}
   if(!bitmap){objectUrl=URL.createObjectURL(selectedNode.blob);bitmap=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not decode this photograph locally.'));image.src=objectUrl;});}
   const sourceWidth=bitmap.width||bitmap.naturalWidth,sourceHeight=bitmap.height||bitmap.naturalHeight,ratio=Math.min(1,1536/Math.max(sourceWidth,sourceHeight)),width=Math.max(1,Math.round(sourceWidth*ratio)),height=Math.max(1,Math.round(sourceHeight*ratio));
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Could not create a local preview canvas.');
   ctx.drawImage(bitmap,0,0,width,height);const frame=ctx.getImageData(0,0,width,height),pixels=frame.data;
   const settings={
    'light-anchor':{contrast:1.10,brightness:-2,saturation:1.03,warm:2,shadowLift:5},
    'depth-layers':{contrast:1.17,brightness:0,saturation:1.02,warm:0,shadowLift:8},
    'quiet-palette':{contrast:1.04,brightness:1,saturation:.72,warm:1,shadowLift:3},
    'shape-silence':{contrast:1.18,brightness:1,saturation:0,warm:0,shadowLift:4},
    'cool-counterpoint':{contrast:1.04,brightness:0,saturation:.96,warm:-7,shadowLift:2},
    'warm-counterpoint':{contrast:1.04,brightness:1,saturation:.98,warm:7,shadowLift:2},
    'unexpected':{contrast:1.12,brightness:0,saturation:1.14,warm:-4,shadowLift:3}
   }[suggestion.id]||{contrast:1.06,brightness:0,saturation:1,warm:0,shadowLift:2};
   for(let i=0;i<pixels.length;i+=4){
    let r=pixels[i],g=pixels[i+1],b=pixels[i+2],l=.2126*r+.7152*g+.0722*b;
    const shadow=settings.shadowLift*Math.max(0,1-l/150);
    r=(r-127.5)*settings.contrast+127.5+settings.brightness+shadow+settings.warm;
    g=(g-127.5)*settings.contrast+127.5+settings.brightness+shadow;
    b=(b-127.5)*settings.contrast+127.5+settings.brightness+shadow-settings.warm;
    const y=.2126*r+.7152*g+.0722*b;
    r=y+(r-y)*settings.saturation;g=y+(g-y)*settings.saturation;b=y+(b-y)*settings.saturation;
    pixels[i]=Math.max(0,Math.min(255,r));pixels[i+1]=Math.max(0,Math.min(255,g));pixels[i+2]=Math.max(0,Math.min(255,b));
   }
   ctx.putImageData(frame,0,0);
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not render this variation.')),'image/jpeg',.94));
   const child={...selectedNode,id:uid(),role:'experiment',title:selectedNode.title+' — '+suggestion.title,blob,x:selectedNode.x+300,y:selectedNode.y+70,width:selectedNode.width||260,height:selectedNode.height||210,createdAt:Date.now(),creativeDirection:{id:suggestion.id,title:suggestion.title,hint:suggestion.hint,source:'local-visual-analysis',applied:true,baseNodeId:selectedNode.id,settings,intensity:100,renderSize:{width,height}}};
   setNodes(current=>[...current,child]);setEdges(current=>[...current,{id:uid(),from:selectedNode.id,to:child.id}]);setSelected([child.id]);setCollabOpen(false);setStatus('A visual variation was created locally. Refine it further whenever you like.');
  }catch(error){console.error('[Stillroom variation]',error);setCollabError(error.message||'Could not create this variation.');setStatus('Variation could not be created.');}
  finally{bitmap?.close?.();if(objectUrl)URL.revokeObjectURL(objectUrl);setCollabBusy(false);}
 };

 const applyVariationIntensity=async()=>{
  const sourceNode=nodes.find(node=>node.id===selectedNode?.creativeDirection?.baseNodeId);if(!sourceNode?.blob||!selectedNode?.creativeDirection?.settings||variationBusy)return;
  setVariationBusy(true);setStatus('Re-rendering experiment from its preserved source…');
  try{
   const rendered=await renderExperimentBlob(sourceNode.blob,selectedNode.creativeDirection.settings,variationIntensity);
   setNodes(current=>current.map(node=>node.id===selectedNode.id?{...node,blob:rendered.blob,creativeDirection:{...node.creativeDirection,intensity:variationIntensity,renderSize:{width:rendered.width,height:rendered.height}}}:node));
   setStatus('Experiment intensity updated from its preserved source.');
  }catch(error){console.error('[Stillroom experiment intensity]',error);setStatus(error.message||'Could not update experiment intensity.');}
  finally{setVariationBusy(false);}
 };
 const startDirection=direction=>{
  if(!selectedNode)return;
  const source=selectedNode;
  const child={...source,id:uid(),role:'experiment',title:source.title+' — '+direction.title,x:source.x+300,y:source.y+30,createdAt:Date.now(),creativeDirection:{id:direction.id,title:direction.title,hint:direction.hint}};
  setNodes(current=>[...current,child]);
  setEdges(current=>[...current,{id:uid(),from:source.id,to:child.id}]);
  setSelected([child.id]);setDiscoverOpen(false);
  setStatus('Direction saved as an unedited experiment — select Refine to develop it.');
 };
 const openSelectedInEditor=()=>{const node=nodes.find(item=>item.id===selected[selected.length-1]);if(!node)return;window.location.href='/?node='+encodeURIComponent(node.id);};
 const removeSelected=()=>{setNodes(current=>current.filter(node=>!selected.includes(node.id)));setEdges(current=>current.filter(edge=>!selected.includes(edge.from)&&!selected.includes(edge.to)));setSelected([]);};
 const selectNode=id=>{if(connectMode){setSelected(current=>{if(!current.length)return[id];if(current[0]===id)return[];setEdges(edgesNow=>[...edgesNow,{id:uid(),from:current[0],to:id}]);setConnectMode(false);return[id];});return;}setSelected([id]);};
 const applyWorldTransform=(x,y)=>{if(world.current)world.current.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';};
 const onStageDown=e=>{if(e.target!==stage.current)return;pan.current={startX:e.clientX,startY:e.clientY,x:offset.x,y:offset.y,nextX:offset.x,nextY:offset.y};stage.current.setPointerCapture(e.pointerId);setSelected([]);};
 const paintPointer=()=>{
  raf.current=0;
  const point=pointer.current;
  if(!point)return;
  const activePan=pan.current;
  if(activePan){activePan.nextX=activePan.x+(point.x-activePan.startX);activePan.nextY=activePan.y+(point.y-activePan.startY);applyWorldTransform(activePan.nextX,activePan.nextY);}
  const activeDrag=drag.current;
  if(activeDrag){const dx=(point.x-activeDrag.clientX)/scale,dy=(point.y-activeDrag.clientY)/scale;activeDrag.nextX=activeDrag.x+dx;activeDrag.nextY=activeDrag.y+dy;if(activeDrag.element)activeDrag.element.style.transform='translate3d('+dx+'px,'+dy+'px,0)';}
 };
 const onStageMove=e=>{pointer.current={x:e.clientX,y:e.clientY};if(!raf.current)raf.current=requestAnimationFrame(paintPointer);};
 const onStageUp=()=>{
  if(raf.current){cancelAnimationFrame(raf.current);raf.current=0;}
  paintPointer();
  const activeDrag=drag.current;
  if(activeDrag){setNodes(current=>current.map(node=>node.id===activeDrag.id?{...node,x:activeDrag.nextX,y:activeDrag.nextY}:node));if(activeDrag.element)activeDrag.element.style.transform='';}
  const activePan=pan.current;
  if(activePan)setOffset({x:activePan.nextX,y:activePan.nextY});
  drag.current=null;pan.current=null;pointer.current=null;
 };
 const startNodeDrag=(e,node)=>{
  if(e.target.closest('button'))return;
  e.preventDefault();e.stopPropagation();
  // In connection mode, one click selects the first endpoint and the next
  // click completes the connection. Do not also start a drag gesture.
  if(connectMode){selectNode(node.id);return;}
  selectNode(node.id);
  drag.current={id:node.id,clientX:e.clientX,clientY:e.clientY,x:node.x,y:node.y,nextX:node.x,nextY:node.y,element:e.currentTarget};
  try{stage.current?.setPointerCapture(e.pointerId);}catch(error){console.warn('[Stillroom workspace] Pointer capture unavailable',error);}
 };
 const zoomAt=delta=>setScale(value=>Math.max(.35,Math.min(1.8,Number((value+delta).toFixed(2)))));
 const nodeById=id=>nodes.find(node=>node.id===id);
 const worldStyle={transform:'translate('+offset.x+'px,'+offset.y+'px) scale('+scale+')',transformOrigin:'0 0'};
 
 const edgeLines=useMemo(()=>edges.map(edge=>{const a=nodeById(edge.from),b=nodeById(edge.to);if(!a||!b)return null;return{...edge,x1:a.x+a.width/2,y1:a.y+a.height/2,x2:b.x+b.width/2,y2:b.y+b.height/2};}).filter(Boolean),[edges,nodes]);
 return <div className="explore-app">
  <header className="explore-topbar"><a href="/" className="explore-back"><ArrowLeft size={16}/> Studio</a><div className="explore-brand"><span className="explore-mark">s</span><span>stillroom</span><i>EXPLORE</i></div><input aria-label="Project name" value={projectName} onChange={e=>setProjectName(e.target.value)} /><div className="explore-save"><span>{status}</span><button onClick={save}><Save size={15}/> Save</button></div></header>
  <div className="explore-toolbar"><div className="explore-tools"><button onClick={()=>fileInput.current?.click()}><Plus size={15}/> Add photographs</button><button disabled={!selected.length} onClick={duplicate}><Copy size={14}/> Duplicate experiment</button><button disabled={!selected.length} onClick={openSelectedInEditor}><ExternalLink size={14}/> Refine selected</button><button disabled={!selected.length} onClick={()=>setDiscoverOpen(value=>!value)}><Sparkles size={14}/> Discover directions</button><button disabled={!selectedNode?.blob} onClick={()=>{setCollabOpen(true);if(!collabResult)analyzeSelectedPhoto();}}><MessageCircle size={14}/> Ask collaborator</button><button disabled={!compareParent?.blob||!selectedNode?.blob} onClick={()=>{setComparePosition(50);setCompareVariationId(selectedNode.id);setCompareOpen(true);}}><FileImage size={14}/> Compare</button><button className={connectMode?'active':''} disabled={nodes.length<2} onClick={()=>{setConnectMode(value=>!value);setSelected([]);}}><Link2 size={14}/> {connectMode?'Choose first node…':'Connect ideas'}</button><button disabled={!selected.length} onClick={removeSelected}><Trash2 size={14}/> Delete</button></div><div className="explore-zoom"><button aria-label="Zoom out" onClick={()=>zoomAt(-.1)}><ZoomOut size={15}/></button><span>{Math.round(scale*100)}%</span><button aria-label="Zoom in" onClick={()=>zoomAt(.1)}><ZoomIn size={15}/></button></div></div>
  <main ref={stage} className={'explore-canvas '+(connectMode?'connecting':'')} onPointerDown={onStageDown} onPointerMove={onStageMove} onPointerUp={onStageUp} onPointerCancel={onStageUp} onLostPointerCapture={onStageUp} onWheel={e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();zoomAt(e.deltaY<0?.05:-.05);}}}>
   <div ref={world} className="explore-world" style={worldStyle}>
    <svg className="explore-edges">{edgeLines.map(edge=><g key={edge.id}><line x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2}/><circle cx={(edge.x1+edge.x2)/2} cy={(edge.y1+edge.y2)/2} r="3"/></g>)}</svg>
    {nodes.map(node=><article key={node.id} className={'explore-node '+(selected.includes(node.id)?'selected':'')} style={{left:node.x,top:node.y,width:node.width}} onPointerDown={e=>startNodeDrag(e,node)} onClick={()=>{if(!connectMode&&!drag.current)selectNode(node.id);}}>
      <div className="explore-node-image">{urls[node.id]?<img src={urls[node.id]} draggable="false" alt={node.title}/>:<div className="explore-node-empty"><FileImage size={26}/></div>}<span>{node.role==='source'?'ORIGINAL':'EXPERIMENT'}</span></div>
      <div className="explore-node-meta"><strong>{node.title}</strong><small>{node.role==='source'?'Starting photograph':'Creative branch'}</small></div>
     </article>)}
   </div>
   {!nodes.length&&<div className="explore-empty"><div><div className="explore-empty-icon"><FileImage size={25}/></div><h1>Begin with a photograph.</h1><p>Place an image on the canvas. Duplicate it, move ideas around, and let your experiments take shape.</p><button onClick={()=>fileInput.current?.click()}><Plus size={15}/> Add your first photograph</button><small>Your images and project are stored locally in this browser.</small></div></div>}
   {connectMode&&<div className="explore-hint"><Link2 size={14}/> Select two photographs to connect them</div>}
  </main>
  {collabOpen&&selectedNode&&<aside className="explore-collab" aria-label="Stillroom creative collaborator"><div className="explore-discover-heading"><div><small>STILLROOM · LOCAL COLLABORATOR</small><h2>Let's explore this frame.</h2></div><button onClick={()=>setCollabOpen(false)} aria-label="Close collaborator">×</button></div><p>I'm looking at <strong>{selectedNode.title}</strong> using a reduced on-device sample. Your photograph is not uploaded. I compare spatial light and colour patterns, but I do not identify objects or understand scene semantics yet.</p>{collabBusy&&<div className="explore-collab-status">Reading a reduced preview locally…</div>}{collabError&&<div className="explore-collab-error">{collabError}<button onClick={analyzeSelectedPhoto}>Try again</button></div>}{collabResult&&<><div className="explore-collab-metrics"><span>Brightness <b>{collabResult.metrics.brightness}%</b></span><span>Contrast <b>{collabResult.metrics.contrast}%</b></span><span>Saturation <b>{collabResult.metrics.saturation}%</b></span></div><h3>What I notice</h3><ul>{collabResult.observations.map((item,i)=><li key={i}>{item}</li>)}</ul><h3>Directions worth trying</h3><div className="explore-discover-list">{collabResult.suggestions.map(suggestion=><button className="explore-suggestion-card" key={suggestion.id} disabled={collabBusy} onClick={()=>createCollaboratorBranch(suggestion)}><strong>{suggestion.title}</strong><span>{suggestion.reason}</span><span className="explore-create-variation">{collabBusy?"Creating variation…":"Create visual variation"} <span aria-hidden="true">↗</span></span></button>)}</div><button className="explore-collab-refresh" onClick={analyzeSelectedPhoto}>Analyze again</button></>}</aside>}
  {discoverOpen&&selectedNode&&<aside className="explore-discover" aria-label="Creative directions"><div className="explore-discover-heading"><div><small>CREATIVE DISCOVERIES</small><h2>Where could this go?</h2></div><button onClick={()=>setDiscoverOpen(false)} aria-label="Close creative directions">×</button></div><p>Choose an idea to branch from <strong>{selectedNode.title}</strong>. These are curated prompts, not AI-generated edits; your photograph stays unchanged until you refine it.</p><div className="explore-discover-list">{discoveryDirections.map(direction=><button key={direction.id} onClick={()=>startDirection(direction)}><strong>{direction.title}</strong><span>{direction.description}</span><small>Create unedited branch ↗</small></button>)}</div></aside>}
  {selectedNode?.creativeDirection?.baseNodeId&&<aside className="explore-intensity-panel"><div><small>EXPERIMENT CONTROLS</small><strong>{selectedNode.creativeDirection.title}</strong></div><label>Intensity <output>{variationIntensity}%</output></label><input type="range" min="0" max="150" step="5" value={variationIntensity} onChange={e=>setVariationIntensity(Number(e.target.value))}/><p>Changes are rendered again from the preserved source image, not from the already-edited result.</p><button disabled={variationBusy||variationIntensity===(selectedNode.creativeDirection.intensity??100)} onClick={applyVariationIntensity}>{variationBusy?'Rendering…':'Apply intensity'}</button></aside>}
  {selectedNode?.creativeDirection&&!discoverOpen&&<aside className="explore-direction-note"><strong>{selectedNode.creativeDirection.title}</strong><span>{selectedNode.creativeDirection.hint}</span><button onClick={openSelectedInEditor}>Open in Refine ↗</button></aside>}
  {compareOpen&&compareParent&&compareVariation&&urls[compareParent.id]&&urls[compareVariation.id]&&<div className="explore-compare-backdrop" role="dialog" aria-modal="true" aria-label="Compare original and experiment" onClick={()=>setCompareOpen(false)}><section className="explore-compare-modal" onClick={e=>e.stopPropagation()}><header><div><small>STILLROOM · SIDE BY SIDE IN TIME</small><h2>Compare experiments</h2><p>Keep the original fixed and move between creative branches.</p><div className="explore-compare-switcher"><button disabled={compareSiblings.findIndex(node=>node.id===compareVariation.id)<=0} onClick={()=>{const index=compareSiblings.findIndex(node=>node.id===compareVariation.id);setCompareVariationId(compareSiblings[Math.max(0,index-1)]?.id);setComparePosition(50);}}>← Previous</button><span>{Math.max(0,compareSiblings.findIndex(node=>node.id===compareVariation.id)+1)} / {compareSiblings.length}</span><button disabled={compareSiblings.findIndex(node=>node.id===compareVariation.id)>=compareSiblings.length-1} onClick={()=>{const index=compareSiblings.findIndex(node=>node.id===compareVariation.id);setCompareVariationId(compareSiblings[Math.min(compareSiblings.length-1,index+1)]?.id);setComparePosition(50);}}>Next →</button></div></div><button onClick={()=>setCompareOpen(false)} aria-label="Close comparison">×</button></header><div ref={compareStage} className="explore-compare-stage"><img className="explore-compare-base" src={urls[compareParent.id]} alt="Original photograph"/><div className="explore-compare-overlay" style={{clipPath:'inset(0 0 0 '+comparePosition+'%)'}}><img src={urls[compareVariation.id]} alt="Experiment variation"/></div><div className="explore-compare-divider" role="slider" aria-label="Reveal variation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(comparePosition)} tabIndex={0} style={{left:comparePosition+'%'}} onPointerDown={event=>{event.preventDefault();compareDragging.current=true;event.currentTarget.setPointerCapture(event.pointerId);moveCompareDivider(event);}} onPointerMove={moveCompareDivider} onPointerUp={()=>{compareDragging.current=false;}} onLostPointerCapture={()=>{compareDragging.current=false;}} onPointerCancel={()=>{compareDragging.current=false;}} onKeyDown={event=>{if(event.key==='ArrowLeft')setComparePosition(value=>Math.max(0,value-2));if(event.key==='ArrowRight')setComparePosition(value=>Math.min(100,value+2));}}><span aria-hidden="true">↔</span></div><span className="explore-compare-label original">ORIGINAL</span><span className="explore-compare-label variation">VARIATION</span></div><footer><span>{compareParent.title}</span><span>{compareVariation.title}</span></footer></section></div>}
  <footer className="explore-footer"><span><MousePointer2 size={13}/> Drag to move · Drag empty space to pan · Ctrl/⌘ + scroll to zoom</span><span>{nodes.length} {nodes.length===1?'image':'images'} · {edges.length} connections</span></footer>
  <input ref={fileInput} hidden type="file" accept="image/*" multiple onChange={e=>{importFiles(e.target.files||[]);e.target.value='';}}/>
 </div>;
}
