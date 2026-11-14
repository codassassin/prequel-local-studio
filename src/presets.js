export const defaults={
 exposure:0,brightness:0,contrast:100,saturation:100,warmth:0,tint:0,fade:0,vignette:0,grain:0,blur:0,split:0,scanlines:0,
 bloom:0,halation:0,lightLeak:0,dust:0,scratches:0,teal:0,matte:0,glow:0,hue:0,vibrance:0,curveShadows:0,curveMidtones:0,curveHighlights:0,curveBlacks:0,curveWhites:0,maskAmount:0,maskX:.5,maskY:.5,maskRadius:.35,maskFeather:.2,
 curveMaster:[{x:0,y:0},{x:1,y:1}],curveRed:[{x:0,y:0},{x:1,y:1}],curveGreen:[{x:0,y:0},{x:1,y:1}],curveBlue:[{x:0,y:0},{x:1,y:1}],
 shadowTint:'#ffffff',midTint:'#ffffff',highlightTint:'#ffffff',shadowTintAmount:0,midTintAmount:0,highlightTintAmount:0,
 hslredHue:0,hslredSat:0,hslredLum:0,hslorangeHue:0,hslorangeSat:0,hslorangeLum:0,hslyellowHue:0,hslyellowSat:0,hslyellowLum:0,hslgreenHue:0,hslgreenSat:0,hslgreenLum:0,hslcyanHue:0,hslcyanSat:0,hslcyanLum:0,hslblueHue:0,hslblueSat:0,hslblueLum:0,hslpurpleHue:0,hslpurpleSat:0,hslpurpleLum:0,hslmagentaHue:0,hslmagentaSat:0,hslmagentaLum:0,
};
export const presets=[
{id:'original',name:'Original',group:'Basic',desc:'Clean, untouched image',values:{}},
{id:'portra',name:'Portra 400',group:'Film',desc:'Warm skin, gentle contrast',values:{warmth:13,saturation:91,contrast:96,fade:7,grain:13,halation:12}},
{id:'golden',name:'Golden Hour',group:'Warm',desc:'Sun-kissed amber highlights',values:{warmth:28,saturation:112,contrast:106,lightLeak:22,bloom:12,vignette:12}},
{id:'amber',name:'Amber Glow',group:'Warm',desc:'Rich honey tones and glow',values:{warmth:36,tint:8,saturation:94,contrast:110,lightLeak:30,bloom:18,grain:8}},
{id:'cinestill',name:'CineStill 800T',group:'Film',desc:'Tungsten colour and red halation',values:{warmth:-13,tint:8,saturation:88,contrast:116,halation:42,glow:14,grain:22}},
{id:'kodak',name:'Kodak Gold',group:'Film',desc:'Nostalgic yellow warmth',values:{warmth:21,saturation:108,contrast:104,fade:8,grain:18,halation:8}},
{id:'fujifilm',name:'Fuji 400H',group:'Film',desc:'Airy greens and soft pastels',values:{warmth:-5,tint:13,saturation:83,contrast:91,fade:13,grain:9,matte:16}},
{id:'polaroid',name:'Instant Print',group:'Retro',desc:'Faded instant-film character',values:{warmth:16,saturation:78,contrast:88,fade:27,grain:12,vignette:14,matte:28}},
{id:'vhs',name:'VHS Memory',group:'Retro',desc:'Tape texture and colour fringing',values:{saturation:112,contrast:108,split:4,scanlines:32,grain:14}},
{id:'90s',name:'Summer 1998',group:'Retro',desc:'Flash-lit disposable camera',values:{warmth:17,saturation:118,contrast:112,grain:28,vignette:18,lightLeak:12}},
{id:'cinema',name:'Teal & Orange',group:'Cinematic',desc:'Cool shadows, warm highlights',values:{contrast:122,saturation:105,teal:42,warmth:8,vignette:20,halation:8}},
{id:'noir',name:'Noir Cinema',group:'Cinematic',desc:'Deep monochrome drama',values:{saturation:0,contrast:145,brightness:-3,vignette:38,grain:17}},
{id:'dream',name:'Dream Bloom',group:'Creative',desc:'Soft luminous highlight bloom',values:{contrast:91,saturation:94,bloom:46,glow:28,halation:14,fade:8}},
{id:'leak',name:'Light Leak',group:'Creative',desc:'Warm flare spilling into frame',values:{warmth:9,lightLeak:68,bloom:15,fade:5}},
{id:'dusty',name:'Dust & Scratches',group:'Creative',desc:'Aged archival film texture',values:{saturation:78,contrast:96,fade:17,grain:24,dust:58,scratches:34}},
{id:'bluehour',name:'Blue Hour',group:'Cool',desc:'Cool twilight atmosphere',values:{warmth:-30,tint:-9,saturation:91,contrast:112,teal:20,vignette:15}},
{id:'arctic',name:'Arctic Fade',group:'Cool',desc:'Pale blue editorial finish',values:{warmth:-24,saturation:72,contrast:92,fade:20,matte:22}},
{id:'moody',name:'After Hours',group:'Moody',desc:'Low-key shadows and grain',values:{brightness:-10,contrast:132,saturation:78,warmth:-10,vignette:36,grain:18}},
{id:'olive',name:'Olive Film',group:'Moody',desc:'Muted earthy greens',values:{warmth:5,tint:-13,saturation:76,contrast:112,matte:15,grain:13}},
{id:'silver',name:'Silver Gelatin',group:'Mono',desc:'Crisp black and white',values:{saturation:0,contrast:132,brightness:2,grain:10,vignette:12}},
{id:'softmono',name:'Soft Monochrome',group:'Mono',desc:'Gentle matte black and white',values:{saturation:0,contrast:92,fade:18,matte:20,grain:7}},
{id:'peach',name:'Peach Skin',group:'Portrait',desc:'Soft peach warmth for portraits',values:{warmth:18,tint:12,saturation:92,contrast:91,bloom:10,halation:8}},
{id:'editorial',name:'Editorial Flash',group:'Portrait',desc:'Punchy flash-photo contrast',values:{brightness:7,contrast:128,saturation:90,grain:8,split:1}},
{id:'pastel',name:'Pastel Daydream',group:'Creative',desc:'Lifted blacks and pastel colour',values:{contrast:84,saturation:82,fade:21,bloom:13,matte:26}}
];
export const groups=['All','Film','Warm','Cinematic','Portrait','Moody','Retro','Creative','Cool','Mono','Basic'];
export const controls=[
{key:'exposure',label:'Exposure',min:-100,max:100},{key:'brightness',label:'Brightness',min:-100,max:100},{key:'contrast',label:'Contrast',min:0,max:200,unit:'%'},{key:'saturation',label:'Saturation',min:0,max:200,unit:'%'},{key:'vibrance',label:'Vibrance',min:-100,max:100},{key:'hue',label:'Hue shift',min:-180,max:180,unit:'°'},{key:'warmth',label:'Warmth',min:-100,max:100},{key:'tint',label:'Tint',min:-100,max:100},{key:'teal',label:'Teal shadows',min:0,max:100},{key:'fade',label:'Fade',min:0,max:100},{key:'matte',label:'Matte blacks',min:0,max:100},{key:'vignette',label:'Vignette',min:0,max:100},{key:'grain',label:'Film grain',min:0,max:100},{key:'halation',label:'Film halation',min:0,max:100},{key:'bloom',label:'Highlight bloom',min:0,max:100},{key:'glow',label:'Soft glow',min:0,max:100},{key:'lightLeak',label:'Light leak',min:0,max:100},{key:'dust',label:'Dust',min:0,max:100},{key:'scratches',label:'Scratches',min:0,max:100},{key:'blur',label:'Soft focus',min:0,max:12,unit:'px'},{key:'split',label:'Chromatic aberration',min:0,max:12,unit:'px'},{key:'scanlines',label:'Scanlines',min:0,max:100}
];