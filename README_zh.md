# Patterm

一款基于 Electron 构建的专业串口终端应用，支持多窗口功能和完整的 UART 配置。

## 功能特性

- **多标签页管理**：在独立的标签页中打开和管理多个串口连接
   - 每个标签页有自己的串口连接、终端和输入框
   - 连接对话框自动创建标签页
   - 支持自定义标签页名称并显示端口
   - 连接状态指示器（● 已连接，○ 未连接）
   - 标签页切换使用专用 BrowserView 管理
- **完整的 UART 配置**：
  - 波特率：110 至 921600
  - 数据位：5, 6, 7, 8
  - 停止位：1, 1.5, 2
  - 校验位：无、奇校验、偶校验、标记校验、空格校验
   - 流控：RTS/CTS、XON/XOFF
- **连接对话框**：创建新连接的直观模态对话框
   - 带厂商信息的端口选择
   - 自定义标签页名称
   - 所有串口参数集中配置
   - 端口刷新功能
- **实时串口 I/O**：以最小延迟发送和接收数据
- **调试控制台**：
   - 应用程序事件的实时日志记录
   - 彩色日志级别（info、warn、error、debug）
   - 可选中和复制的日志条目
   - 每个日志条目带时间戳
   - 使用 Ctrl/Cmd + L 清除日志
- **文件记录**：
  - 手动记录（按需开始/停止）
  - 自动记录（连续）
   - 带时间戳的条目
   - 支持每个标签页的记录
- **跨平台**：支持 Windows、macOS 和 Linux
- **键盘快捷键**：
   - `Ctrl/Cmd + N` - 新建连接
   - `Ctrl/Cmd + W` - 关闭窗口
   - `Ctrl/Cmd + Shift + D` - 切换调试控制台

## 安装

### 环境要求

- Node.js 18.x 或 20.x
- npm（随 Node.js 一起安装）

### 安装依赖

```bash
npm install
```

中国用户使用 Electron 镜像以获得更快的下载速度：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

## 使用方法

### 启动应用

```bash
npm start
```

### 基本操作流程

1. **启动应用**：运行 `npm start`
2. **点击"新建连接"**（或按 `Ctrl/Cmd + N`）打开连接对话框
3. **配置连接设置**：
   - 可选：输入自定义标签页名称
   - 从下拉列表选择串口
   - 配置波特率、数据位、停止位、校验位
   - 点击"连接"创建标签页并打开串口
4. **发送数据**：在标签页中的输入框输入并按 Enter 发送
5. **查看接收数据**：在终端窗口中显示（每个标签页独立）
6. **创建更多连接**：使用 `Ctrl/Cmd + N` 添加其他串口
7. **切换标签页**：管理不同的连接
8. **启用记录**：将串口数据保存到文件（每个标签页）
9. **关闭标签页**：断开串口连接并移除标签页

## 开发

### 项目结构

```
patterm/
 ├── src/
 │   ├── main/           # Electron 主进程
 │   │   ├── main.js     # 应用入口点
 │   │   ├── window-manager.js  # 多窗口和标签页管理
 │   │   └── debug-window.js     # 调试控制台管理
 │   ├── renderer/       # UI/前端代码
 │   │   ├── index.html  # 主窗口 HTML
 │   │   ├── main.js     # 主窗口 JavaScript
 │   │   ├── tab.html    # 标签页内容 HTML
 │   │   ├── connection-dialog.html  # 连接对话框 HTML
 │   │   ├── connection-dialog.js    # 连接对话框逻辑
 │   │   ├── debug-window.html     # 调试控制台 HTML
 │   │   ├── about.html  # 关于对话框 HTML
 │   │   └── styles.css  # 全局 CSS 样式
 │   ├── services/       # 业务逻辑
 │   │   ├── serial-service.js  # 单个串口处理
 │   │   └── serial-service-manager.js  # 多连接管理
 │   └── public/         # 静态资源
 ├── .github/workflows/  # CI/CD 配置
 ├── package.json
 └── AGENTS.md          # 开发指南
```

### 开发命令

```bash
# 启动开发服务器（带热重载）
npm run dev

# 启动 Electron（无热重载）
npm start

# 构建应用
npm run build

# 构建分发包
npm run dist
npm run dist:win    # 仅 Windows
npm run dist:mac    # 仅 macOS
npm run dist:linux  # 仅 Linux
```

### 测试

### 虚拟串口测试

无需物理串口硬件，可以创建虚拟串口进行测试：

```bash
# 方法 1：使用 socat 创建虚拟端口（推荐）
bash scripts/create-virtual-port.sh /tmp/ttyV0

# 然后在 Patterm 中连接 /tmp/ttyV0

# 通过 TCP 发送测试数据：
telnet localhost 12345
# 或
echo "你好 Patterm！" | nc localhost 12345
```

### 快速测试脚本

```bash
# 创建虚拟端口并启动回显服务器
bash scripts/quick-virtual-serial.sh

# 在 Patterm 中连接显示的端口（如 /dev/pts/0）
# 所有发送的数据都会被回显
```

### Python 虚拟串口

```bash
# 安装所需包
sudo apt install python3-ptyprocess

# 运行交互式虚拟串口
python3 scripts/virtual-serial.py

# 使用命令：1、2、q 或直接输入任何文本
```

### 单元测试

```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行特定测试
npm test -- --testNamePattern="testName"
```

### 代码检查

```bash
# 运行代码检查工具
npm run lint

# 自动修复代码检查问题
npm run lint -- --fix
```

### 构建分发版本

Electron Builder 配置为创建平台特定的安装程序：

- **Windows**：NSIS 安装程序（.exe）
- **macOS**：DMG 磁盘映像（.dmg）
- **Linux**：AppImage 和 Debian 软件包（.deb）

构建产物放置在 `dist/` 目录中。

## 贡献指南

我们欢迎贡献！请遵循以下准则：

1. 阅读 [AGENTS.md](./AGENTS.md) 了解编码标准
2. 编写清晰、描述性的提交信息
3. 充分测试您的更改
4. 确保代码遵循现有模式
5. 除非明确要求，否则不在代码中添加注释

### 提交信息格式

使用 conventional commits 规范：

- `feat: ` - 新功能
- `fix: ` - 错误修复
- `docs: ` - 文档更改
- `refactor: ` - 代码重构
- `test: ` - 测试更改
- `chore: ` - 维护任务

示例：`feat: 实现串口自动重连`

## CI/CD

本项目使用 GitHub Actions 进行持续集成：

- **触发条件**：推送到 master、拉取请求
- **平台**：Ubuntu、macOS、Windows
- **Node 版本**：18.x、20.x
- **操作**：安装、检查、构建、测试
- **产物**：构建产物保留 7 天
- **发布**：标记提交时自动发布

配置详情请查看 `.github/workflows/ci.yml`。

## 许可证

MIT 许可证 - 详见 LICENSE 文件

## 支持

如有问题、疑问或贡献意向：

- 在 GitHub 上提 issue
- 查看 AGENTS.md 中的现有文档
- 查看仓库中的代码示例

## 致谢

- 使用 [Electron](https://www.electronjs.org/) 构建
- 串口通信使用 [SerialPort.js](https://serialport.io/)
- 构建系统由 [Electron Builder](https://www.electron.build/) 提供
