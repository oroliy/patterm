# Patterm

一款基于 Electron 构建的专业串口终端应用，支持多窗口功能和完整的 UART 配置。

## 功能特性

- **多窗口标签页**：在独立的标签页中打开和管理多个串口连接
- **完整的 UART 配置**：
  - 波特率：110 至 921600
  - 数据位：5, 6, 7, 8
  - 停止位：1, 1.5, 2
  - 校验位：无、奇校验、偶校验、标记校验、空格校验
  - 流控：RTS/CTS、XON/XOFF
- **实时串口 I/O**：以最小延迟发送和接收数据
- **文件记录**：
  - 手动记录（按需开始/停止）
  - 自动记录（连续）
  - 带时间戳的条目
- **跨平台**：支持 Windows、macOS 和 Linux
- **键盘快捷键**：
  - `Ctrl/Cmd + N` - 新建窗口/标签
  - `Ctrl/Cmd + W` - 关闭窗口

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
2. **选择串口**：在工具栏的下拉列表中选择串口
3. **配置设置**：根据需要配置波特率、数据位等
4. **点击"连接"**：打开串口
5. **发送数据**：在输入框中输入并按 Enter 发送
6. **查看接收数据**：在终端窗口中显示
7. **添加更多标签**：使用 `Ctrl/Cmd + N` 添加额外连接
8. **启用记录**：将串口数据保存到文件

## 开发

### 项目结构

```
patterm/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── main.js     # 应用入口点
│   │   └── window-manager.js  # 多窗口管理
│   ├── renderer/       # UI/前端代码
│   │   ├── index.html  # 主窗口 HTML
│   │   ├── tab.html    # 标签页内容 HTML
│   │   └── about.html  # 关于对话框 HTML
│   ├── services/       # 业务逻辑
│   │   └── serial-service.js  # 串口处理
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
