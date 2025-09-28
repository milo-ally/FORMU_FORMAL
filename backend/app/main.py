from datetime import datetime  # 直接导入datetime类
from pathlib import Path
from typing import List, Dict
import sys 
import httpx
import websockets
from fastapi import Depends
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl
from cozepy import MessageObjectString

current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.append(str(project_root))

from app.core.middleware import LoggingMiddleware  # 修改这行
from app.core.logger import get_logger
from app.api import api_router
from app.services.llm_factory import LLMFactory
from app.core.database import ensure_database_and_tables
from app.services.sora_service import SoraService
from app.services.tripo_service import Tripo3DService, Model3DResult # 导入高层服务和模型
from app.utils.file_utils import save_upload_file 


# 初始化 logger
logger = get_logger(__name__)  # 新增

# 定义上传目录并确保存在
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 创建应用实例（保持不变）
app = FastAPI(title="FORMU REST API")

# 中间件与路由：移除重复配置
app.add_middleware(LoggingMiddleware)
app.add_middleware(  # 只保留一次CORS配置
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境需改为具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api")  # 只保留一次路由挂载

# 挂载上传的静态资源目录，便于直接访问已上传文件
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# 管理员系统路由 - 必须在任何挂载之前定义
@app.get("/admin")
async def serve_admin():
    """提供管理员系统页面"""
    logger.info("Admin route accessed!")
    admin_file_path = Path(__file__).parent.parent / "admin.html"
    with open(admin_file_path, "r", encoding="utf-8") as f:
        content = f.read()
    return HTMLResponse(content=content)

# 应用启动时确保数据库和数据表就绪
@app.on_event("startup")
async def _startup_init_db():
    try:
        await ensure_database_and_tables()
        logger.info("Database and tables are ready")
    except Exception as e:
        logger.error(f"Failed to ensure database/tables: {e}")


# ========== 文件上传接口 ==========
@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    # 校验文件类型
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="仅支持图片文件上传")

    # 生成不重复文件名：时间戳_原始文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = Path(file.filename).name
    save_name = f"{timestamp}_{safe_name}"
    save_path = UPLOAD_DIR / save_name

    # 保存文件
    data = await file.read()
    save_path.write_bytes(data)

    logger.info(f"Image uploaded: {save_path}")
    return {
        "message": "上传完成",
        "filename": save_name,
        "url": f"/uploads/{save_name}"
    }


# ========== 生成图片分析和提示词（SSE） ==========
@app.post("/prompt-generation")
async def prompt_generation(style: str, file: UploadFile = File(...)):
    # 允许的风格映射到工厂方法
    style_factory = {
        "cute": LLMFactory.create_cute_style_prompt_generation_service,
        "steampunk": LLMFactory.create_steampunk_style_prompt_generation_service,
        "japanese_comic": LLMFactory.create_japanese_comic_style_prompt_generation_service,
        "american_comic": LLMFactory.create_american_comic_style_prompt_generation_service,
        "profession": LLMFactory.create_profession_style_prompt_generation_service,
        "cyberpunk": LLMFactory.create_cyberpunk_style_prompt_generation_service,
        "gothic": LLMFactory.create_gothic_style_prompt_generation_service,
        "realistic": LLMFactory.create_realistic_style_prompt_generation_service,
    }

    if style not in style_factory:
        raise HTTPException(status_code=422, detail="无效的风格参数")

    # 保存上传的图片以便本地上传到 Coze
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="仅支持图片文件")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = Path(file.filename).name
    save_name = f"{timestamp}_{safe_name}"
    save_path = UPLOAD_DIR / save_name
    data = await file.read()
    save_path.write_bytes(data)

    picture_service = LLMFactory.create_picture_analysis_service()

    # 1) 上传图片到 Coze，拿到 file_id
    try:
        file_id = await picture_service.upload_local_image(str(save_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"图片上传到分析服务失败: {str(e)}")

    # 2) 先流式输出图片分析信息（event: analysis），同时拼接成完整文本
    prompt_service = style_factory[style]()

    async def event_stream():
        try:
            # 2.1 流式分析
            analysis_parts = []
            async for chunk in picture_service.generate_stream(
                objects=[
                    MessageObjectString.build_text("请描述一下图片中的内容"),
                    MessageObjectString.build_image(file_id=file_id, file_url=None),
                ],
                meta_data=None,
            ):
                if not chunk.startswith("data:"):
                    continue
                content = chunk[len("data: "):].strip()
                if content == "[DONE]":
                    break
                if content:
                    analysis_parts.append(content)
                    # 标记为图片分析阶段，便于前端区分展示
                    yield f"event: analysis\ndata: {content}\n\n"

            analysis_text = "".join(analysis_parts)

            # 2.2 根据风格生成提示词（event: prompt）
            async for sse_chunk in prompt_service.generate_stream(
                objects=[MessageObjectString.build_text(analysis_text)],
                meta_data=None,
            ):
                if not sse_chunk.startswith("data:"):
                    continue
                prompt_content = sse_chunk[len("data: "):].strip()
                if prompt_content == "[DONE]":
                    break
                yield f"event: prompt\ndata: {prompt_content}\n\n"

            # 结束信号（兼容原有消费方式）
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: 出错: {str(e)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ========== 通过网络图片链接生成提示词（SSE） ==========
class GenerateFromUrlRequest(BaseModel):
    style: str
    image_url: HttpUrl


class SoraImageToImageRequest(BaseModel):
    prompt: str
    model: str = "sora_image"
    n: int = 1
    size: str = "1024x1024"
    strength: float = 0.8
    is_async: bool = False
    auth_key: Optional[str] = None

class TaskSubmitResponse(BaseModel):
    task_id: str
@app.post("/prompt-generation-url")
async def prompt_generation_by_url(payload: GenerateFromUrlRequest):
    style_factory = {
        "cute": LLMFactory.create_cute_style_prompt_generation_service,
        "steampunk": LLMFactory.create_steampunk_style_prompt_generation_service,
        "japanese_comic": LLMFactory.create_japanese_comic_style_prompt_generation_service,
        "american_comic": LLMFactory.create_american_comic_style_prompt_generation_service,
        "profession": LLMFactory.create_profession_style_prompt_generation_service,
        "cyberpunk": LLMFactory.create_cyberpunk_style_prompt_generation_service,
        "gothic": LLMFactory.create_gothic_style_prompt_generation_service,
        "realistic": LLMFactory.create_realistic_style_prompt_generation_service,
    }

    style = payload.style
    image_url = str(payload.image_url)
    if style not in style_factory:
        raise HTTPException(status_code=422, detail="无效的风格参数")

    picture_service = LLMFactory.create_picture_analysis_service()
    prompt_service = style_factory[style]()

    async def event_stream():
        try:
            # 1) 图片分析（使用远程图片 URL）
            analysis_parts = []
            async for chunk in picture_service.generate_stream(
                objects=[
                    MessageObjectString.build_text("请描述一下图片中的内容"),
                    MessageObjectString.build_image(file_id=None, file_url=image_url),
                ],
                meta_data=None,
            ):
                if not chunk.startswith("data:"):
                    continue
                content = chunk[len("data: "):].strip()
                if content == "[DONE]":
                    break
                if content:
                    analysis_parts.append(content)
                    yield f"event: analysis\ndata: {content}\n\n"

            analysis_text = "".join(analysis_parts)

            # 2) 生成提示词
            async for sse_chunk in prompt_service.generate_stream(
                objects=[MessageObjectString.build_text(analysis_text)],
                meta_data=None,
            ):
                if not sse_chunk.startswith("data:"):
                    continue
                prompt_content = sse_chunk[len("data: "):].strip()
                if prompt_content == "[DONE]":
                    break
                yield f"event: prompt\ndata: {prompt_content}\n\n"

            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: 出错: {str(e)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/3d-generation/submit", response_model=TaskSubmitResponse)
async def submit_3d_generation_task(
    file: UploadFile = File(...),
    service: Tripo3DService = Depends(LLMFactory.create_tripo_3D_image_to_3D_service)
):
    save_path = await save_upload_file(file) # 假设您已将 save_upload_file 提取
    task_id = await service.submit_task(file_path=save_path)
    return {"task_id": task_id}


@app.get("/3d-generation/tasks/{task_id}")
async def get_3d_generation_task_status(
    task_id: str,
    service: Tripo3DService = Depends(LLMFactory.create_tripo_3D_image_to_3D_service)
):
    status = await service.get_task_status(task_id)
    return status


# ========== Sora 图生图接口 ==========

@app.post("/sora/image-to-image")
async def sora_image_to_image(
    prompt: str,
    file: UploadFile = File(...),
    model: str = "sora_image",
    n: int = 1,
    size: str = "1024x1024",
    strength: float = 0.8,
    is_async: bool = False,
    auth_key: Optional[str] = None,
    service: SoraService = Depends(LLMFactory.create_sora_service)
):
    """
    Sora 图生图接口。
    """
    try:
        # 校验文件类型
        content_type = (file.content_type or "").lower()
        if not content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="仅支持图片文件上传")
        
        # 调用图生图服务
        result = await service.generate_image_from_image(
            prompt=prompt,
            image_file=file,
            model=model,
            n=n,
            size=size,
            strength=strength,
            is_async=is_async,
            auth_key=auth_key
        )
        return result
    except httpx.HTTPStatusError as e:
        logger.error(f"Sora upstream API error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(
            status_code=e.response.status_code, 
            detail=f"Upstream API error: {e.response.text}"
        )
    except Exception as e:
        logger.error(f"Sora image-to-image generation failed: {e}")
        raise HTTPException(
            status_code=500, 
            detail="An internal error occurred during image-to-image generation."
        )

@app.get("/sora/tasks/{task_id}")
async def get_sora_task_status(
    task_id: str,
    # 允许通过查询参数提供 auth_key，以匹配您 service 方法的定义
    auth_key: Optional[str] = None,
    service: SoraService = Depends(LLMFactory.create_sora_service)
):
    """
    查询 Sora 异步任务的状态。
    """
    try:
        # 调用您提供的 SoraService.get_task_status 方法
        status = await service.get_task_status(task_id, auth_key=auth_key)
        return status
    except httpx.HTTPStatusError as e:
        logger.error(f"Sora upstream API error while fetching task: {e.response.status_code} - {e.response.text}")
        raise HTTPException(
            status_code=e.response.status_code, 
            detail=f"Upstream API error: {e.response.text}"
        )
    except Exception as e:
        logger.error(f"Failed to get Sora task status for {task_id}: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to retrieve task status."
        )


# 挂载前端静态资源到 /assets 路径
static_dir = Path(__file__).parent.parent / "static" / "dist"
app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

# 主页路由
@app.get("/")
async def serve_home():
    """提供前端主页"""
    logger.info("Home route accessed!")
    frontend_path = Path(__file__).parent.parent / "static" / "dist" / "index.html"
    return FileResponse(frontend_path)

# 特定的前端路由处理
@app.get("/dashboard")
async def serve_dashboard():
    """前端dashboard路由"""
    logger.info("Dashboard route accessed!")
    frontend_path = Path(__file__).parent.parent / "static" / "dist" / "index.html"
    return FileResponse(frontend_path)

@app.get("/projects")
async def serve_projects():
    """前端projects路由"""
    logger.info("Projects route accessed!")
    frontend_path = Path(__file__).parent.parent / "static" / "dist" / "index.html"
    return FileResponse(frontend_path)

@app.get("/login")
async def serve_login():
    """前端login路由"""
    logger.info("Login route accessed!")
    frontend_path = Path(__file__).parent.parent / "static" / "dist" / "index.html"
    return FileResponse(frontend_path)

@app.get("/register")
async def serve_register():
    """前端register路由"""
    logger.info("Register route accessed!")
    frontend_path = Path(__file__).parent.parent / "static" / "dist" / "index.html"
    return FileResponse(frontend_path)

# Catch-all for other static files and unknown routes
@app.get("/{full_path:path}")
async def serve_frontend_routes(full_path: str):
    """处理静态文件和其他路由"""
    logger.info(f"Catch-all route accessed with path: {full_path}")
    
    # 检查是否是静态文件
    static_file_path = Path(__file__).parent.parent / "static" / "dist" / full_path
    if static_file_path.exists() and static_file_path.is_file():
        logger.info(f"Serving static file: {full_path}")
        return FileResponse(static_file_path)
    
    # 否则返回index.html让React Router处理
    logger.info(f"Serving index.html for frontend route: {full_path}")
    frontend_path = Path(__file__).parent.parent / "static" / "dist" / "index.html"
    return FileResponse(frontend_path)
