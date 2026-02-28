# Patterm 双端融合与稳定性提升迭代计划 (v0.7.0 - v0.8.0)

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