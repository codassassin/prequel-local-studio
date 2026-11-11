import { env, pipeline } from '@huggingface/transformers';

const MODEL = 'briaai/RMBG-1.4';
let segmenterPromise;
export function modelInfo(){return {id:MODEL,cache:'browser-cache'};}
export async function loadSubjectModel(onProgress=()=>{}){
  env.allowRemoteModels=true;
  env.localModelPath='/models/';
  env.useBrowserCache=true;
  // Only enable local model lookup when a real local config exists. Vite's SPA
  // fallback otherwise returns index.html with status 200, which Transformers
  // then tries to parse as JSON ("Unexpected token '<'").
  let hasLocalModel=false;
  try {
    const response=await fetch('/models/briaai/RMBG-1.4/config.json',{method:'GET',cache:'no-store'});
    const type=response.headers.get('content-type')||'';
    hasLocalModel=response.ok && type.includes('application/json');
  } catch {}
  env.allowLocalModels=hasLocalModel;
  if(!segmenterPromise) segmenterPromise=pipeline('image-segmentation',MODEL,{progress_callback:onProgress,device:'wasm'}).catch(error=>{segmenterPromise=null;throw error;});
  return segmenterPromise;
}
export async function segmentSubject(image,onProgress){
  const model=await loadSubjectModel(onProgress); const result=await model(image); const segments=Array.isArray(result)?result:[];
  if(!segments.length) throw new Error('The model did not return a foreground mask.');
  const output=segments.find(item=>item.label==='foreground')||segments[0],raw=output.mask||output;
  if(!raw?.data||!raw.width||!raw.height) throw new Error('The segmentation model returned an unsupported mask.');
  return {data:new Uint8ClampedArray(raw.data),width:raw.width,height:raw.height,channels:raw.channels||1,label:output.label||'foreground'};
}
export function analysePhoto(image,mask){
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,canvas=document.createElement('canvas'),max=320,scale=Math.min(1,max/Math.max(iw,ih));
  canvas.width=Math.max(1,Math.round(iw*scale));canvas.height=Math.max(1,Math.round(ih*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);let lum=0,lum2=0,sat=0,n=0,under=0,over=0;
  for(let i=0;i<data.length;i+=16){const r=data[i],g=data[i+1],b=data[i+2],l=.2126*r+.7152*g+.0722*b,mx=Math.max(r,g,b),mn=Math.min(r,g,b);lum+=l;lum2+=l*l;sat+=(mx-mn)/(mx||1);n++;if(l<28)under++;if(l>235)over++;}
  const mean=lum/n,sd=Math.sqrt(Math.max(0,lum2/n-mean*mean));let subject=0,total=0;
  if(mask){const step=Math.max(1,Math.floor(mask.data.length/50000));for(let i=0;i<mask.data.length;i+=step*(mask.channels||4)){subject+=mask.channels===4?mask.data[i+3]/255:mask.data[i]/255;total++;}}
  const suggestions=[];if(mean<95)suggestions.push('Lift exposure slightly; the overall frame is dark.');if(mean>190)suggestions.push('Protect highlights before increasing exposure.');if(sd<42)suggestions.push('Add a little contrast to separate tonal regions.');if(sat/n<.2)suggestions.push('A modest vibrance boost may restore colour presence.');if(over/n>.12)suggestions.push('Watch bright areas: a noticeable portion is near clipping.');if(under/n>.18)suggestions.push('Open the shadows selectively to reveal dark detail.');if(!suggestions.length)suggestions.push('The tonal balance looks fairly even; try a subtle creative grade rather than heavy correction.');
  return {brightness:mean<85?'dark':mean>180?'bright':'balanced',contrast:sd<42?'soft':sd>78?'strong':'moderate',saturation:sat/n<.2?'muted':sat/n>.48?'vivid':'natural',mean:Math.round(mean),dynamicRange:Math.round(sd),subjectCoverage:total?Math.round(subject/total*100):null,suggestions};
}
