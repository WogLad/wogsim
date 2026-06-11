import fs from 'fs';
const wasm = fs.readFileSync('build/release.wasm');
const base64 = wasm.toString('base64');
fs.writeFileSync('js/wasmData.js', `var wasmBase64 = "${base64}";\n`);
