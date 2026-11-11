import React,{useCallback,useEffect,useMemo,useRef,useState}from'react';
import{ArrowLeft,Copy,Download,FileImage,Link2,MousePointer2,Plus,Save,Trash2,ZoomIn,ZoomOut}from'lucide-react';

const DB_NAME='stillroom-projects';
const STORE='projects';
const PROJECT_ID='stillroom-exploration-v1';
const uid=()=>globalThis.crypto?.randomUUID?.()||'node-'+Date.now()+'-'+Math.random().toString(36).slice(2);
function openDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function readProject(){const db=await openDb();return new Promise((resolve,reject)=>{const request=db.transaction(STORE,'readonly').objectStore(STORE).get(PROJECT_ID);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});}
async function writeProject(project){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(project);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}

export default function ExplorationWorkspace(){
 const [nodes,setNodes]=useState([]),[edges,setEdges]=useState([]),[offset,setOffset]=useState({x:80,y:70}),[scale,setScale]=useState(1),[selected,setSelected]=useState([]),[connectMode,setConnectMode]=useState(false),[projectName,setProjectName]=useState('Untitled exploration'),[status,setStatus]=useState('Loading local project…'),[ready,setReady]=useState(false);
 const [urls,setUrls]=useState({});
 const urlRegistry=useRef(new Map());
 const stage=useRef(null),drag=useRef(null),pan=useRef(null),fileInput=useRef(null),saveTimer=useRef(null);
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
 const removeSelected=()=>{setNodes(current=>current.filter(node=>!selected.includes(node.id)));setEdges(current=>current.filter(edge=>!selected.includes(edge.from)&&!selected.includes(edge.to)));setSelected([]);};
 const selectNode=id=>{if(connectMode){setSelected(current=>{if(!current.length)return[id];if(current[0]===id)return[];setEdges(edgesNow=>[...edgesNow,{id:uid(),from:current[0],to:id}]);setConnectMode(false);return[id];});return;}setSelected([id]);};
 const onStageDown=e=>{if(e.target!==stage.current)return;pan.current={x:e.clientX-offset.x,y:e.clientY-offset.y};stage.current.setPointerCapture(e.pointerId);setSelected([]);};
 const onStageMove=e=>{
  const activePan=pan.current;
  if(activePan)setOffset({x:e.clientX-activePan.x,y:e.clientY-activePan.y});
  const activeDrag=drag.current;
  if(!activeDrag)return;
  const dx=(e.clientX-activeDrag.clientX)/scale,dy=(e.clientY-activeDrag.clientY)/scale;
  const nextX=activeDrag.x+dx,nextY=activeDrag.y+dy,nodeId=activeDrag.id;
  // Keep the state updater independent of mutable pointer refs: pointer-up can
  // clear those refs before React commits a queued update.
  setNodes(current=>current.map(node=>node.id===nodeId?{...node,x:nextX,y:nextY}:node));
 };
 const onStageUp=()=>{pan.current=null;drag.current=null;};
 const startNodeDrag=(e,node)=>{
  if(e.target.closest('button'))return;
  e.preventDefault();e.stopPropagation();selectNode(node.id);
  if(connectMode)return;
  drag.current={id:node.id,clientX:e.clientX,clientY:e.clientY,x:node.x,y:node.y};
  // Capture on the canvas so move/up/lost-capture all use one event target.
  try{stage.current?.setPointerCapture(e.pointerId);}catch(error){console.warn('[Stillroom workspace] Pointer capture unavailable',error);}
 };
 const zoomAt=delta=>setScale(value=>Math.max(.35,Math.min(1.8,Number((value+delta).toFixed(2)))));
 const nodeById=id=>nodes.find(node=>node.id===id);
 const worldStyle={transform:'translate('+offset.x+'px,'+offset.y+'px) scale('+scale+')',transformOrigin:'0 0'};
 
 const edgeLines=useMemo(()=>edges.map(edge=>{const a=nodeById(edge.from),b=nodeById(edge.to);if(!a||!b)return null;return{...edge,x1:a.x+a.width/2,y1:a.y+a.height/2,x2:b.x+b.width/2,y2:b.y+b.height/2};}).filter(Boolean),[edges,nodes]);
 return <div className="explore-app">
  <header className="explore-topbar"><a href="/" className="explore-back"><ArrowLeft size={16}/> Studio</a><div className="explore-brand"><span className="explore-mark">s</span><span>stillroom</span><i>EXPLORE</i></div><input aria-label="Project name" value={projectName} onChange={e=>setProjectName(e.target.value)} /><div className="explore-save"><span>{status}</span><button onClick={save}><Save size={15}/> Save</button></div></header>
  <div className="explore-toolbar"><div className="explore-tools"><button onClick={()=>fileInput.current?.click()}><Plus size={15}/> Add photographs</button><button disabled={!selected.length} onClick={duplicate}><Copy size={14}/> Duplicate experiment</button><button className={connectMode?'active':''} disabled={nodes.length<2} onClick={()=>{setConnectMode(value=>!value);setSelected([]);}}><Link2 size={14}/> {connectMode?'Choose first node…':'Connect ideas'}</button><button disabled={!selected.length} onClick={removeSelected}><Trash2 size={14}/> Delete</button></div><div className="explore-zoom"><button aria-label="Zoom out" onClick={()=>zoomAt(-.1)}><ZoomOut size={15}/></button><span>{Math.round(scale*100)}%</span><button aria-label="Zoom in" onClick={()=>zoomAt(.1)}><ZoomIn size={15}/></button></div></div>
  <main ref={stage} className={'explore-canvas '+(connectMode?'connecting':'')} onPointerDown={onStageDown} onPointerMove={onStageMove} onPointerUp={onStageUp} onPointerCancel={onStageUp} onLostPointerCapture={onStageUp} onWheel={e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();zoomAt(e.deltaY<0?.05:-.05);}}}>
   <div className="explore-world" style={worldStyle}>
    <svg className="explore-edges">{edgeLines.map(edge=><g key={edge.id}><line x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2}/><circle cx={(edge.x1+edge.x2)/2} cy={(edge.y1+edge.y2)/2} r="3"/></g>)}</svg>
    {nodes.map(node=><article key={node.id} className={'explore-node '+(selected.includes(node.id)?'selected':'')} style={{left:node.x,top:node.y,width:node.width}} onPointerDown={e=>startNodeDrag(e,node)} onClick={()=>{if(!drag.current)selectNode(node.id);}}>
      <div className="explore-node-image">{urls[node.id]?<img src={urls[node.id]} draggable="false" alt={node.title}/>:<div className="explore-node-empty"><FileImage size={26}/></div>}<span>{node.role==='source'?'ORIGINAL':'EXPERIMENT'}</span></div>
      <div className="explore-node-meta"><strong>{node.title}</strong><small>{node.role==='source'?'Starting photograph':'Creative branch'}</small></div>
     </article>)}
   </div>
   {!nodes.length&&<div className="explore-empty"><div><div className="explore-empty-icon"><FileImage size={25}/></div><h1>Begin with a photograph.</h1><p>Place an image on the canvas. Duplicate it, move ideas around, and let your experiments take shape.</p><button onClick={()=>fileInput.current?.click()}><Plus size={15}/> Add your first photograph</button><small>Your images and project are stored locally in this browser.</small></div></div>}
   {connectMode&&<div className="explore-hint"><Link2 size={14}/> Select two photographs to connect them</div>}
  </main>
  <footer className="explore-footer"><span><MousePointer2 size={13}/> Drag to move · Drag empty space to pan · Ctrl/⌘ + scroll to zoom</span><span>{nodes.length} {nodes.length===1?'image':'images'} · {edges.length} connections</span></footer>
  <input ref={fileInput} hidden type="file" accept="image/*" multiple onChange={e=>{importFiles(e.target.files||[]);e.target.value='';}}/>
 </div>;
}
