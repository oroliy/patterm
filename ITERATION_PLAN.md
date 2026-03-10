# Patterm 双端融合、稳定性与现代终端体验迭代计划 (v0.7.0 - v0.9.0)

## 当前优先顺序 (2026-03-10)
- [x] 统一串口提供者契约：新增共享 `BaseSerialProvider` 与 `normalizeSerialConfig`
- [x] Electron 渲染层切换到 `ElectronSerialProvider`，沿用共享配置归一化
- [x] Web 端串口服务切换到 `WebSerialProvider`，沿用共享配置归一化
- [x] 连接对话框收敛为共享主体 + Electron 端口枚举适配
- [x] 继续收敛 Electron 渲染层残余专用 UI 逻辑
- [x] 为共享串口抽象补单元测试
- [x] 将双端 E2E 纳入统一 CI 流程
- [x] 收敛 GitHub Actions 发布门禁：仅 Tag 触发 GitHub Release，发布前串联 Web PWA 部署
- [x] 为 Web 无头 E2E 增加稳定的 CI 启停脚本，避免后台 Vite 进程泄漏
- [x] 修复主窗口终端显示链路，确保输入/输出都在共享主视图中渲染
- [x] 落地当前标签页搜索与方向过滤，补齐 `terminal entry` 结构化基础
- [x] 实现命令面板基础版，统一封装新建连接、清屏、搜索、关闭标签、主题切换等动作
- [ ] 落地会话恢复 MVP，保存激活标签、过滤器状态和基础 UI 偏好
- [ ] 校验 Cloudflare Pages 生产环境变量与 GitHub Secrets，并完成一次 `v0.8.0` 演练发布

## 📌 总体愿景
将 Patterm 从“碰巧拥有 Web 版本的桌面应用”转变为**“以共享核心驱动的现代化多端统一终端应用”**。

---

## 📅 第一阶段：架构对齐与核心逻辑统一 (v0.7.0)
**目标**：抹平底层 API 差异，将 Electron 渲染进程的陈旧逻辑重构为与 Web 端一致的组件化/服务化模型。

| 维度 | 详细内容 |
| :--- | :--- |
| **功能模块** | **1. 串口服务抽象层 (Serial Service Abstraction)** <br> - 定义跨平台的 `ISerialService` 接口规范。 <br> - 适配层实现：`NodeSerialProvider` (封装 `serialport` 库供 Electron 主进程使用) 和 `WebSerialProvider` (封装 Web Serial API 供浏览器使用)。 <br> **2. 桌面端 UI 组件化重构** <br> - 废弃 `src/renderer/main.js` 和 `tab.js` 中紧耦合的 DOM 操作逻辑。 <br> - 引入并适配 `src/web/js/components/` 下的 `TabComponent`, `TerminalComponent` 和 `ConnectionDialog` 到 Electron 渲染层。 |
| **技术选型** | ES6 Modules 纯原生实现、面向接口编程 (Adapter Pattern)。保持零前端框架 (无 React/Vue) 以追求极致性能和轻量化。 |
| **开发周期** | **2 周** (Week 1: 服务层抽象与底层通信解耦；Week 2: 桌面端 UI 组件替换与联调)。 |
| **测试标准** | - **单元测试**：针对统一后的数据解析器 (`formatters.js`, `utils.js`) 覆盖率需达到 90% 以上。<br> - **集成验证**：在 Electron 中能够正常打开现有所有波特率配置，且收发数据无乱码、无延迟。 |
| **上线节点** | 发布 `v0.7.0-beta`，邀请核心用户进行桌面端回归测试。 |

---

## 📅 第二阶段：自动化测试工程化与边界防御 (v0.7.5)
**目标**：利用 Playwright 建立覆盖双端核心交互的自动化测试防护网，重点攻克 Web Serial 的硬件交互边界场景。

| 维度 | 详细内容 |
| :--- | :--- |
| **功能模块** | **1. Web 端异常场景防御测试** <br> - 编写 Playwright 测试用例模拟：设备热拔插（突然断开）、拒绝授予串口权限、端口被其他程序占用、超高频数据狂暴输入（压力测试）。 <br> **2. 桌面端 (Electron) E2E 测试整合** <br> - 引入 `@playwright/test` 的 Electron 支持模块。 <br> - 复用 `web/tests/` 下的用例（如 `send-receive.spec.js`），在真实 Electron 环境中跑通完整的连接->收发->断开流程。 |
| **技术选型** | 测试框架：**Playwright** (原生支持 Web 和 Electron 的多端 E2E 测试)；断言库：Playwright 自带的 Expect；硬件模拟：通过 Mock Web Serial API 对象来模拟硬件行为。 |
| **开发周期** | **1.5 周** (Week 3: Web 端边界用例补全与 Mock 方案实施；Week 4 前半周: Electron 测试环境搭建与用例复用)。 |
| **测试标准** | - 核心 P0 流程 (连接、基础收发、断开) E2E 自动化测试通过率 **100%**。<br> - 硬件异常断开时，UI 必须能正确捕获并提示，不允许出现应用白屏或崩溃 (Crash)。 |
| **上线节点** | 将自动化测试集成到本地 Git pre-push Hook 中，发布 `v0.7.5`。 |

---

## 📅 第三阶段：CI/CD 管道闭环与 PWA 自动化部署 (v0.8.0)
**目标**：解放人力，实现代码提交后的自动检查、自动构建、双端自动发布。

| 维度 | 详细内容 |
| :--- | :--- |
| **功能模块** | **1. Web PWA 持续部署 (CD)** <br> - 识别到项目中已存在 `wrangler.jsonc`，配置 GitHub Actions 将 Web 端产物 (`npm run web:build`) 自动部署至 **Cloudflare Pages**。 <br> **2. 双端统一构建流水线增强** <br> - 修改 `.github/workflows/ci-cd.yml`。 <br> - 新增 Job：`web-test` (运行 Playwright 无头测试)。 <br> - 新增 Job：基于 Tag 触发时，同时 Release 桌面端安装包和更新 PWA 线上版本。 |
| **技术选型** | CI/CD 引擎：**GitHub Actions**；Web 部署平台：**Cloudflare Pages** (通过 Wrangler CLI 结合 Action 部署)；Web 构建工具：**Vite**。 |
| **开发周期** | **1 周** (Week 4 后半周: 编写 Workflow 脚本；Week 5 前半周: 联调部署流程及环境变量配置)。 |
| **测试标准** | - 提交 PR 时，GitHub Actions 必须在 5 分钟内完成 Lint, 单元测试以及 Playwright (Web 无头模式) 测试。 <br> - 打 Tag (如 `v0.8.0`) 时，Cloudflare Pages 成功更新，且 GitHub Releases 成功生成 Win/Mac/Linux 安装包。 |
| **上线节点** | 产出完全自动化的发布流水线，正式发布双端融合架构的 **Patterm v0.8.0 稳定版**。 |

### 第三阶段当前状态 (2026-03-10)
- 已完成：`web-test`、`electron-test`、跨平台 `build`、Cloudflare Pages 部署 Job、Tag 触发 GitHub Release
- 已完成：Release 仅接受 `refs/tags/v*`，避免通过提交信息误发版
- 已完成：Web CI 测试改为 `npm run web:test:ci`，使用 `wait-on` 和 `trap` 稳定管理 Vite 生命周期
- 待完成：补齐 Cloudflare Pages 正式环境 Secret，验证一次真实 Tag 发布链路

---

## 📅 第四阶段：现代终端可用性底座 (v0.8.x)
**目标**：补齐现代终端的高频基础能力，让 Patterm 从“能用的串口工具”升级为“高效率的多会话调试工作台”。**

| 维度 | 详细内容 |
| :--- | :--- |
| **功能模块** | **1. 全局搜索与过滤 (Search & Filter)** <br> - 支持当前标签页搜索、全局标签页搜索、正则搜索、大小写敏感切换。 <br> - 为日志/终端数据增加元数据：`tabId`、`direction`(`rx`/`tx`)、`timestamp`、`level`、`transport`。 <br> - 支持仅看 RX、仅看 TX、仅看错误、时间范围过滤，且过滤结果不破坏原始日志。 <br> **2. 命令面板 (Command Palette)** <br> - 支持统一入口执行动作：新建连接、断开、重连、切换 HEX、切换自动滚动、开始/停止日志、切换主题、打开搜索。 <br> - 提供统一 action registry，Web 与 Electron 渲染层共用。 <br> **3. 会话恢复 (Session Restore)** <br> - 保存窗口级 UI 状态：打开的 tabs、激活 tab、连接参数、终端显示模式、过滤器状态。 <br> - Electron 默认启用最近会话恢复；Web 端至少恢复 UI 元数据，不自动重新申请串口权限。 |
| **参考来源** | Warp 的 Command Palette / Command Search / Block Find；Windows Terminal 的 Command Palette；WezTerm、Ghostty、kitty 的 tabs + panes + actions 模型。 |
| **实现锚点** | - 在 `src/shared/js/app/AppShell.js` 新增 command registry 与搜索面板入口。 <br> - 扩展 `src/web/js/services/TabManager.js` 的 tab state，纳入结构化事件与会话序列化。 <br> - 扩展 `src/web/js/services/LogManager.js`，支持结构化日志项与过滤导出。 |
| **开发周期** | **2 周** (Week 1: 数据模型与搜索过滤；Week 2: 命令面板与会话恢复)。 |
| **测试标准** | - 单元测试覆盖搜索过滤谓词、会话序列化与恢复逻辑。 <br> - Playwright 验证搜索结果高亮、过滤切换、刷新后会话恢复。 <br> - Web 端必须正确处理浏览器串口权限不可恢复的场景提示。 |
| **上线节点** | 发布 `v0.8.5-beta`，重点收集重度调试用户对搜索、恢复、快捷操作链路的反馈。 |

### 第四阶段拆解建议
- P0: 已完成统一终端事件数据结构，新增 `terminal entry` 模型，当前标签页支持搜索和 `All/RX/TX/Error` 过滤
- P0: 已完成命令面板基础版，支持 `Ctrl/Cmd+K` 唤起并执行共享 action
- P1: 会话恢复仅恢复 UI 与配置，不自动重连串口，先保证安全和可解释性
- P1: 搜索结果支持定位到原始终端位置，并保留上下文高亮

### 第四阶段当前状态 (2026-03-10)
- 已完成：主窗口终端发送/接收显示修复，清理绕过真实交互的调试测试
- 已完成：Web CI 改为真实 UI 路径断言，覆盖连接对话框、发送、回显和主终端显示
- 已完成：当前标签页搜索与方向过滤 MVP，基于共享 `terminal entry` 结构实现
- 已完成：在 `AppShell` 中引入 action registry 和命令面板入口，统一现有高频操作
- 下一步：实现会话恢复 MVP，先覆盖激活标签、终端过滤器和主题等低风险 UI 状态

---

## 📅 第五阶段：面向串口调试的差异化能力 (v0.9.0)
**目标**：借鉴现代终端的结构化交互与自动化理念，但把能力真正落到串口调试、协议联调、批量诊断的核心场景。**

| 维度 | 详细内容 |
| :--- | :--- |
| **功能模块** | **1. 事务块视图 (Transaction / Block View)** <br> - 将“一次发送 + 一段接收窗口”组织为可折叠事务块。 <br> - 支持块级复制、导出、重命名、标星、仅看失败块。 <br> - 兼容纯接收场景，允许系统生成“未关联输入”的接收块。 <br> **2. Trigger 引擎** <br> - 规则模型：`match -> action`。 <br> - 支持匹配正则、十六进制片段、超时未响应。 <br> - 动作支持：高亮、通知、声音、自动回复、开始录制、切换标签颜色、写入标记。 <br> **3. Workflow / Macro** <br> - 预置 AT、Modbus、Bootloader、产测脚本模板。 <br> - 支持参数化变量、延迟、等待响应、失败中断。 <br> - 与 Trigger 引擎共享匹配能力。 <br> **4. 分屏布局 (Split Panes)** <br> - 支持一个窗口同时观察主串口、日志串口、控制串口。 <br> - 支持保存/恢复布局预设。 |
| **参考来源** | Warp 的 Blocks 与 Workflows；iTerm2 的 Triggers；Windows Terminal / WezTerm / Ghostty / kitty 的 panes 和 action 系统。 |
| **实现锚点** | - 在 `TabManager` 之上新增 `SessionWorkspace` / `PaneLayout` 层，不直接把分屏逻辑塞进 tab 组件。 <br> - 为终端数据建立 `transactionId`、`source`、`matchState` 字段，支撑块视图与 trigger。 <br> - 将自动化规则存储为 JSON 配置，先不做插件系统。 |
| **开发周期** | **3 周** (Week 1: trigger + structured log；Week 2: workflow；Week 3: block view 与分屏 MVP)。 |
| **测试标准** | - 单元测试覆盖规则匹配、事务归并、超时关闭块、工作流执行状态机。 <br> - E2E 覆盖“发送 -> 自动匹配 -> 高亮/自动回复 -> 导出块”的完整链路。 <br> - 分屏模式下多连接并发收发时不得互串状态或污染 counters。 |
| **上线节点** | 发布 `v0.9.0`，作为“现代串口终端工作台”定位的首个稳定版。 |

### 第五阶段拆解建议
- P0: Trigger 引擎先只做只读动作和高亮，不先放开自动回复，降低误操作风险
- P0: Workflow 先做“发送步骤 + 等待匹配 + 超时失败”，不先做脚本执行
- P1: 事务块按时间窗口归并，默认窗口建议为 300ms 到 1000ms，可配置
- P1: 分屏先支持 2-pane / 3-pane 固定模板，不先做自由拖拽布局

---

## 🎯 现代特性优先级结论 (2026-03-10)

### 最值得优先做
1. 全局搜索与过滤
2. 命令面板
3. 会话恢复
4. Trigger 引擎
5. Workflow / Macro

### 能形成产品差异化
1. 事务块视图
2. 基于匹配规则的自动标记与告警
3. 面向串口场景的工作流模板库
4. 多串口分屏观察

### 暂不建议优先投入
1. AI 助手
2. 图片/富媒体协议
3. 通用 SSH / remote multiplexer 能力
4. 复杂插件市场

原因：这些方向虽符合通用终端趋势，但对 Patterm 的串口调试主线收益不如结构化日志、搜索过滤、触发器和工作流直接。
