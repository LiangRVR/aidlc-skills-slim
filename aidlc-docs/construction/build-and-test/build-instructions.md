# Build Instructions - sudoku-game

## Prerequisites
- **Build Tool**: Vite 5 + TypeScript 5（npm scripts 驱动）
- **Runtime**: Node.js 18+（建议 20+）
- **Dependencies**: phaser（运行时）；vite、typescript、vitest（开发）
- **Environment Variables**: 无
- **System Requirements**: Windows/macOS/Linux；内存 ≥ 2GB；磁盘 ≥ 500MB（含 node_modules）

## Build Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
无需配置（纯前端，无环境变量、无后端端点）。

### 3. Build All Units
```bash
npm run build
```

### 4. Verify Build Success
- **Expected Output**: `✓ built in Xs`，无 error
- **Build Artifacts**: `dist/index.html` + `dist/assets/index-*.js`（单 bundle，≈1.5MB，gzip ≈ 350KB）
- **Common Warnings（可接受）**: `Some chunks are larger than 500 kB` — 来自 Phaser 引擎本身体积，纯前端游戏无服务端渲染需求，不处理
- **类型检查（建议随构建执行）**: `npx tsc --noEmit` 应 0 错误

## Troubleshooting

### `npm run dev` 后浏览器无法访问 localhost:5173
- **Cause**: 本机 Vite 默认绑定 IPv6 `::1`，部分 Windows 环境解析 localhost 失败
- **Solution**: `vite.config.ts` 已固定 `server.host = '127.0.0.1'`；若仍异常，确认系统代理未拦截 127.0.0.1（NO_PROXY 需含 localhost/127.0.0.1）

### Build Fails with TypeScript Errors
- **Cause**: 源码类型错误
- **Solution**: 先运行 `npx tsc --noEmit` 定位报错文件与行号，修复后重新 `npm run build`

### 端口被占用（EADDRINUSE 5173）
- **Cause**: 残留的 dev server 进程
- **Solution**: `taskkill //F //IM node.exe`（Windows）结束后重启
