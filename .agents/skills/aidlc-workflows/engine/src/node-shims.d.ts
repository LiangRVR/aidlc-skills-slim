declare const process: any;
declare const Buffer: any;
declare module 'node:fs' {
  export const appendFileSync: any; export const existsSync: any; export const lstatSync: any; export const mkdtempSync: any; export const mkdirSync: any; export const readFileSync: any; export const realpathSync: any; export const renameSync: any; export const rmSync: any; export const statSync: any; export const symlinkSync: any; export const writeFileSync: any; export const readdirSync: any; export const copyFileSync: any;
}
declare module 'node:path' {
  export const dirname: any; export const isAbsolute: any; export const join: any; export const relative: any; export const resolve: any; export const sep: any;
}
declare module 'node:crypto' { export const randomUUID: any; }
declare module 'node:os' { export const tmpdir: any; export const hostname: any; }
declare module 'node:test' { const test: any; export default test; }
declare module 'node:assert/strict' { const assert: any; export default assert; }
declare module 'node:child_process' { export const spawnSync: any; }
