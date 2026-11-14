const clamp=(v,a=0,b=255)=>Math.min(b,Math.max(a,v));
const HSL_KEYS=['red','orange','yellow','green','cyan','blue','purple','magenta'];
const HSL_CENTERS={red:0,orange:30,yellow:60,green:120,cyan:180,blue:240,purple:275,magenta:320};
export function renderImage(source,width,height,v,seed=17,design={}){
 const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d',{willReadFrequently:true});
 x.filter=v.blur?`blur(${v.blur}px)`:'none';x.drawImage(source,0,0,width,height);
 const im=x.getImageData(0,0,width,height),d=im.data,hslActive=HSL_KEYS.some(k=>(v['hsl'+k+'Hue']||0)||(v['hsl'+k+'Sat']||0)||(v['hsl'+k+'Lum']||0)),vibrance=(v.vibrance||0)/100,maskAmount=v.maskAmount||0,maskX=v.maskX??.5,maskY=v.maskY??.5,maskRadius=v.maskRadius??.35,maskFeather=Math.max(.02,v.maskFeather??.2),exp=Math.pow(2,v.exposure/100),br=v.brightness*1.7,co=v.contrast/100,sa=v.saturation/100,wa=v.warmth*.65,ti=v.tint*.35,fa=v.fade/100,mat=v.matte/100,teal=v.teal/100;
 for(let i=0;i<d.length;i+=4){
  let r=d[i]*exp+br+wa+ti*.2,g=d[i+1]*exp+br+ti,b=d[i+2]*exp+br-wa-ti*.2;
  r=(r-128)*co+128;g=(g-128)*co+128;b=(b-128)*co+128;
  const l=.2126*r+.7152*g+.0722*b;
  const satBoost=1+vibrance*(1-Math.min(1,Math.max(0,(Math.max(r,g,b)-Math.min(r,g,b))/255)));
  r=l+(r-l)*sa*satBoost;g=l+(g-l)*sa*satBoost;b=l+(b-l)*sa*satBoost;
  if(v.hue){const mx=Math.max(r,g,b),mn=Math.min(r,g,b),delta=mx-mn;let h=0,s=mx===0?0:delta/mx;if(delta){if(mx===r)h=((g-b)/delta)%6;else if(mx===g)h=(b-r)/delta+2;else h=(r-g)/delta+4;h*=60;}h=(h+(v.hue||0)+360)%360;const chroma=mx*s,hh=h/60,xx=chroma*(1-Math.abs(hh%2-1)),m=mx-chroma;let rr=0,gg=0,bb=0;if(hh<1){rr=chroma;gg=xx;}else if(hh<2){rr=xx;gg=chroma;}else if(hh<3){gg=chroma;bb=xx;}else if(hh<4){gg=xx;bb=chroma;}else if(hh<5){rr=xx;bb=chroma;}else{rr=chroma;bb=xx;}r=rr+m;g=gg+m;b=bb+m;}
  if(hslActive){
   const mx=Math.max(r,g,b),mn=Math.min(r,g,b),delta=mx-mn;let hue=0,light=(mx+mn)/510,sat=delta===0?0:delta/(255-Math.abs(mx+mn-255));
   if(delta){if(mx===r)hue=60*(((g-b)/delta)%6);else if(mx===g)hue=60*((b-r)/delta+2);else hue=60*((r-g)/delta+4);if(hue<0)hue+=360;}
   let hh=hue,ss=sat,ll=light;
   for(const key of HSL_KEYS){const center=HSL_CENTERS[key];let dist=Math.abs(hue-center);dist=Math.min(dist,360-dist);const weight=Math.max(0,1-dist/38);if(weight){hh+=(v['hsl'+key+'Hue']||0)*weight;ss*=1+((v['hsl'+key+'Sat']||0)/100)*weight;ll+=((v['hsl'+key+'Lum']||0)/200)*weight;}}
   hh=((hh%360)+360)%360;ss=clamp(ss,0,1);ll=clamp(ll,0,1);
   const cc=(1-Math.abs(2*ll-1))*ss,xx=cc*(1-Math.abs((hh/60)%2-1)),mm=ll-cc/2;let rr=0,gg=0,bb=0;
   if(hh<60){rr=cc;gg=xx;}else if(hh<120){rr=xx;gg=cc;}else if(hh<180){gg=cc;bb=xx;}else if(hh<240){gg=xx;bb=cc;}else if(hh<300){rr=xx;bb=cc;}else{rr=cc;bb=xx;}
   r=(rr+mm)*255;g=(gg+mm)*255;b=(bb+mm)*255;
  }
  const lum=clamp(.2126*r+.7152*g+.0722*b),shadowWeight=1-lum/255,highlightWeight=lum/255;
  const curve=clamp(lum+(v.curveShadows||0)*shadowWeight*.45+(v.curveHighlights||0)*highlightWeight*.45+(v.curveMidtones||0)*(1-Math.abs(lum/127.5-1))*.35+(v.curveBlacks||0)*(shadowWeight**3)*.6+(v.curveWhites||0)*(highlightWeight**3)*.6);
  const curveScale=lum>1?curve/lum:1;r*=curveScale;g*=curveScale;b*=curveScale;
  const grade=(hex,amount,weight)=>{if(!amount||weight<=0)return;const tintR=parseInt(hex.slice(1,3),16),tintG=parseInt(hex.slice(3,5),16),tintB=parseInt(hex.slice(5,7),16),strength=Math.min(1,amount/100*.55*weight);r+=(tintR-128)*strength;g+=(tintG-128)*strength;b+=(tintB-128)*strength;};
  const shadowGrade=(1-lum/255)**2,highlightGrade=(lum/255)**2,midGrade=Math.max(0,1-Math.abs(lum-127.5)/127.5);
  grade(v.shadowTint||'#ffffff',v.shadowTintAmount||0,shadowGrade);
  grade(v.midTint||'#ffffff',v.midTintAmount||0,midGrade);
  grade(v.highlightTint||'#ffffff',v.highlightTintAmount||0,highlightGrade);
  if(maskAmount){const px=(i/4)%width,py=Math.floor(i/4/width),dx=px/width-maskX,dy=py/height-maskY,dist=Math.sqrt(dx*dx+dy*dy),weight=1-Math.min(1,Math.max(0,(dist-maskRadius)/maskFeather));const local=Math.pow(2,(maskAmount/100)*weight);r*=local;g*=local;b*=local;}
  const shadow=1-Math.min(1,l/170);r-=teal*22*shadow;g+=teal*13*shadow;b+=teal*27*shadow;
  r=r*(1-fa)+220*fa;g=g*(1-fa)+215*fa;b=b*(1-fa)+207*fa;
  r=r*(1-mat)+Math.max(0,r-70)*mat;g=g*(1-mat)+Math.max(0,g-70)*mat;b=b*(1-mat)+Math.max(0,b-70)*mat;
  d[i]=clamp(r);d[i+1]=clamp(g);d[i+2]=clamp(b);
 }
 x.putImageData(im,0,0);
 if(v.split){const s=document.createElement('canvas');s.width=width;s.height=height;s.getContext('2d').drawImage(c,0,0);x.globalCompositeOperation='screen';x.globalAlpha=.22;x.drawImage(s,v.split,0);x.globalCompositeOperation='multiply';x.drawImage(s,-v.split,0);x.globalCompositeOperation='source-over';x.globalAlpha=1;}
 const overlay=(amount,stops)=>{if(!amount)return;const g=x.createRadialGradient(width*.08,height*.08,0,width*.08,height*.08,Math.max(width,height)*.9);for(const [p,col]of stops)g.addColorStop(p,col.replace('A',String(amount/100)));x.fillStyle=g;x.fillRect(0,0,width,height);};
 if(v.lightLeak){x.save();x.globalCompositeOperation='screen';x.globalAlpha=v.lightLeak/100*.8;const g=x.createRadialGradient(width*.04,height*.08,0,width*.04,height*.08,Math.max(width,height)*.85);g.addColorStop(0,'rgba(255,112,35,.9)');g.addColorStop(.28,'rgba(255,174,70,.42)');g.addColorStop(1,'rgba(255,80,20,0)');x.fillStyle=g;x.fillRect(0,0,width,height);x.restore();}
 if(v.bloom||v.glow||v.halation){const fx=document.createElement('canvas');fx.width=width;fx.height=height;const f=fx.getContext('2d');f.filter=`blur(${Math.max(3,Math.min(36,(v.bloom+v.glow+v.halation)*.12))}px)`;f.drawImage(c,0,0);x.save();x.globalCompositeOperation='screen';x.globalAlpha=Math.min(.85,(v.bloom*.004+v.glow*.003+v.halation*.004));x.drawImage(fx,0,0);x.restore();}
 if(v.halation){x.save();x.globalCompositeOperation='screen';x.globalAlpha=v.halation/100*.22;x.fillStyle='#ff321c';x.filter='blur(9px)';x.drawImage(c,-2,0);x.restore();}
 if(v.grain){const g=x.getImageData(0,0,width,height);let z=seed>>>0;const rnd=()=>{z=(1664525*z+1013904223)>>>0;return z/4294967296;};for(let i=0;i<g.data.length;i+=4){const n=(rnd()-.5)*v.grain*.9;for(let k=0;k<3;k++)g.data[i+k]=clamp(g.data[i+k]+n);}x.putImageData(g,0,0);}
 if(v.dust||v.scratches){let z=seed+991;const rnd=()=>{z=(z*16807)%2147483647;return z/2147483647;};x.save();x.globalCompositeOperation='screen';x.fillStyle='#fff';for(let i=0;i<Math.round(v.dust*width*height/120000);i++){x.globalAlpha=.12+rnd()*.35;x.beginPath();x.arc(rnd()*width,rnd()*height,.3+rnd()*1.4,0,Math.PI*2);x.fill();}for(let i=0;i<Math.round(v.scratches*width/28);i++){x.globalAlpha=.08+rnd()*.22;x.fillRect(rnd()*width,rnd()*height,1,8+rnd()*height*.18);}x.restore();}
 if(v.scanlines){x.fillStyle=`rgba(0,0,0,${v.scanlines/600})`;for(let y=0;y<height;y+=4)x.fillRect(0,y,width,1);}
 if(v.vignette){const rad=Math.max(width,height)*.72,gr=x.createRadialGradient(width/2,height/2,rad*.18,width/2,height/2,rad);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,`rgba(10,5,8,${v.vignette/105})`);x.fillStyle=gr;x.fillRect(0,0,width,height);}
 if(design.text){
  x.save();const size=Math.max(18,Math.round(width*(design.size||.055)));x.font=`600 ${size}px Georgia,serif`;x.textAlign=design.align||'center';x.textBaseline='middle';
  const px=design.align==='left'?width*.07:design.align==='right'?width*.93:width/2,py=design.position==='top'?height*.12:design.position==='bottom'?height*.88:height/2;
  x.shadowColor='rgba(0,0,0,.45)';x.shadowBlur=size*.25;x.fillStyle=design.color||'#ffffff';x.fillText(design.text.slice(0,90),px,py,width*.86);x.restore();
 }
 return c;
}