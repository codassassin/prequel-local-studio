const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function renderImage(source,width,height,v,seed=17){
 const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d',{willReadFrequently:true});
 x.filter=v.blur?`blur(${v.blur}px)`:'none';x.drawImage(source,0,0,width,height);
 const im=x.getImageData(0,0,width,height),d=im.data,exp=Math.pow(2,v.exposure/100),br=v.brightness*1.7,co=v.contrast/100,sa=v.saturation/100,wa=v.warmth*.65,ti=v.tint*.35,fa=v.fade/100;
 for(let i=0;i<d.length;i+=4){let r=d[i]*exp+br+wa+ti*.2,g=d[i+1]*exp+br+ti,b=d[i+2]*exp+br-wa-ti*.2;r=(r-128)*co+128;g=(g-128)*co+128;b=(b-128)*co+128;const l=.2126*r+.7152*g+.0722*b;r=l+(r-l)*sa;g=l+(g-l)*sa;b=l+(b-l)*sa;d[i]=clamp(r*(1-fa)+220*fa,0,255);d[i+1]=clamp(g*(1-fa)+214*fa,0,255);d[i+2]=clamp(b*(1-fa)+204*fa,0,255);}
 x.putImageData(im,0,0);
 if(v.split){const s=document.createElement('canvas');s.width=width;s.height=height;s.getContext('2d').drawImage(c,0,0);x.globalCompositeOperation='screen';x.globalAlpha=.16;x.drawImage(s,v.split,0);x.globalCompositeOperation='multiply';x.drawImage(s,-v.split,0);x.globalCompositeOperation='source-over';x.globalAlpha=1;}
 if(v.grain){const g=x.getImageData(0,0,width,height);let z=seed>>>0;const rnd=()=>{z=(1664525*z+1013904223)>>>0;return z/4294967296;};for(let i=0;i<g.data.length;i+=4){const n=(rnd()-.5)*v.grain*.65;for(let k=0;k<3;k++)g.data[i+k]=clamp(g.data[i+k]+n,0,255);}x.putImageData(g,0,0);}
 if(v.scanlines){x.fillStyle=`rgba(0,0,0,${v.scanlines/600})`;for(let y=0;y<height;y+=4)x.fillRect(0,y,width,1);}
 if(v.vignette){const rad=Math.max(width,height)*.72,gr=x.createRadialGradient(width/2,height/2,rad*.18,width/2,height/2,rad);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,`rgba(15,8,5,${v.vignette/115})`);x.fillStyle=gr;x.fillRect(0,0,width,height);}
 return c;
}