# Patterm

<div align="center">

**一款基于 Electron 构建的专业串口终端应用**

[![GitHub Release](https://img.shields.io/github/v/release/oroliy/patterm?include_prereleases)](https://github.com/oroliy/patterm/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/oroliy/patterm/blob/master/LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/oroliy/patterm)](https://github.com/oroliy/patterm/issues)
[![GitHub Stars](https://img.shields.io/github/stars/oroliy/patterm?style=social)](https://github.com/oroliy/patterm/stargazers)
[![Node.js](https://img.shields.io/badge/node-20+-339933?logo=node.js)](https://nodejs.org)
[![Electron](https://img.shields.io/badge/electron-40.0.0-47848F?logo=electron)](https://www.electronjs.org)

[功能特性](#功能特性) • [安装](#安装) • [使用方法](#使用方法) • [开发](#开发) • [贡献指南](#贡献指南)

</div>

---

## 功能特性

### 多标签页管理
- 在独立的标签页中打开和管理多个串口连接
- 每个标签页有自己的串口连接、终端和输入框
- 连接对话框自动创建标签页
- 支持自定义标签页名称并显示端口
- 连接状态指示器（● 已连接，○ 未连接）
- 标签页切换使用专用 BrowserView 管理

### 完整的 UART 配置
- **波特率**：110 至 921600
- **数据位**：5, 6, 7, 8
- **停止位**：1, 1.5, 2
- **校验位**：无、奇校验、偶校验、标记校验、空格校验
- **流控**：RTS/CTS、XON/XOFF

### 连接对话框
- 创建新连接的直观模态对话框
- 带厂商信息的端口选择
- 自定义标签页名称
- 所有串口参数集中配置
- 端口刷新功能

### 实时串口 I/O
- 以最小延迟发送和接收数据

### 调试控制台
- 应用程序事件的实时日志记录
- 彩色日志级别（info、warn、error、debug）
- 可选中和复制的日志条目
- 每个日志条目带时间戳
- 使用 `Ctrl/Cmd + L` 清除日志

### 文件记录
- 手动记录（按需开始/停止）
- 自动记录（连续）
- 带时间戳的条目
- 支持每个标签页的记录

### 跨平台支持
- ![Windows](https://img.shields.io/badge/Windows-x64-0078D4?logo=windows) NSIS + Portable
- ![macOS](https://img.shields.io/badge/macOS-x64%20%7C%20ARM64-999999?logo=apple) DMG
- ![Linux](https://img.shields.io/badge/Linux-x64%20%7C%20ARM64-FCC624?logo=linux) AppImage + deb
- ![Web](https://img.shields.io/badge/Web-PWA-02569B?logo=googlechrome) Chrome 89+

### Web 版本（PWA）🌐
同时提供基于浏览器的渐进式 Web 应用版本：
- **基于 Web Serial API 的浏览器串口终端**
- **离线支持**通过 Service Worker 实现
- **可安装**为桌面应用（从浏览器安装）
- 功能与桌面版相同（多标签、完整 UART 配置、日志记录等）

运行 Web 版本：
```bash
npm run web:dev      # 启动 Vite 开发服务器（HTTPS，localhost:5173）
npm run web:build    # 构建生产版本
npm run web:preview  # 预览生产构建
npm run web:serve    # 使用 HTTPS 提供生产构建
npm run web:test     # 运行 Playwright E2E 测试
```

**浏览器支持**：Chrome 89+、Edge 89+、Opera 75+（需要 Web Serial API）
*Firefox 和 Safari 不支持。*

### 键盘快捷键
| 快捷键 | 操作 |
|--------|------|
| `Ctrl/Cmd + N` | 新建连接 |
| `Ctrl/Cmd + W` | 关闭窗口 |
| `Ctrl/Cmd + Shift + D` | 切换调试控制台 |

---

## 安装

### 环境要求

- Node.js 20.x 或更高版本
- npm（随 Node.js 一起安装）

### 安装依赖

```bash
npm install
```

中国用户使用 Electron 镜像以获得更快的下载速度：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

---

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

---

## 开发

### 项目结构

```
patterm/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── main.js     # 应用入口点
│   │   └── window-manager.js  # 多窗口和标签页管理
│   ├── renderer/       # UI/前端代码
│   │   ├── index.html  # 主窗口 HTML
│   │   ├── main.js     # 主窗口 JavaScript
│   │   ├── tab.html    # 标签页内容 HTML
│   │   ├── connection-dialog.html  # 连接对话框 HTML
│   │   ├── connection-dialog.js    # 连接对话框逻辑
│   │   ├── about.html  # 关于对话框 HTML
│   │   └── styles.css  # 全局 CSS 样式
│   ├── services/       # 业务逻辑
│   │   ├── serial-service.js  # 单个串口处理
│   │   └── serial-service-manager.js  # 多连接管理
│   └── public/         # 静态资源
├── tests/              # Jest 测试套件
├── .github/workflows/  # CI/CD 配置
├── package.json
├── AGENTS.md           # 开发指南
└── CLAUDE.md           # AI 助手指南
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

#### 快速端到端测试（推荐）

```bash
# 一键测试：创建虚拟串口并启动 Patterm
npm run test:e2e
```

该命令会：
1. 在 `/tmp/ttyV0` 创建虚拟串口
2. 启动 Patterm 应用
3. 显示连接说明
4. 退出时自动清理

**其他选项：**
```bash
bash scripts/test.sh -h      # 显示帮助
bash scripts/test.sh -k      # 退出后保持虚拟串口运行
bash scripts/test.sh -c      # 清理现有虚拟串口
bash scripts/test.sh -p /tmp/ttyUSB0  # 使用自定义端口路径
```

**发送测试数据（在另一个终端）：**
```bash
echo "你好 Patterm！" | nc localhost 12345
telnet localhost 12345
```

#### 虚拟串口测试

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

#### 快速测试脚本

```bash
# 创建虚拟端口并启动回显服务器
bash scripts/quick-virtual-serial.sh

# 在 Patterm 中连接显示的端口（如 /dev/pts/0）
# 所有发送的数据都会被回显
```

#### Python 虚拟串口

```bash
# 安装所需包
sudo apt install python3-ptyprocess

# 运行交互式虚拟串口
python3 scripts/virtual-serial.py

# 使用命令：1、2、q 或直接输入任何文本
```

#### 单元测试

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

| 平台 | 格式 |
|------|------|
| Windows | NSIS 安装程序 (.exe) + Portable (.exe) |
| macOS | DMG 磁盘映像 (.dmg) |
| Linux | AppImage + Debian 软件包 (.deb) |

构建产物放置在 `dist/` 目录中。

---

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

---

## CI/CD

本项目使用 GitHub Actions 进行持续集成：

- **触发条件**：推送到 master、拉取请求、标签
- **平台**：Ubuntu、macOS、Windows
- **Node 版本**：20.x
- **操作**：代码检查、构建、测试、发布
- **产物**：构建产物保留 7 天
- **发布**：标记提交时自动发布 (v*)

![CI/CD Pipeline](https://img.shields.io/github/actions/workflow/status/oroliy/patterm/ci-cd.yml?branch=master&label=CI%2FCD)

配置详情请查看 `.github/workflows/ci-cd.yml`。

---

## 许可证

MIT 许可证 - 详见 LICENSE 文件

---

## 支持

如有问题、疑问或贡献意向：

- ![GitHub Issues](https://img.shields.io/github/issues/oroliy/patterm) [提交 Issue](https://github.com/oroliy/patterm/issues)
- 查看 [AGENTS.md](./AGENTS.md) 中的现有文档
- 查看仓库中的代码示例

---

## 致谢

使用以下技术构建：

- [![Electron](https://img.shields.io/badge/Electron-40.0.0-47848F?logo=electron)](https://www.electronjs.org/)
- [![SerialPort.js](https://img.shields.io/badge/SerialPort-12.0.0-00A98F?logo=node.js)](https://serialport.io/)
- [![Electron Builder](https://img.shields.io/badge/Electron%20Builder-24.9.1-475A86?logo=electron)](https://www.electron.build/)
- [![Jest](https://img.shields.io/badge/Jest-29.7.0-C21325?logo=jest)](https://jestjs.io/)

---

<div align="center">

**由 Patterm 团队用 ❤️ 制作**

[⬆ 返回顶部](#patterm)

</div>
