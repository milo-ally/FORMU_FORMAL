# FORMU 



![FORMU 展示](frontend/static/show.png) 



**FORMU** 是一款现代化的 Web 应用，它能将你的二维图片转换为令人惊叹的三维模型。通过强大的 AI 服务，它提供了从图片分析、创意提示词生成到最终 3D 模型创建的无缝工作流，并配备了一个美观、实时交互的界面。

---

### ✨ 核心功能

*   **AI 驱动的 3D 模型生成**：通过 Tripo3D API 将静态图片转换为完整渲染的 `.glb` 3D 模型。
*   **智能图片分析**：集成 Coze API 深度理解用户上传图片的内容与上下文。
*   **多风格提示词生成**：基于图片分析生成高质量的创意提示词，支持多种风格（如：写实、可爱、赛博朋克）。
*   **实时用户体验**：使用 WebSockets 和 SSE（服务器发送事件）提供实时进度更新，并带有“打字机效果”。
*   **现代化交互式 UI**：
    *   精美的 3D 轮播展示，带来沉浸式视觉体验。
    *   玻璃拟态风格设计，支持折叠侧边栏。
    *   支持拖拽上传图片和粘贴图片 URL。
    *   弹窗编辑器，允许用户调整 AI 生成的文本。
*   **完整的用户与项目管理**：
    *   基于 JWT 的安全用户认证（注册/登录）。
    *   持久化的项目历史，用户可保存、查看、编辑、删除作品。

---

### 🛠️ 技术栈

**后端（Backend）：**
*   **框架**: FastAPI
*   **数据库**: MySQL
*   **认证**: JWT
*   **AI 服务**: Tripo3D API、Coze API
*   **实时通信**: WebSockets
*   **异步 HTTP**: httpx
*   **服务器**: Uvicorn

**前端（Frontend）：**
*   **框架**: React 19 (Hooks)
*   **构建工具**: Vite
*   **路由**: React Router
*   **样式**: 现代 CSS（变量、动画）
*   **实时通信**: 原生 `fetch` + SSE 流式传输

---

### 🚀 快速开始

#### 前置条件
*   Python 3.12+ 
*   Node.js v22+ 与 npm
*   Docker 和 Docker Compose

#### 部署步骤

1. **启动 MySQL 容器**
   ```bash
   docker-compose -f docker-compose.mysql.yml up -d
   ```

2. **启动后端服务**
   ```bash
   cd backend
   pip install -r requirements.txt
   python run.py
   ```

3. **启动前端服务**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

#### 访问应用
- 前端：http://ip地址:5173
- 后端：http://ip地址:8000

#### 常用命令
```bash
# 启动 MySQL
docker-compose -f docker-compose.mysql.yml up -d

# 停止 MySQL
docker-compose -f docker-compose.mysql.yml down

# 查看状态
docker-compose -f docker-compose.mysql.yml ps
```

#### 配置信息
- **数据库**: FORMU
- **用户**: formu_user
- **密码**: milo_2357
- **端口**: 3306

---

### 🌟 致谢

*   本项目由 [Tripo3D](https://www.tripo3d.ai/) 与 [Coze](https://www.coze.cn/) 的优秀 API 提供支持。
*   [@困 @一片小叶子🍃 @lavender] 
