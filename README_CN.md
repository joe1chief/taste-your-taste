<div align="center">

# 🍷 Taste Your Taste (品味你的品味)
### *汇集顶级开源项目中的开发者审美与 Vibe Coding 准则*

**CLAUDE.md • .agent • .cursorrules • AGENTS.md • 反 AI 油腻哲学 (Anti-Slop)**

<p align="center">
  <a href="https://github.com/joe1chief/taste-your-taste/actions/workflows/radar.yml">
    <img src="https://github.com/joe1chief/taste-your-taste/actions/workflows/radar.yml/badge.svg" alt="Taste Radar Status">
  </a>
  <a href="https://github.com/joe1chief/taste-your-taste/stargazers">
    <img src="https://img.shields.io/github/stars/joe1chief/taste-your-taste?style=flat&color=yellow" alt="GitHub Stars">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
  </a>
  <a href="./README.md">
    <img src="https://img.shields.io/badge/Document-English-blue.svg" alt="English Document">
  </a>
</p>

<p align="center">
  <b>“代码生成变得廉价，审美与品味才是稀缺品。”</b>
</p>

</div>

---

## 📖 项目起源与宣言

在 AI 时代之前，程序员最喜欢围观黑客大佬们的 `.dotfiles`（`.zshrc`, `.vimrc`, `tmux.conf`），看高手如何调校自己的武器库。

而在 **Vibe Coding（氛围编程）** 时代，人类程序员不再手敲每一行样板语法。**开发者的审美、品味与技术主权，集中体现在他赋予 AI Agent 的边界、脾气和工程戒律中**：

* 顶尖开源团队如何避免 AI 的“油腻感”（无意义客套、虚假单元测试、过度抽象）？
* 极速狂飙的独立黑客如何迫使 AI 直接输出短小精炼的 Git Diff？
* NVIDIA、Stripe、tidyverse 等明星项目在实际生产中是如何写 `CLAUDE.md` 与 `.agent` 的？

**`taste-your-taste`** 既是一座开放的开发者审美博物馆，也是一个**自动化雷达**，致力于持续发现、提炼并分享全球热门开源项目中最顶级的编程品味。

---

## 📡 自动化雷达：每日追踪与持续更新

本项目由 **GitHub Actions** 与内置的 **Radar 引擎**（`scripts/radar.py`）驱动，每日自动监控 GitHub Trending 与热门代码变动：

```mermaid
flowchart LR
    A["🔥 GitHub 每日 Trending & 热门代码搜索"] --> B["🤖 GitHub Actions 定时任务 (Cron)"]
    B --> C["🔍 scripts/radar.py 雷达引擎"]
    C --> D{"发现 Taste 配置文件?"}
    D -- 是 --> E["⚡ 自动推断品味流派 & 提取亮点代码"]
    E --> F["📬 自动提 Issue 提醒审核并归档"]
    F --> G["🏆 维护者审核并收入名人堂"]
    D -- 否 --> H["进入下一轮休眠"]
```

* **监控目标文件**：`CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/rules.md`, `.agent/rules.md`, `.agent/PLANS.md`, `.cursorrules`, `.cursor/rules/`, `AGENTS.md`。
* **零噪音与防重**：历史状态记录在 `data/seen_repos.json` 中，已处理项目不重复提醒。
* **手机端推送**：一旦明星项目新增或更新 Agent 指令，自动在仓库创建包含预览的 Issue，直接推送到你的 GitHub 通知和邮箱！

---

## 🏛️ 经典品味名人堂 (Hall of Fame)

以下配置均直接提炼自知名开源项目的真实生产环境：

| 项目 | Stars | 语言 | 配置文件 | 品味流派 | 核心亮点 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| [**NVIDIA / OpenShell**](tastes/ai-infra/nvidia-openshell) | ⭐️ 11.6k | Rust | `AGENTS.md` | ⚡ 直击要害 / 极简主义 | 每次交互必注入上下文；明令禁止无意义的架构重构。 |
| [**Stripe / stripe-java**](tastes/fintech/stripe-java) | ⭐️ 600 | Java | `.claude/CLAUDE.md` | 🏢 工程规范 / 工业标准 | 严谨的 `just` 单测运行指令、Spotless 格式化与清晰的 HTTP 抽象层次。 |
| [**keras_cv_attention_models**](tastes/machine-learning/keras-cv-attention-models) | ⭐️ 1.7k | Python | `.agent/rules.md` | 🤠 单兵作战 / 极速狂飙 | 允许 `160` 字符单行、推崇单行多变量赋值、主模型只写薄包装。 |
| [**tidyverse / readr**](tastes/data-science/tidyverse-readr) | ⭐️ 1.1k | R / C++ | `.claude/CLAUDE.md` | 🛡️ 防御洁癖 / 严苛架构 | 清晰划分懒解析架构（Edition 2）与 C++ 快速解析（Edition 1）的边界。 |
| [**securego / gosec**](tastes/security/securego-gosec) | ⭐️ 5.4k | Go | `CLAUDE.md` | 🛡️ 防御洁癖 / 严苛架构 | AST 遍历规范、安全规则 ID 严禁破坏、确定性单测执行。 |

---

## 🎭 四大品味流派 (Vibe Archetypes)

我们把 AI 时代开发者的品味划分为四大流派：

### 1. ⚡ 直击要害 / 极简主义 (Anti-Slop / Minimalist)
* **信条**：*“别道歉，别寒暄。直接给我 diff，绝不引入多余依赖。”*
* **特征**：极简上下文、零废话输出、偏好原生语言基础能力、严控三方包膨胀。

### 2. 🛡️ 防御洁癖 / 严苛架构 (Defensive Architect)
* **信条**：*“只要有可能被破坏的不变量，就一定会出 bug。”*
* **特征**：严苛类型系统、极致的异常捕获与边界测试、严禁无意义的 Mock 单元测试。

### 3. 🤠 单兵作战 / 极速狂飙 (Hacker Velocity)
* **信条**：*“能跑的软件高于一切形式主义。”*
* **特征**：单行元组赋值、超宽行宽限制（160+ 字符）、轻量薄包装函数、快速原型验证。

### 4. 🏢 工程规范 / 工业标准 (Engineering Craft)
* **信条**：*“一致性产生可靠性。”*
* **特征**：确定性任务脚本（`just`, `make`）、自动格式化强制校验、严格分层解耦。

---

## ⚡ 真实世界中的反油腻禁令 (Anti-Slop Commandments)

从真实开源项目配置中淘出的“驯兽灵丹”：

> **关于废话与客套：**
> *“严禁说‘好的！’、‘我很乐意为您服务’或进行道歉。直接输出最终解决方案或 Git 补丁代码。”*

> **关于依赖膨胀：**
> *“如果一段逻辑用原生标准库 20 行以内可以优雅实现，严禁引入任何第三方 npm/pip 包。”*

> **关于范围失控与过度重构：**
> *“未经显式许可，严禁在当前修改范围之外擅自修改或重构其他代码。拒绝投机性的代码清理。”*

> **关于单元测试假象：**
> *“严禁编写仅仅断言 Mock 返回 Mock 的无意义单元测试。所有测试必须针对真实数据结构验证核心逻辑。”*

---

## 🛠️ 本地运行雷达脚本

你想在本地机器上运行雷达，或者搜索特定仓库？

```bash
# 克隆仓库
git clone https://github.com/joe1chief/taste-your-taste.git
cd taste-your-taste

# 本地试运行（Dry-Run，不会创建 Issue，不修改本地库）
python3 scripts/radar.py --dry-run --limit 5

# 运行扫描并自动将新发现归档到 discovered/ 目录
python3 scripts/radar.py --limit 5 --min-stars 100
```

---

## 🤝 参与贡献

如果你在某个优秀的开源项目里发现了惊艳的 `CLAUDE.md`、`.cursorrules` 或 `.agent/rules.md`：

1. **通过 Issue 提交**：点击 [**✨ 提交一份开发者品味**](https://github.com/joe1chief/taste-your-taste/issues/new?template=taste_submission.yml) 快速填写。
2. **通过 PR 提交**：在 `tastes/<分类>/<仓库名>/` 下添加对应的文件与 `META.json`，并更新主 README！

---

## 📄 开源许可证

本项目基于 [MIT 许可证](./LICENSE) 开源。收录的各开源项目配置文件版权归其原作者和开源项目所有。
