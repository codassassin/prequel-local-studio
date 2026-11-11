import { env, pipeline, RawImage } from '@huggingface/transformers';

const MODEL = 'briaai/RMBG-1.4';
let segmenterPromise;
export function modelInfo(){return {id:MODEL,cache:'browser-cache'};}
export async function loadSubjectModel(onProgress=()=>{}){
  // This build uses the public Hugging Face model repository. Do not probe
  // /models/: Vite's SPA fallback returns index.html (HTTP 200) for missing
  // paths, and Transformers may try to parse that HTML as model JSON.
  env.allowLocalModels=false;
  env.allowRemoteModels=true;
  env.useBrowserCache=true;
  if(!segmenterPromise) {
    // Transformers.js currently surfaces JSON.parse errors without the URL.
    // Wrap fetch during model initialization so an HTML/error response tells
    // us exactly which Hugging Face asset failed.
    const originalFetch=globalThis.fetch;
    const diagnosticFetch=async(input,init)=>{
      const response=await originalFetch(input,init);
      const url=typeof input==='string'?input:input?.url||response.url||'unknown URL';
      const type=response.headers.get('content-type')||'';
      if(type.includes('text/html')){
        const snippet=(await response.clone().text()).slice(0,180).replace(/\s+/g,' ');
        throw new Error(`[Stillroom model fetch] HTML response: ${url} (HTTP ${response.status}, content-type ${type}). Body: ${snippet}`);
      }
      return response;
    };
    globalThis.fetch=diagnosticFetch;
    segmenterPromise=pipeline('image-segmentation',MODEL,{
      progress_callback:onProgress,
      device:'wasm',
      dtype:'fp32'
    }).catch(error=>{segmenterPromise=null;throw error;}).finally(()=>{
      if(globalThis.fetch===diagnosticFetch)globalThis.fetch=originalFetch;
    });
  }
  return segmenterPromise;
}
export async function segmentSubject(image,onProgress){
  const model=await loadSubjectModel(onProgress);
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  if(!iw||!ih) throw new Error('The selected photo has not finished loading.');
  const max=1024,scale=Math.min(1,max/Math.max(iw,ih));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(iw*scale));
  canvas.height=Math.max(1,Math.round(ih*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const input=RawImage.fromCanvas(canvas);
  const result=await model(input);
  // RMBG-1.4 is a general saliency model. Its image-segmentation task
  // returns segment records whose mask is a single-channel RawImage.
  const segments=Array.isArray(result)?result:[result];
  const candidates=segments.filter(item=>item?.mask?.data&&item.mask.width&&item.mask.height);
  if(!candidates.length){
    throw new Error('RMBG-1.4 did not return a segmentation mask. Check model access and browser console.');
  }
  const selected=candidates.find(item=>/foreground|object|salient/i.test(item.label||''))||candidates[0];
  const raw=selected.mask;
  const data=new Uint8ClampedArray(raw.data.length);
  // Normalise supported uint8/float mask outputs to an 8-bit alpha matte.
  let min=Infinity,maxValue=-Infinity;
  for(let i=0;i<raw.data.length;i++){const v=Number(raw.data[i]);if(v<min)min=v;if(v>maxValue)maxValue=v;}
  const range=maxValue-min||1;
  for(let i=0;i<raw.data.length;i++){
    const v=Number(raw.data[i]);
    data[i]=raw.data instanceof Uint8Array||raw.data instanceof Uint8ClampedArray
      ?v:Math.round(Math.max(0,Math.min(1,(v-min)/range))*255);
  }
  return {data,width:raw.width,height:raw.height,channels:1,label:selected.label||'foreground'};
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
