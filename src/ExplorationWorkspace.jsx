import React,{useCallback,useEffect,useMemo,useRef,useState}from'react';
import{ArrowLeft,Copy,Download,ExternalLink,FileImage,Link2,MousePointer2,Plus,Save,Sparkles,MessageCircle,Trash2,ZoomIn,ZoomOut,Star,GitMerge,Palette}from'lucide-react';

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


async function renderPaletteTransferBlob(sourceBlob,colors,intensity=45,preserveSkin=true){
 let bitmap=null,url=null;
 try{
  if(typeof createImageBitmap==='function'){
   try{bitmap=await createImageBitmap(sourceBlob,{resizeWidth:1024,resizeHeight:1024,resizeQuality:'high'});}
   catch(error){console.warn('[Stillroom palette transfer] Resized bitmap unavailable; using image fallback.',error);}
  }
  if(!bitmap){
   url=URL.createObjectURL(sourceBlob);
   bitmap=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not read the target photograph.'));image.src=url;});
  }
  const sw=bitmap.width||bitmap.naturalWidth,sh=bitmap.height||bitmap.naturalHeight,ratio=Math.min(1,1024/Math.max(sw,sh)),width=Math.max(1,Math.round(sw*ratio)),height=Math.max(1,Math.round(sh*ratio));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Could not create a local colour-transfer canvas.');
  ctx.drawImage(bitmap,0,0,width,height);
  const parseColour=item=>{const hex=item.hex.replace('#','');const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);return{r,g,b,l:.2126*r+.7152*g+.0722*b};};
  const paletteGroups={shadow:colors.filter(item=>item.tone==='shadow').map(parseColour).sort((a,b)=>a.l-b.l),midtone:colors.filter(item=>item.tone==='midtone').map(parseColour).sort((a,b)=>a.l-b.l),highlight:colors.filter(item=>item.tone==='highlight').map(parseColour).sort((a,b)=>a.l-b.l)};
  const allPalette=colors.map(parseColour).sort((a,b)=>a.l-b.l);
  if(allPalette.length<2)throw new Error('The reference palette needs at least two colours.');
  const chooseTone=(l)=>l<85?'shadow':l<170?'midtone':'highlight';
  const toneRange={shadow:[0,85],midtone:[85,170],highlight:[170,255]};
  const frame=ctx.getImageData(0,0,width,height),pixels=frame.data,amount=Math.max(0,Math.min(100,intensity))/100;
  for(let i=0;i<pixels.length;i+=4){
   const r=pixels[i],g=pixels[i+1],b=pixels[i+2],targetL=.2126*r+.7152*g+.0722*b;
   const tone=chooseTone(targetL),palette=paletteGroups[tone].length?paletteGroups[tone]:allPalette,[rangeMin,rangeMax]=toneRange[tone];
   const position=Math.max(0,Math.min(1,(targetL-rangeMin)/Math.max(1,rangeMax-rangeMin)))*(palette.length-1),low=Math.floor(position),high=Math.min(palette.length-1,low+1),rawMix=position-low;
   const mix=rawMix*rawMix*(3-2*rawMix),a=palette[low],bColor=palette[high];
   const pr=a.r+(bColor.r-a.r)*mix,pg=a.g+(bColor.g-a.g)*mix,pb=a.b+(bColor.b-a.b)*mix;
   const paletteL=.2126*pr+.7152*pg+.0722*pb,luminosityOffset=targetL-paletteL;
   const mappedR=pr+luminosityOffset,mappedG=pg+luminosityOffset,mappedB=pb+luminosityOffset;
   // Broad YCbCr-like colour heuristic; deliberately not face detection.
   const cb=128-0.168736*r-0.331264*g+0.5*b,cr=128+0.5*r-0.418688*g-0.081312*b;
   const skinLike=preserveSkin&&r>g&&r>b&&cr>132&&cr<180&&cb>75&&cb<135&&targetL>35&&targetL<235;
   const pixelAmount=amount*(skinLike?0.18:1);
   pixels[i]=Math.max(0,Math.min(255,r+(mappedR-r)*pixelAmount));
   pixels[i+1]=Math.max(0,Math.min(255,g+(mappedG-g)*pixelAmount));
   pixels[i+2]=Math.max(0,Math.min(255,b+(mappedB-b)*pixelAmount));
  }
  ctx.putImageData(frame,0,0);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not render the palette experiment.')),'image/jpeg',.94));
  return{blob,width,height};
 }finally{bitmap?.close?.();if(url)URL.revokeObjectURL(url);}
}

async function extractDominantPalette(blob){
 let bitmap=null,url=null;
 try{
  if(typeof createImageBitmap==='function'){
   try{bitmap=await createImageBitmap(blob,{resizeWidth:128,resizeHeight:128,resizeQuality:'high'});}
   catch(error){console.warn('[Stillroom palette] Small bitmap unavailable; using image fallback.',error);}
  }
  if(!bitmap){
   url=URL.createObjectURL(blob);
   bitmap=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not read this photograph.'));image.src=url;});
  }
  const sourceWidth=bitmap.width||bitmap.naturalWidth,sourceHeight=bitmap.height||bitmap.naturalHeight;
  const ratio=Math.min(1,128/Math.max(sourceWidth,sourceHeight)),width=Math.max(1,Math.round(sourceWidth*ratio)),height=Math.max(1,Math.round(sourceHeight*ratio));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Could not create the small palette preview.');
  ctx.drawImage(bitmap,0,0,width,height);
  const pixels=ctx.getImageData(0,0,width,height).data,bins={shadow:new Map(),midtone:new Map(),highlight:new Map()};
  let visible=0;
  for(let i=0;i<pixels.length;i+=4){
   if(pixels[i+3]<200)continue;
   const r=pixels[i],g=pixels[i+1],b=pixels[i+2],l=.2126*r+.7152*g+.0722*b;
   const tone=l<85?'shadow':l<170?'midtone':'highlight';
   const qr=r>>4,qg=g>>4,qb=b>>4,key=(qr<<8)|(qg<<4)|qb,map=bins[tone];
   let bin=map.get(key);if(!bin){bin={r:0,g:0,b:0,count:0,tone};map.set(key,bin);}
   bin.r+=r;bin.g+=g;bin.b+=b;bin.count++;visible++;
  }
  const chosen=[];
  for(const tone of ['shadow','midtone','highlight']){
   const candidates=[...bins[tone].values()].sort((a,b)=>b.count-a.count).slice(0,2);
   chosen.push(...candidates);
  }
  if(chosen.length<4){
   const all=[...Object.values(bins).flatMap(map=>[...map.values()])].sort((a,b)=>b.count-a.count);
   for(const candidate of all){if(chosen.length>=6)break;if(!chosen.includes(candidate))chosen.push(candidate);}
  }
  return chosen.slice(0,6).map((bin,index)=>({id:String(index),tone:bin.tone,hex:'#'+[bin.r,bin.g,bin.b].map(v=>Math.round(v/bin.count).toString(16).padStart(2,'0')).join('').toUpperCase(),share:visible?Math.round(bin.count/visible*100):0}));
 }finally{bitmap?.close?.();if(url)URL.revokeObjectURL(url);}
}

export default function ExplorationWorkspace(){
 const [nodes,setNodes]=useState([]),[edges,setEdges]=useState([]),[offset,setOffset]=useState({x:80,y:70}),[scale,setScale]=useState(1),[selected,setSelected]=useState([]),[connectMode,setConnectMode]=useState(false),[projectName,setProjectName]=useState('Untitled exploration'),[status,setStatus]=useState('Loading local project…'),[ready,setReady]=useState(false);
 const [urls,setUrls]=useState({}),[variationIntensity,setVariationIntensity]=useState(100),[variationBusy,setVariationBusy]=useState(false);
 const [compareOpen,setCompareOpen]=useState(false),[comparePosition,setComparePosition]=useState(50),[compareVariationId,setCompareVariationId]=useState(null),[galleryOpen,setGalleryOpen]=useState(false),[galleryFilter,setGalleryFilter]=useState('all'),[constellationOpen,setConstellationOpen]=useState(false),[constellationLeft,setConstellationLeft]=useState(''),[constellationRight,setConstellationRight]=useState(''),[constellationBusy,setConstellationBusy]=useState(false),[constellationError,setConstellationError]=useState(''),[dnaOpen,setDnaOpen]=useState(false),[fusionOpen,setFusionOpen]=useState(false),[fusionTarget,setFusionTarget]=useState(''),[fusionDonor,setFusionDonor]=useState(''),[fusionBusy,setFusionBusy]=useState(false),[fusionError,setFusionError]=useState(''),[paletteOpen,setPaletteOpen]=useState(false),[paletteBusy,setPaletteBusy]=useState(false),[paletteError,setPaletteError]=useState(''),[paletteTransferOpen,setPaletteTransferOpen]=useState(false),[paletteTarget,setPaletteTarget]=useState(''),[paletteDonor,setPaletteDonor]=useState(''),[paletteTransferIntensity,setPaletteTransferIntensity]=useState(45),[protectSkinTones,setProtectSkinTones]=useState(true),[paletteTransferBusy,setPaletteTransferBusy]=useState(false),[paletteTransferError,setPaletteTransferError]=useState(''),[palettePreviewUrl,setPalettePreviewUrl]=useState(''),[paletteOriginalUrl,setPaletteOriginalUrl]=useState(''),[palettePreviewBusy,setPalettePreviewBusy]=useState(false),[palettePreviewCompare,setPalettePreviewCompare]=useState(false),[savedPalettes,setSavedPalettes]=useState([]),[paletteLibraryLoaded,setPaletteLibraryLoaded]=useState(false),[paletteLibraryOpen,setPaletteLibraryOpen]=useState(false),[newPaletteName,setNewPaletteName]=useState(''),[paletteLibraryError,setPaletteLibraryError]=useState(''),[discoverOpen,setDiscoverOpen]=useState(false),[collabOpen,setCollabOpen]=useState(false),[collabBusy,setCollabBusy]=useState(false),[collabResult,setCollabResult]=useState(null),[collabError,setCollabError]=useState('');

 useEffect(()=>{try{const raw=localStorage.getItem("stillroom-saved-palettes-v1");if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))setSavedPalettes(parsed);}}catch(error){console.warn("[Stillroom palettes] Could not load saved palettes",error);setPaletteLibraryError("Saved palettes could not be loaded from this browser.");}finally{setPaletteLibraryLoaded(true);}},[]);
 useEffect(()=>{if(!paletteLibraryLoaded)return;try{localStorage.setItem("stillroom-saved-palettes-v1",JSON.stringify(savedPalettes));}catch(error){console.warn("[Stillroom palettes] Could not save palette library",error);setPaletteLibraryError("Browser storage is full or unavailable; palette changes may not persist.");}},[savedPalettes,paletteLibraryLoaded]);
 const saveCurrentPalette=()=>{if(!selectedNode?.visualPalette?.colors?.length)return;const name=newPaletteName.trim();if(!name){setPaletteLibraryError("Enter a name for this palette.");return;}const palette={id:uid(),name,colors:selectedNode.visualPalette.colors.map(color=>({...color})),createdAt:Date.now(),updatedAt:Date.now()};setSavedPalettes(current=>[palette,...current]);setNewPaletteName("");setPaletteLibraryError("");setStatus("Palette saved in this browser.");};
 const applySavedPalette=palette=>{if(!selectedNode)return;setNodes(current=>current.map(node=>node.id===selectedNode.id?{...node,visualPalette:{colors:palette.colors.map(color=>({...color})),analyzedAt:Date.now(),method:"saved-local-palette",savedPaletteId:palette.id}}:node));setStatus("Saved palette applied to selected experiment.");};
 const renameSavedPalette=id=>{const name=window.prompt("Rename palette");if(!name?.trim())return;setSavedPalettes(current=>current.map(palette=>palette.id===id?{...palette,name:name.trim(),updatedAt:Date.now()}:palette));};
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
 const galleryParent=selectedNode?.role==='source'?selectedNode:compareParent||selectedNode;
 const galleryVariations=galleryParent?nodes.filter(node=>node.id!==galleryParent.id&&(node.creativeDirection?.baseNodeId===galleryParent.id||edges.some(edge=>edge.from===galleryParent.id&&edge.to===node.id))):[];
 const shortlistedNodes=nodes.filter(node=>node.shortlisted&&node.blob);
 const dnaSettings=shortlistedNodes.map(node=>node.creativeDirection?.settings).filter(Boolean);
 const creativeDNA=dnaSettings.length?{contrast:dnaSettings.reduce((sum,s)=>sum+s.contrast,0)/dnaSettings.length,brightness:dnaSettings.reduce((sum,s)=>sum+s.brightness,0)/dnaSettings.length,saturation:dnaSettings.reduce((sum,s)=>sum+s.saturation,0)/dnaSettings.length,warm:dnaSettings.reduce((sum,s)=>sum+s.warm,0)/dnaSettings.length,shadowLift:dnaSettings.reduce((sum,s)=>sum+s.shadowLift,0)/dnaSettings.length}:null;
 const dnaTraits=creativeDNA?[{label:'Contrast',value:creativeDNA.contrast,low:1,high:1.2,description:creativeDNA.contrast>1.09?'Drawn to defined tonal separation':'Prefers gentle tonal transitions'},{label:'Colour',value:creativeDNA.saturation,low:0,high:1.15,description:creativeDNA.saturation<.82?'Leans towards restrained colour':'Keeps colour present'},{label:'Warmth',value:creativeDNA.warm,low:-7,high:7,description:creativeDNA.warm>2?'Often chooses warmer tones':creativeDNA.warm< -2?'Often chooses cooler tones':'Moves between warm and cool'},{label:'Shadow lift',value:creativeDNA.shadowLift,low:0,high:8,description:creativeDNA.shadowLift>4?'Likes open, visible shadows':'Keeps deeper shadow structure'}]:[];

 const getBaseNode=node=>node?(nodes.find(item=>item.id===node.creativeDirection?.baseNodeId)||nodes.find(item=>edges.some(edge=>edge.from===item.id&&edge.to===node.id))):null;
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

 const analyzePalette=async()=>{
  if(!selectedNode?.blob||paletteBusy)return;
  setPaletteBusy(true);setPaletteError('');setStatus('Reading a small local colour preview…');
  try{
   const palette=await extractDominantPalette(selectedNode.blob);
   setNodes(current=>current.map(node=>node.id===selectedNode.id?{...node,visualPalette:{colors:palette,analyzedAt:Date.now(),method:'local-quantized-preview'}}:node));
   setStatus('Colour palette extracted locally and saved with this experiment.');
  }catch(error){console.error('[Stillroom palette]',error);setPaletteError(error.message||'Could not extract this palette.');setStatus('Palette extraction failed.');}
  finally{setPaletteBusy(false);}
 };
 const generatePalettePreview=async()=>{
  const target=nodes.find(node=>node.id===paletteTarget),donor=nodes.find(node=>node.id===paletteDonor);
  if(!target?.blob||!donor?.visualPalette?.colors?.length||target.id===donor.id||palettePreviewBusy)return;
  setPalettePreviewBusy(true);setPaletteTransferError('');
  try{
   const preview=await renderPaletteTransferBlob(target.blob,donor.visualPalette.colors,paletteTransferIntensity,protectSkinTones);
   const url=URL.createObjectURL(preview.blob),originalUrl=URL.createObjectURL(target.blob);
   setPalettePreviewUrl(previous=>{if(previous)URL.revokeObjectURL(previous);return url;});
   setPaletteOriginalUrl(previous=>{if(previous)URL.revokeObjectURL(previous);return originalUrl;});
   setPalettePreviewCompare(false);
  }catch(error){setPaletteTransferError(error.message||'Could not generate preview.');}
  finally{setPalettePreviewBusy(false);}
 };
 useEffect(()=>()=>{if(palettePreviewUrl)URL.revokeObjectURL(palettePreviewUrl);if(paletteOriginalUrl)URL.revokeObjectURL(paletteOriginalUrl);},[palettePreviewUrl,paletteOriginalUrl]);
 const createPaletteTransfer=async()=>{
  const target=nodes.find(node=>node.id===paletteTarget),donor=nodes.find(node=>node.id===paletteDonor),colors=donor?.visualPalette?.colors;
  if(!target?.blob||!colors?.length||target.id===donor.id||paletteTransferBusy)return;
  setPaletteTransferBusy(true);setPaletteTransferError('');setStatus('Applying a local colour palette to a small working image…');
  try{
   const rendered=await renderPaletteTransferBlob(target.blob,colors,paletteTransferIntensity,protectSkinTones);
   const child={...target,id:uid(),role:'experiment',title:target.title+' — palette from '+donor.title,blob:rendered.blob,x:Math.max(target.x,donor.x)+300,y:Math.round((target.y+donor.y)/2)+90,createdAt:Date.now(),shortlisted:false,visualPalette:{...donor.visualPalette,sourceNodeId:donor.id},creativeDirection:{id:'palette-'+Date.now(),title:'Palette transfer',hint:'Applied the dominant colour palette from '+donor.title+' to '+target.title+'. Composition and image structure are retained; this is a local colour remap, not generative style transfer.',baseNodeId:target.id,sourceNodeIds:[target.id,donor.id],paletteIntensity:paletteTransferIntensity}};
   setNodes(current=>[...current,child]);setEdges(current=>[...current,{id:uid(),from:target.id,to:child.id},{id:uid(),from:donor.id,to:child.id}]);setSelected([child.id]);setPaletteTransferOpen(false);setStatus('Palette experiment created locally. Both source photographs remain unchanged.');
  }catch(error){console.error('[Stillroom palette transfer]',error);setPaletteTransferError(error.message||'Could not apply this palette.');setStatus('Palette transfer failed.');}
  finally{setPaletteTransferBusy(false);}
 };
 const createVisualFusion=async()=>{
  const target=nodes.find(node=>node.id===fusionTarget),donor=nodes.find(node=>node.id===fusionDonor);
  if(!target?.blob||!donor?.blob||target.id===donor.id||fusionBusy)return;
  const settings=donor.creativeDirection?.settings;
  if(!settings){setFusionError('This experiment has no transferable tonal recipe yet. Refine it and save its settings first.');return;}
  setFusionBusy(true);setFusionError('');setStatus('Transferring a visual recipe locally…');
  try{
   const rendered=await renderExperimentBlob(target.blob,settings,100);
   const child={...target,id:uid(),role:'experiment',title:target.title+' — inspired by '+(donor.creativeDirection?.title||donor.title),blob:rendered.blob,x:Math.max(target.x,donor.x)+300,y:Math.round((target.y+donor.y)/2)+90,createdAt:Date.now(),shortlisted:false,creativeDirection:{id:'fusion-'+Date.now(),title:'Visual idea fusion',hint:'Transferred tonal recipe from '+(donor.creativeDirection?.title||donor.title)+' onto '+target.title+'.',baseNodeId:target.id,sourceNodeIds:[target.id,donor.id],settings:{...settings},intensity:100,renderSize:{width:rendered.width,height:rendered.height}}};
   setNodes(current=>[...current,child]);setEdges(current=>[...current,{id:uid(),from:target.id,to:child.id},{id:uid(),from:donor.id,to:child.id}]);setSelected([child.id]);setFusionOpen(false);setStatus('Visual recipe transferred locally. Both source experiments remain unchanged.');
  }catch(error){console.error('[Stillroom visual fusion]',error);setFusionError(error.message||'Could not transfer this visual recipe.');setStatus('Visual fusion could not be created.');}
  finally{setFusionBusy(false);}
 };
 const createConstellation=async()=>{
  const left=nodes.find(node=>node.id===constellationLeft),right=nodes.find(node=>node.id===constellationRight);
  if(!left?.blob||!right?.blob||left.id===right.id||constellationBusy)return;
  const leftBase=getBaseNode(left),rightBase=getBaseNode(right);
  if(!leftBase?.blob||leftBase.id!==rightBase?.id){setConstellationError('Choose two shortlisted experiments that come from the same original photograph.');return;}
  const fallback={contrast:1,brightness:0,saturation:1,warm:0,shadowLift:0};
  const a=left.creativeDirection?.settings||fallback,b=right.creativeDirection?.settings||fallback;
  const settings={contrast:(a.contrast+b.contrast)/2,brightness:(a.brightness+b.brightness)/2,saturation:(a.saturation+b.saturation)/2,warm:(a.warm+b.warm)/2,shadowLift:(a.shadowLift+b.shadowLift)/2};
  setConstellationBusy(true);setConstellationError('');setStatus('Blending two creative directions locally…');
  try{
   const rendered=await renderExperimentBlob(leftBase.blob,settings,100);
   const child={...leftBase,id:uid(),role:'experiment',title:leftBase.title+' — constellation',blob:rendered.blob,x:Math.max(left.x,right.x)+300,y:Math.round((left.y+right.y)/2),createdAt:Date.now(),shortlisted:false,creativeDirection:{id:'constellation-'+Date.now(),title:'Creative constellation',hint:'A local blend of '+(left.creativeDirection?.title||left.title)+' and '+(right.creativeDirection?.title||right.title)+'.',baseNodeId:leftBase.id,sourceNodeIds:[left.id,right.id],settings,intensity:100,renderSize:{width:rendered.width,height:rendered.height}}};
   setNodes(current=>[...current,child]);setEdges(current=>[...current,{id:uid(),from:left.id,to:child.id},{id:uid(),from:right.id,to:child.id}]);setSelected([child.id]);setConstellationOpen(false);setStatus('A new blended experiment was created locally. Both source experiments remain unchanged.');
  }catch(error){console.error('[Stillroom constellation]',error);setConstellationError(error.message||'Could not create this constellation.');setStatus('Could not create the blended experiment.');}
  finally{setConstellationBusy(false);}
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
  <div className="explore-toolbar"><div className="explore-tools"><button onClick={()=>fileInput.current?.click()}><Plus size={15}/> Add photographs</button><button disabled={!selected.length} onClick={duplicate}><Copy size={14}/> Duplicate experiment</button><button disabled={!selected.length} onClick={openSelectedInEditor}><ExternalLink size={14}/> Refine selected</button><button disabled={!selected.length} onClick={()=>setDiscoverOpen(value=>!value)}><Sparkles size={14}/> Discover directions</button><button disabled={!selectedNode?.blob} onClick={()=>{setCollabOpen(true);if(!collabResult)analyzeSelectedPhoto();}}><MessageCircle size={14}/> Ask collaborator</button><button disabled={!selectedNode?.blob} onClick={()=>{setPaletteError("");setPaletteOpen(true);if(!selectedNode.visualPalette)analyzePalette();}}><Palette size={14}/> Colour DNA</button><button onClick={()=>{setPaletteLibraryError("");setPaletteLibraryOpen(true);}}><Palette size={14}/> Palette library</button><button disabled={nodes.filter(node=>node.blob&&node.visualPalette?.colors?.length>=2).length===0||nodes.filter(node=>node.blob).length<2} onClick={()=>{const donors=nodes.filter(node=>node.blob&&node.visualPalette?.colors?.length>=2);setPaletteTarget(selectedNode?.id||"");setPaletteDonor(donors.find(node=>node.id!==selectedNode?.id)?.id||donors[0]?.id||"");setPaletteTransferError("");setPaletteTransferOpen(true);}}><Palette size={14}/> Palette transfer</button><button disabled={!compareParent?.blob||!selectedNode?.blob} onClick={()=>{setComparePosition(50);setCompareVariationId(selectedNode.id);setCompareOpen(true);}}><FileImage size={14}/> Compare</button><button disabled={!galleryVariations.length} onClick={()=>setGalleryOpen(value=>!value)}><FileImage size={14}/> Variations <span className="explore-count">{galleryVariations.length}</span></button><button disabled={shortlistedNodes.length<2} onClick={()=>{setConstellationLeft(shortlistedNodes[0]?.id||"");setConstellationRight(shortlistedNodes[1]?.id||"");setConstellationError("");setConstellationOpen(true);}}><GitMerge size={14}/> Create constellation</button><button disabled={!shortlistedNodes.length} onClick={()=>setDnaOpen(value=>!value)}><Star size={14}/> Creative DNA</button><button disabled={nodes.filter(node=>node.blob).length<2||!shortlistedNodes.some(node=>node.creativeDirection?.settings)} onClick={()=>{setFusionTarget(selectedNode?.id||nodes.find(node=>node.role==="source")?.id||"");setFusionDonor(shortlistedNodes.find(node=>node.creativeDirection?.settings)?.id||"");setFusionError("");setFusionOpen(true);}}><Sparkles size={14}/> Visual idea fusion</button><button className={connectMode?'active':''} disabled={nodes.length<2} onClick={()=>{setConnectMode(value=>!value);setSelected([]);}}><Link2 size={14}/> {connectMode?'Choose first node…':'Connect ideas'}</button><button disabled={!selected.length} onClick={removeSelected}><Trash2 size={14}/> Delete</button></div><div className="explore-zoom"><button aria-label="Zoom out" onClick={()=>zoomAt(-.1)}><ZoomOut size={15}/></button><span>{Math.round(scale*100)}%</span><button aria-label="Zoom in" onClick={()=>zoomAt(.1)}><ZoomIn size={15}/></button></div></div>
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
  {galleryOpen&&galleryParent&&<aside className="explore-variation-gallery" aria-label="Creative variation gallery"><div className="explore-discover-heading"><div><small>STILLROOM · CREATIVE BRANCHES</small><h2>Explore your variations</h2><p>Branches from {galleryParent.title}</p></div><button onClick={()=>setGalleryOpen(false)} aria-label="Close variation gallery">×</button></div><div className="explore-gallery-filters"><button className={galleryFilter==='all'?'active':''} onClick={()=>setGalleryFilter('all')}>All <span>{galleryVariations.length}</span></button><button className={galleryFilter==='shortlist'?'active':''} onClick={()=>setGalleryFilter('shortlist')}>Shortlist <span>{galleryVariations.filter(node=>node.shortlisted).length}</span></button></div><div className="explore-variation-grid">{galleryVariations.filter(node=>galleryFilter==='all'||node.shortlisted).map((variation,index)=><article key={variation.id} className={'explore-variation-card '+(selectedNode?.id===variation.id?'active':'')}><button className="explore-variation-select" onClick={()=>{selectNode(variation.id);setGalleryOpen(false);}}><div className="explore-variation-thumb">{urls[variation.id]?<img src={urls[variation.id]} alt=""/>:<FileImage size={22}/>}<span>{String(index+1).padStart(2,'0')}</span></div><strong>{variation.creativeDirection?.title||variation.title}</strong><small>{variation.creativeDirection?.hint||'Creative branch'}</small><span className="explore-variation-open">Open experiment ↗</span></button><button className={'explore-variation-shortlist '+(variation.shortlisted?'saved':'')} aria-label={variation.shortlisted?'Remove from shortlist':'Add to shortlist'} title={variation.shortlisted?'Remove from shortlist':'Keep this direction'} onClick={()=>setNodes(current=>current.map(node=>node.id===variation.id?{...node,shortlisted:!node.shortlisted}:node))}><Star size={14} fill={variation.shortlisted?'currentColor':'none'}/>{variation.shortlisted?'Kept':'Keep'}</button></article>)}</div>{galleryFilter==='shortlist'&&!galleryVariations.some(node=>node.shortlisted)&&<div className="explore-gallery-empty">Your shortlist is empty. Keep the experiments you want to develop further.</div>}</aside>}

  {paletteOpen&&selectedNode&&<aside className="explore-dna-panel explore-palette-panel"><div className="explore-discover-heading"><div><small>STILLROOM · LOCAL COLOUR ANALYSIS</small><h2>Colour DNA</h2><p>Dominant colours found in {selectedNode.title}.</p></div><button onClick={()=>setPaletteOpen(false)} aria-label="Close colour DNA">×</button></div>{paletteBusy?<p>Analysing a tiny preview locally…</p>:paletteError?<p className="explore-constellation-error">{paletteError}</p>:selectedNode.visualPalette?.colors?.length?<><div className="explore-palette-swatches">{selectedNode.visualPalette.colors.map(color=><div key={color.id} className="explore-palette-swatch"><div style={{backgroundColor:color.hex}}/><strong>{color.hex}</strong><small>{color.tone||"colour"} · {color.share}%</small><input className="explore-palette-colour-input" type="color" value={/^#[0-9A-Fa-f]{6}$/.test(color.hex)?color.hex:"#808080"} aria-label={"Edit "+(color.tone||"")+" colour "+color.hex} onChange={event=>setNodes(current=>current.map(node=>node.id===selectedNode.id?{...node,visualPalette:{...node.visualPalette,colors:node.visualPalette.colors.map(item=>item.id===color.id?{...item,hex:event.target.value.toUpperCase(),customized:true}:item)}}:node))}/><button onClick={()=>navigator.clipboard?.writeText(color.hex)}>Copy</button></div>)}</div><p className="explore-dna-note">Edit any swatch with its colour picker. Changes are saved with this experiment and used by Palette Transfer. Extracted from a 128px preview; this is colour analysis, not full artistic style understanding.</p><div className="explore-palette-library-save"><input value={newPaletteName} onChange={event=>setNewPaletteName(event.target.value)} placeholder="Name this palette" aria-label="Palette name"/><button disabled={!newPaletteName.trim()} onClick={saveCurrentPalette}>Save to library</button></div><button className="explore-dna-suggest" onClick={()=>setPaletteLibraryOpen(true)}>Open palette library <Palette size={14}/></button></>:<><p>No palette has been extracted yet.</p><button className="explore-dna-suggest" onClick={analyzePalette} disabled={paletteBusy}>Extract palette <Palette size={14}/></button></>}</aside>}

  {paletteLibraryOpen&&<div className="explore-constellation-backdrop"><section className="explore-constellation-panel explore-palette-transfer-panel" role="dialog" aria-modal="true" aria-label="Saved palette library"><div className="explore-discover-heading"><div><small>STILLROOM · YOUR LOCAL COLLECTION</small><h2>Palette library</h2><p>Saved palettes are stored in this browser, separately from individual exploration projects.</p></div><button onClick={()=>setPaletteLibraryOpen(false)} aria-label="Close palette library">×</button></div>{paletteLibraryError&&<p className="explore-constellation-error">{paletteLibraryError}</p>}<div className="explore-palette-library-save"><input value={newPaletteName} onChange={event=>setNewPaletteName(event.target.value)} placeholder="Name this palette" aria-label="Palette name"/><button disabled={!selectedNode?.visualPalette?.colors?.length||!newPaletteName.trim()} onClick={saveCurrentPalette}>Save selected palette</button></div><div className="explore-palette-library-list">{savedPalettes.map(palette=><article key={palette.id} className="explore-palette-library-item"><strong>{palette.name}</strong><div className="explore-palette-transfer-preview">{palette.colors.map(color=><span key={color.id} title={color.hex} style={{backgroundColor:color.hex}}/>)}</div><small>{palette.colors.length} colours</small><div className="explore-palette-library-actions"><button onClick={()=>applySavedPalette(palette)} disabled={!selectedNode}>Apply to selected</button><button onClick={()=>renameSavedPalette(palette.id)}>Rename</button><button onClick={()=>setSavedPalettes(current=>current.filter(item=>item.id!==palette.id))}>Delete</button></div></article>)}{!savedPalettes.length&&<p className="explore-dna-note">No saved palettes yet. Extract a Colour DNA palette, then save it here.</p>}</div></section></div>}
  {paletteTransferOpen&&<div className="explore-constellation-backdrop"><section className="explore-constellation-panel explore-palette-transfer-panel" role="dialog" aria-modal="true" aria-label="Palette transfer"><div className="explore-discover-heading"><div><small>STILLROOM · LOCAL COLOUR EXPERIMENT</small><h2>Borrow a colour palette</h2><p>Remap colour relationships while preserving the target photograph's composition. Originals stay untouched.</p></div><button onClick={()=>setPaletteTransferOpen(false)} aria-label="Close palette transfer">×</button></div><div className="explore-constellation-pickers explore-palette-pickers"><label>Photograph to transform<select value={paletteTarget} onChange={event=>setPaletteTarget(event.target.value)}><option value="">Choose a target</option>{nodes.filter(node=>node.blob).map(node=><option key={node.id} value={node.id}>{node.title}</option>)}</select></label><label>Colour palette from<select value={paletteDonor} onChange={event=>setPaletteDonor(event.target.value)}><option value="">Choose a palette</option>{nodes.filter(node=>node.blob&&node.visualPalette?.colors?.length>=2).map(node=><option key={node.id} value={node.id}>{node.title}</option>)}</select></label></div>{nodes.find(node=>node.id===paletteDonor)?.visualPalette?.colors?.length>0&&<div className="explore-palette-transfer-preview">{nodes.find(node=>node.id===paletteDonor).visualPalette.colors.map(color=><span key={color.id} title={color.hex} style={{backgroundColor:color.hex}}/>)}</div>}<div className="explore-palette-lab-actions"><button disabled={palettePreviewBusy||!paletteTarget||!paletteDonor||paletteTarget===paletteDonor} onClick={generatePalettePreview}>{palettePreviewBusy?"Rendering preview…":"Preview palette"}</button>{palettePreviewUrl&&<button onClick={()=>setPalettePreviewCompare(value=>!value)}>{palettePreviewCompare?"Show result":"Compare original"}</button>}</div>{palettePreviewUrl&&<div className="explore-palette-lab-preview"><img src={palettePreviewCompare?paletteOriginalUrl:palettePreviewUrl} alt="Palette transfer preview"/></div>}<label className="explore-palette-strength">Colour influence <strong>{paletteTransferIntensity}%</strong><input type="range" min="10" max="80" step="5" value={paletteTransferIntensity} onChange={event=>setPaletteTransferIntensity(Number(event.target.value))}/></label><label className="explore-palette-skin-toggle"><input type="checkbox" checked={protectSkinTones} onChange={event=>setProtectSkinTones(event.target.checked)}/><span><strong>Gentle skin-tone protection</strong><small>Reduces palette influence on some skin-like colours. Heuristic only; not face detection.</small></span></label><p className="explore-dna-note">Runs locally on a working copy capped at 1024px. This first pass maps tones through the reference palette; it does not transfer texture, lighting, objects or artistic style.</p>{paletteTransferError&&<p className="explore-constellation-error">{paletteTransferError}</p>}<button className="explore-dna-suggest" disabled={paletteTransferBusy||!paletteTarget||!paletteDonor||paletteTarget===paletteDonor||!nodes.find(node=>node.id===paletteDonor)?.visualPalette?.colors?.length} onClick={createPaletteTransfer}>{paletteTransferBusy?'Creating local experiment…':'Create palette experiment'} <Palette size={14}/></button></section></div>}
  {fusionOpen&&<div className="explore-constellation-backdrop"><section className="explore-constellation-panel" role="dialog" aria-modal="true" aria-label="Visual idea fusion"><div className="explore-discover-heading"><div><small>STILLROOM · VISUAL IDEA FUSION</small><h2>Borrow a visual idea</h2><p>Transfer a saved tonal recipe onto another photograph. Both source images stay untouched.</p></div><button onClick={()=>setFusionOpen(false)} aria-label="Close visual fusion">×</button></div><div className="explore-constellation-pickers"><label>Photograph to transform<select value={fusionTarget} onChange={event=>{setFusionTarget(event.target.value);setFusionError('');}}><option value="">Choose a photograph</option>{nodes.filter(node=>node.blob).map(node=><option key={node.id} value={node.id}>{node.title}</option>)}</select></label><span className="explore-constellation-plus">←</span><label>Visual recipe to borrow<select value={fusionDonor} onChange={event=>{setFusionDonor(event.target.value);setFusionError('');}}><option value="">Choose a saved recipe</option>{shortlistedNodes.filter(node=>node.creativeDirection?.settings).map(node=><option key={node.id} value={node.id}>{node.creativeDirection?.title||node.title}</option>)}</select></label></div>{fusionError&&<p className="explore-constellation-error">{fusionError}</p>}<p className="explore-constellation-note">This first version transfers saved tonal settings—contrast, brightness, saturation, warmth and shadow lift. It does not copy pixels, composition, lighting or semantic content. Everything is rendered on this device.</p><button className="explore-constellation-create" disabled={fusionBusy||!fusionTarget||!fusionDonor||fusionTarget===fusionDonor||!nodes.find(node=>node.id===fusionDonor)?.creativeDirection?.settings} onClick={createVisualFusion}>{fusionBusy?'Transferring locally…':'Create fused experiment'} <Sparkles size={14}/></button></section></div>}
  {dnaOpen&&<aside className="explore-dna-panel"><div className="explore-discover-heading"><div><small>STILLROOM · YOUR LOCAL CREATIVE DNA</small><h2>Your visual tendencies</h2><p>Patterns from {shortlistedNodes.length} kept experiment{shortlistedNodes.length===1?'':'s'}.</p></div><button onClick={()=>setDnaOpen(false)} aria-label="Close Creative DNA">×</button></div>{!creativeDNA?<p>Keep experiments with editable tonal settings to start building your profile.</p>:<><div className="explore-dna-traits">{dnaTraits.map(trait=><div className="explore-dna-trait" key={trait.label}><div><strong>{trait.label}</strong><span>{trait.description}</span></div><div className="explore-dna-meter"><i style={{left:Math.max(0,Math.min(100,((trait.value-trait.low)/(trait.high-trait.low))*100))+'%'}}/></div></div>)}</div><p className="explore-dna-note">A transparent summary of settings on your shortlisted experiments—not a trained AI model. Calculated locally; never sent anywhere.</p><button className="explore-dna-suggest" onClick={()=>{setDnaOpen(false);setDiscoverOpen(true);setStatus('Use your Creative DNA as a reference while exploring new directions.');}}>Explore another direction <Sparkles size={14}/></button></>}</aside>}
  {constellationOpen&&<div className="explore-constellation-backdrop"><section className="explore-constellation-panel" role="dialog" aria-modal="true" aria-label="Create creative constellation"><div className="explore-discover-heading"><div><small>STILLROOM · CREATIVE CONSTELLATIONS</small><h2>Combine two ideas</h2><p>Blend their visual treatments into a new experiment. Your originals stay untouched.</p></div><button onClick={()=>setConstellationOpen(false)} aria-label="Close constellation">×</button></div><div className="explore-constellation-pickers"><label>First direction<select value={constellationLeft} onChange={event=>{setConstellationLeft(event.target.value);setConstellationError('');}}><option value="">Choose an experiment</option>{shortlistedNodes.map(node=><option key={node.id} value={node.id}>{node.creativeDirection?.title||node.title}</option>)}</select></label><span className="explore-constellation-plus">+</span><label>Second direction<select value={constellationRight} onChange={event=>{setConstellationRight(event.target.value);setConstellationError('');}}><option value="">Choose another experiment</option>{shortlistedNodes.map(node=><option key={node.id} value={node.id} disabled={node.id===constellationLeft}>{node.creativeDirection?.title||node.title}</option>)}</select></label></div>{constellationError&&<p className="explore-constellation-error">{constellationError}</p>}<p className="explore-constellation-note">Stillroom averages the two experiments' tonal settings and renders the result from their shared original photograph. This is a deterministic local blend, not generative AI.</p><button className="explore-constellation-create" disabled={constellationBusy||!constellationLeft||!constellationRight||constellationLeft===constellationRight} onClick={createConstellation}>{constellationBusy?'Creating locally…':'Create blended experiment'} <GitMerge size={14}/></button></section></div>}
  {collabOpen&&selectedNode&&<aside className="explore-collab" aria-label="Stillroom creative collaborator"><div className="explore-discover-heading"><div><small>STILLROOM · LOCAL COLLABORATOR</small><h2>Let's explore this frame.</h2></div><button onClick={()=>setCollabOpen(false)} aria-label="Close collaborator">×</button></div><p>I'm looking at <strong>{selectedNode.title}</strong> using a reduced on-device sample. Your photograph is not uploaded. I compare spatial light and colour patterns, but I do not identify objects or understand scene semantics yet.</p>{collabBusy&&<div className="explore-collab-status">Reading a reduced preview locally…</div>}{collabError&&<div className="explore-collab-error">{collabError}<button onClick={analyzeSelectedPhoto}>Try again</button></div>}{collabResult&&<><div className="explore-collab-metrics"><span>Brightness <b>{collabResult.metrics.brightness}%</b></span><span>Contrast <b>{collabResult.metrics.contrast}%</b></span><span>Saturation <b>{collabResult.metrics.saturation}%</b></span></div><h3>What I notice</h3><ul>{collabResult.observations.map((item,i)=><li key={i}>{item}</li>)}</ul><h3>Directions worth trying</h3><div className="explore-discover-list">{collabResult.suggestions.map(suggestion=><button className="explore-suggestion-card" key={suggestion.id} disabled={collabBusy} onClick={()=>createCollaboratorBranch(suggestion)}><strong>{suggestion.title}</strong><span>{suggestion.reason}</span><span className="explore-create-variation">{collabBusy?"Creating variation…":"Create visual variation"} <span aria-hidden="true">↗</span></span></button>)}</div><button className="explore-collab-refresh" onClick={analyzeSelectedPhoto}>Analyze again</button></>}</aside>}
  {discoverOpen&&selectedNode&&<aside className="explore-discover" aria-label="Creative directions"><div className="explore-discover-heading"><div><small>CREATIVE DISCOVERIES</small><h2>Where could this go?</h2></div><button onClick={()=>setDiscoverOpen(false)} aria-label="Close creative directions">×</button></div><p>Choose an idea to branch from <strong>{selectedNode.title}</strong>. These are curated prompts, not AI-generated edits; your photograph stays unchanged until you refine it.</p><div className="explore-discover-list">{discoveryDirections.map(direction=><button key={direction.id} onClick={()=>startDirection(direction)}><strong>{direction.title}</strong><span>{direction.description}</span>{direction.fit&&<small className="explore-dna-fit">{direction.fit}</small>}<small>{direction.fit?direction.hint:"Create unedited branch ↗"}</small></button>)}</div></aside>}
  {selectedNode?.creativeDirection?.baseNodeId&&<aside className="explore-intensity-panel"><div><small>EXPERIMENT CONTROLS</small><strong>{selectedNode.creativeDirection.title}</strong></div><label>Intensity <output>{variationIntensity}%</output></label><input type="range" min="0" max="150" step="5" value={variationIntensity} onChange={e=>setVariationIntensity(Number(e.target.value))}/><p>Changes are rendered again from the preserved source image, not from the already-edited result.</p><button disabled={variationBusy||variationIntensity===(selectedNode.creativeDirection.intensity??100)} onClick={applyVariationIntensity}>{variationBusy?'Rendering…':'Apply intensity'}</button></aside>}
  {selectedNode?.creativeDirection&&!discoverOpen&&<aside className="explore-direction-note"><strong>{selectedNode.creativeDirection.title}</strong><span>{selectedNode.creativeDirection.hint}</span><button onClick={openSelectedInEditor}>Open in Refine ↗</button></aside>}
  {compareOpen&&compareParent&&compareVariation&&urls[compareParent.id]&&urls[compareVariation.id]&&<div className="explore-compare-backdrop" role="dialog" aria-modal="true" aria-label="Compare original and experiment" onClick={()=>setCompareOpen(false)}><section className="explore-compare-modal" onClick={e=>e.stopPropagation()}><header><div><small>STILLROOM · SIDE BY SIDE IN TIME</small><h2>Compare experiments</h2><p>Keep the original fixed and move between creative branches.</p><div className="explore-compare-switcher"><button disabled={compareSiblings.findIndex(node=>node.id===compareVariation.id)<=0} onClick={()=>{const index=compareSiblings.findIndex(node=>node.id===compareVariation.id);setCompareVariationId(compareSiblings[Math.max(0,index-1)]?.id);setComparePosition(50);}}>← Previous</button><span>{Math.max(0,compareSiblings.findIndex(node=>node.id===compareVariation.id)+1)} / {compareSiblings.length}</span><button disabled={compareSiblings.findIndex(node=>node.id===compareVariation.id)>=compareSiblings.length-1} onClick={()=>{const index=compareSiblings.findIndex(node=>node.id===compareVariation.id);setCompareVariationId(compareSiblings[Math.min(compareSiblings.length-1,index+1)]?.id);setComparePosition(50);}}>Next →</button></div></div><button onClick={()=>setCompareOpen(false)} aria-label="Close comparison">×</button></header><div ref={compareStage} className="explore-compare-stage"><img className="explore-compare-base" src={urls[compareParent.id]} alt="Original photograph"/><div className="explore-compare-overlay" style={{clipPath:'inset(0 0 0 '+comparePosition+'%)'}}><img src={urls[compareVariation.id]} alt="Experiment variation"/></div><div className="explore-compare-divider" role="slider" aria-label="Reveal variation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(comparePosition)} tabIndex={0} style={{left:comparePosition+'%'}} onPointerDown={event=>{event.preventDefault();compareDragging.current=true;event.currentTarget.setPointerCapture(event.pointerId);moveCompareDivider(event);}} onPointerMove={moveCompareDivider} onPointerUp={()=>{compareDragging.current=false;}} onLostPointerCapture={()=>{compareDragging.current=false;}} onPointerCancel={()=>{compareDragging.current=false;}} onKeyDown={event=>{if(event.key==='ArrowLeft')setComparePosition(value=>Math.max(0,value-2));if(event.key==='ArrowRight')setComparePosition(value=>Math.min(100,value+2));}}><span aria-hidden="true">↔</span></div><span className="explore-compare-label original">ORIGINAL</span><span className="explore-compare-label variation">VARIATION</span></div><footer><span>{compareParent.title}</span><span>{compareVariation.title}</span></footer></section></div>}
  <footer className="explore-footer"><span><MousePointer2 size={13}/> Drag to move · Drag empty space to pan · Ctrl/⌘ + scroll to zoom</span><span>{nodes.length} {nodes.length===1?'image':'images'} · {edges.length} connections</span></footer>
  <input ref={fileInput} hidden type="file" accept="image/*" multiple onChange={e=>{importFiles(e.target.files||[]);e.target.value='';}}/>
 </div>;
}
