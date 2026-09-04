# Build Instructions

## Prerequisites
- **构建工具**: uv 0.8+
- **Python**: >= 3.12（uv 自动管理，见 `.python-version`）
- **系统**: Windows 10/11（GUI 应用）；磁盘约 500MB（虚拟环境 + 打包产物）
- **环境变量**: 无

## Build Steps

### 1. 安装依赖
```cmd
cd minesweeper
uv sync
```

### 2. 从源码运行（开发态验证）
```cmd
uv run python launcher.py
```

### 3. 打包 exe
```cmd
uv run pyinstaller minesweeper.spec --noconfirm
```

### 4. 验证构建成功
- **预期输出**: `Building EXE from EXE-00.toc completed successfully.`
- **构建产物**: `dist\minesweeper.exe`（约 47MB，单文件、无控制台窗口）
- **可接受警告**: PyInstaller 关于可选钩子的 INFO/WARNING（不影响运行）

## Troubleshooting

### uv sync 依赖解析失败
- **原因**: 网络或 PyPI 镜像不可达
- **解决**: 重试；或配置 `UV_INDEX_URL` 指向可用镜像

### 打包后 exe 启动闪退
- **原因**: 资源/导入缺失
- **解决**: 临时将 spec 中 `console=False` 改为 `True` 重新打包，从终端运行查看报错

### 中文控制台输出乱码
- **原因**: Windows 终端默认 GBK
- **解决**: `set "PYTHONIOENCODING=utf-8"` 后重跑命令
