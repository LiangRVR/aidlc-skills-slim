# Build Instructions

## Prerequisites
- **Runtime**: Node.js ≥ 18（LTS）
- **Package Manager**: npm（随 Node.js）
- **System Requirements**: Windows/macOS/Linux；内存 ≥ 512MB；磁盘 ≥ 300MB
- **Environment Variables**:
  - `PORT`（可选）：后端 ws 监听端口，默认 8081

## Build Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Frontend
```bash
npm run build
```

### 3. Type Check（全量：src/shared/server/tests/scripts）
```bash
npx tsc --noEmit
```

### 4. Verify Build Success
- **Expected Output**: `✓ built in <Ns>`；`tsc` 无输出（0 错误）
- **Build Artifacts**: `dist/index.html` + `dist/assets/index-*.js`（前端 bundle）
- **Common Warnings**: chunk > 500kB 警告（Phaser 体积，可接受）；后端无构建步骤（tsx 直接运行 TS）

## Run（开发形态）

### 后端
```bash
npm run server          # 默认 0.0.0.0:8081
set PORT=8090 && npm run server   # 自定义端口（Windows cmd）
```

### 前端
```bash
npm run dev             # vite 开发服务器
# 或部署 dist/ 到任意静态服务器
```

### 一键启动（Windows 开发便利脚本）
```bash
start-dev.bat           # 双窗口同时启动 server(8081) 与 vite(5173)
start-dev.bat 8090      # 指定 server 端口
```

## Troubleshooting

### npm install 报依赖审计漏洞
- **Cause**: 开发依赖传递性漏洞（Phaser/vite 生态常见）
- **Solution**: 开发形态可接受；不要对 devDependencies 盲目 `npm audit fix --force`（可能破坏构建）

### EADDRINUSE
- **Cause**: 端口被占用（常见于之前的 server 进程未退出）
- **Solution**: `netstat -ano | findstr :8081` 找到 PID 后 `taskkill /F /PID <pid>`，或改用 `PORT` 环境变量

### 浏览器提示"无法连接到服务器"
- **Cause**: 后端未启动，或前端页面 host 与后端 host 不一致（客户端固定连接 `ws://<页面host>:8081`）
- **Solution**: 确认 `npm run server` 已启动且监听 8081；LAN 场景确保从同一台部署机访问页面
