export const defaults={exposure:0,brightness:0,contrast:100,saturation:100,warmth:0,tint:0,fade:0,vignette:0,grain:0,blur:0,split:0,scanlines:0};
export const presets=[
{id:'original',name:'Original',group:'Basic',values:{}},
{id:'golden',name:'Golden Hour',group:'Warm',values:{warmth:24,saturation:112,contrast:108,fade:8,vignette:12}},
{id:'amber',name:'Amber',group:'Warm',values:{warmth:35,tint:8,saturation:90,contrast:112,fade:5,grain:12}},
{id:'soft',name:'Soft Matte',group:'Film',values:{contrast:86,saturation:86,fade:24,warmth:8,grain:8}},
{id:'analog',name:'Analog',group:'Film',values:{contrast:112,saturation:82,warmth:12,fade:10,grain:28,vignette:18}},
{id:'portrait',name:'Portra Mood',group:'Film',values:{warmth:10,saturation:88,contrast:94,tint:5,fade:8,grain:10}},
{id:'cinema',name:'Cinema',group:'Moody',values:{contrast:128,saturation:78,warmth:-8,tint:-7,vignette:24,fade:4}},
{id:'moody',name:'After Hours',group:'Moody',values:{brightness:-8,contrast:120,saturation:72,warmth:-12,vignette:32,grain:14}},
{id:'mono',name:'Silver',group:'Mono',values:{saturation:0,contrast:122,brightness:3,grain:12,vignette:16}},
{id:'retro',name:'Retro 90s',group:'Retro',values:{warmth:18,saturation:118,contrast:92,fade:16,grain:20,tint:8}},
{id:'faded',name:'Sunday Print',group:'Retro',values:{saturation:76,contrast:88,fade:28,warmth:14,grain:10}},
{id:'cool',name:'Blue Hour',group:'Cool',values:{warmth:-28,tint:-8,saturation:90,contrast:112,vignette:14}}
];
export const controls=[
{key:'exposure',label:'Exposure',min:-100,max:100},{key:'brightness',label:'Brightness',min:-100,max:100},{key:'contrast',label:'Contrast',min:0,max:200,unit:'%'},{key:'saturation',label:'Saturation',min:0,max:200,unit:'%'},{key:'warmth',label:'Warmth',min:-100,max:100},{key:'tint',label:'Tint',min:-100,max:100},{key:'fade',label:'Fade',min:0,max:100},{key:'vignette',label:'Vignette',min:0,max:100},{key:'grain',label:'Film grain',min:0,max:100},{key:'blur',label:'Soft focus',min:0,max:12,unit:'px'},{key:'split',label:'Color split',min:0,max:12,unit:'px'},{key:'scanlines',label:'Scanlines',min:0,max:100}
];