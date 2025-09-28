import json
from pathlib import Path
from typing import Dict, Any
import sys
import httpx
from pydantic import BaseModel, HttpUrl

# --- 项目路径设置 ---
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.append(str(project_root))

from app.core.config import settings
from app.core.logger import get_logger

# --- 服务配置与模型定义 ---
logger = get_logger(__name__)
UPLOAD_URL = "https://api.tripo3d.ai/v2/openapi/upload/sts"
TASK_URL = "https://api.tripo3d.ai/v2/openapi/task"
TASK_STATUS_URL = "https://api.tripo3d.ai/v2/openapi/task/{task_id}"

class Model3DResult(BaseModel):
    """用于规范化3D模型成功结果的 Pydantic 模型"""
    model_url: HttpUrl
    preview_url: HttpUrl

# ==============================================================================
#  底层 API 客户端 (内部使用)
# ==============================================================================
class _TripoAPIClient:
    """
    底层客户端，只负责与Tripo3D API进行直接的、单一的异步交互。
    相当于厨房里的“专家厨师”。
    """
    def __init__(self):
        self._api_key = settings.TRIPO_API_KEY
        self._headers = {"Authorization": f"Bearer {self._api_key}"}
        self._client = httpx.AsyncClient(headers=self._headers, timeout=60.0)

    async def close(self):
        await self._client.aclose()

    async def upload_image(self, file_path: Path) -> str:
        """上传图片文件以获取image_token。"""
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(file_path, "rb") as f:
            files = {"file": (file_path.name, f)}
            response = await self._client.post(UPLOAD_URL, files=files)
        
        response.raise_for_status()
        data = response.json()
        image_token = data.get("data", {}).get("image_token")
        if not image_token:
            raise KeyError(f"API response missing 'image_token': {data}")
        logger.info(f"File uploaded successfully! Image Token: {image_token[:10]}...")
        return image_token

    async def create_task(self, image_token: str) -> str:
        """使用image_token创建模型生成任务。"""
        payload = {"type": "image_to_model", "file": {"type": "png", "file_token": image_token}}
        response = await self._client.post(TASK_URL, json=payload)
        response.raise_for_status()
        data = response.json()
        task_id = data.get("data", {}).get("task_id")
        if not task_id:
            raise KeyError(f"API response missing 'task_id': {data}")
        logger.info(f"Task created successfully! Task ID: {task_id}")
        return task_id

    async def check_status(self, task_id: str) -> Dict[str, Any]:
        """通过HTTP GET请求检查任务的当前状态。"""
        url = TASK_STATUS_URL.format(task_id=task_id)
        response = await self._client.get(url)
        response.raise_for_status()
        return response.json()

# ==============================================================================
#  高层业务服务 (外部调用)
# ==============================================================================
class Tripo3DService:
    """
    高层业务服务，负责编排和调度底层客户端来完成一个完整的业务流程。
    相当于餐厅的“行政总厨”。您的其他代码应该只和这个类交互。
    """
    def __init__(self):
        self._api_client = _TripoAPIClient()

    async def submit_task(self, file_path: Path) -> str:
        """
        提交3D生成任务并返回 task_id。
        这是一个快速操作，编排了“上传”和“创建”两个步骤。
        """
        logger.info(f"Submitting 3D task for file: {file_path}")
        image_token = await self._api_client.upload_image(file_path)
        task_id = await self._api_client.create_task(image_token)
        return task_id

    async def get_task_status(self, task_id: str) -> dict:
        """
        查询3D任务的状态，并在成功时附加最终结果的URL。
        """
        logger.info(f"Getting status for 3D task: {task_id}")
        task_data = await self._api_client.check_status(task_id)

        # 统一数据结构，将最终结果也附加到成功状态的响应中
        if task_data.get("data", {}).get("status") == "success":
            result = task_data.get("data", {}).get("result", {})
            task_data["model_url"] = result.get("pbr_model", {}).get("url")
            task_data["preview_url"] = result.get("rendered_image", {}).get("url")
            
        return task_data
    
    async def close(self):
        """确保底层客户端被关闭。"""
        await self._api_client.close()