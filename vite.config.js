import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {mkdirSync,copyFileSync} from 'node:fs';

const require=createRequire(import.meta.url);
const ortDist=dirname(require.resolve('onnxruntime-web/webgpu'));
const ortAssets=[
  'ort-wasm-simd-threaded.asyncify.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm'
];
function copyOrtRuntimeAssets(){
  const target=join(process.cwd(),'public','ort-runtime');
  mkdirSync(target,{recursive:true});
  for(const file of ortAssets)copyFileSync(join(ortDist,file),join(target,file));
}
export default defineConfig({
  plugins:[react(),{
    name:'stillroom-copy-onnxruntime-assets',
    configResolved(){copyOrtRuntimeAssets();}
  }],
  server:{host:'127.0.0.1'}
});
