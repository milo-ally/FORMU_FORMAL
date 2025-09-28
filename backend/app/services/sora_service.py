import os
import ssl
import httpx
import base64
from datetime import datetime
from typing import Optional, List, Any, Dict
from pathlib import Path
import sys 


current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.append(str(project_root))

from app.core.config import settings


LOG_FILE = 'image_log.txt'

class SoraService:
    def __init__(self):
        self.api_key = settings.SORA_API_KEY
        # 存储并规范化 base_url，去除末尾的斜杠
        self.api_base_url = settings.SORA_BASE_URL.rstrip('/')
        
        ssl_context = ssl.create_default_context()
        ssl_context.set_ciphers('DEFAULT@SECLEVEL=1')
        self._client = httpx.AsyncClient(verify=ssl_context, timeout=300)

    async def close(self):
        await self._client.aclose()

    def _get_effective_auth_key(self, provided_key: Optional[str]) -> str:
        return provided_key if provided_key else self.api_key

    async def _make_api_request(self, api_url: str, auth_key: str, data: Dict[str, Any], files: Optional[Dict] = None, is_async: bool = False) -> Dict:
        headers = {'Authorization': f'{auth_key}'}
        params = {'async': 'true'} if is_async else None
        print(f"\n--- Sending API Request via SoraService ---\nURL: {api_url}\nParams: {params}\nData: {data}\n")
        
        if files:
            response = await self._client.post(api_url, headers=headers, data=data, files=files, params=params)
        else:
            response = await self._client.post(api_url, headers=headers, json=data, params=params)
        
        response.raise_for_status()
        return response.json()

    async def generate_image_from_image(self, 
                                      prompt: str, 
                                      image_file: Any, 
                                      model: str = "sora_image", 
                                      n: int = 1, 
                                      size: str = "1024x1024", 
                                      is_async: bool = False, 
                                      strength: float = 0.8,
                                      auth_key: Optional[str] = None) -> Dict:
        """使用内部的 base_url 构建图片生成图片的请求 URL"""
        effective_auth_key = self._get_effective_auth_key(auth_key)
        # 内部构建完整的 API URL
        full_url = f"{self.api_base_url}/v1/images/edits"  # 或者 "/v1/images/variations"，根据API而定
        
        # 处理图片文件 - 完整的图片处理逻辑
        if hasattr(image_file, 'read'):
            # 如果是文件对象，读取内容并编码为base64
            image_file.seek(0)
            image_data = image_file.read()
            encoded_image = base64.b64encode(image_data).decode('utf-8')
        elif isinstance(image_file, str) and Path(image_file).is_file():
            # 如果是文件路径，读取并编码
            with open(image_file, 'rb') as f:
                image_data = f.read()
                encoded_image = base64.b64encode(image_data).decode('utf-8')
        elif isinstance(image_file, str) and image_file.startswith('data:image'):
            # 如果是base64数据URI，直接提取base64部分
            encoded_image = image_file.split(',')[1]
        else:
            # 假设已经是base64字符串
            encoded_image = image_file

        # 构建payload
        payload = {
            'model': model,
            'prompt': prompt,
            'image': encoded_image,
            'n': n,
            'size': size,
            'strength': strength  # 控制原图保留程度
        }

        result = await self._make_api_request(full_url, effective_auth_key, payload, is_async=is_async)

        if not is_async and result.get('data'):
            self.log_image_id(result.get('id'), prompt)
            await self.save_images_from_data(result['data'], prompt)

        return result

    async def generate_image_variation(self, image_file: Any, model: str = "sora_image", n: int = 1, size: str = "1024x1024", is_async: bool = False, auth_key: Optional[str] = None) -> Dict:
        """生成图片变体（不需要文字提示）"""
        effective_auth_key = self._get_effective_auth_key(auth_key)
        full_url = f"{self.api_base_url}/v1/images/variations"
        
        # 图片处理逻辑
        if hasattr(image_file, 'read'):
            image_file.seek(0)
            image_data = image_file.read()
            encoded_image = base64.b64encode(image_data).decode('utf-8')
        elif isinstance(image_file, str) and Path(image_file).is_file():
            with open(image_file, 'rb') as f:
                image_data = f.read()
                encoded_image = base64.b64encode(image_data).decode('utf-8')
        elif isinstance(image_file, str) and image_file.startswith('data:image'):
            encoded_image = image_file.split(',')[1]
        else:
            encoded_image = image_file

        payload = {
            'model': model,
            'image': encoded_image,
            'n': n,
            'size': size
        }

        result = await self._make_api_request(full_url, effective_auth_key, payload, is_async=is_async)

        if not is_async and result.get('data'):
            self.log_image_id(result.get('id'), "image_variation")
            await self.save_images_from_data(result['data'], "image_variation")

        return result

    async def edit_image(self, prompt: str, image_bytes: bytes, image_filename: str, model: str, n: int, size: str, is_async: bool, auth_key: Optional[str] = None, mask_bytes: Optional[bytes] = None, mask_filename: Optional[str] = None) -> Dict:
        """使用内部的 base_url 构建请求 URL"""
        effective_auth_key = self._get_effective_auth_key(auth_key)
        # 内部构建完整的 API URL
        full_url = f"{self.api_base_url}/v1/images/edits"
        data = {'prompt': prompt, 'model': model, 'size': size, 'n': n}
        files = {'image': (image_filename, image_bytes)}
        if mask_bytes and mask_filename:
            files['mask'] = (mask_filename, mask_bytes)

        result = await self._make_api_request(full_url, effective_auth_key, data, files=files, is_async=is_async)

        if not is_async and result.get('data'):
            self.log_image_id(result.get('id'), prompt)
            await self.save_images_from_data(result['data'], prompt)

        return result

    async def get_task_status(self, task_id: str, auth_key: Optional[str] = None) -> Dict:
        """使用内部的 base_url 构建请求 URL"""
        effective_auth_key = self._get_effective_auth_key(auth_key)
        # 内部构建完整的任务 URL
        task_url = f"{self.api_base_url}/v1/images/tasks/{task_id}"
        headers = {'Authorization': f'Bearer {effective_auth_key}'}
        
        response = await self._client.get(task_url, headers=headers)
        response.raise_for_status()
        return response.json()

    def log_image_id(self, task_id: str, prompt: str):
        """Logs the task ID and prompt to a file."""
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            sanitized_prompt = ' '.join(prompt.split())
            log_entry = f"{timestamp} - ID: {task_id} - Prompt: {sanitized_prompt}\n"
            with open(LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(log_entry)
        except Exception as e:
            print(f"Error writing to log file: {e}")

    async def save_images_from_data(self, data_list: List[Dict[str, Any]], prompt: str):
        """Decodes or downloads and saves images from API response data."""
        output_dir = 'outputs'
        os.makedirs(output_dir, exist_ok=True)
        
        for i, item in enumerate(data_list):
            img_data = None
            if item.get('b64_json'):
                try:
                    img_data = base64.b64decode(item['b64_json'])
                except Exception as e:
                    print(f"Error decoding base64 image: {e}")
                    continue
            elif item.get('url'):
                try:
                    print(f"Downloading image from URL: {item['url']}")
                    # Use the service's client for async download
                    img_response = await self._client.get(item['url'], timeout=60)
                    img_response.raise_for_status()
                    img_data = img_response.content
                except Exception as e:
                    print(f"Error downloading image from URL {item['url']}: {e}")
                    continue

            if img_data:
                try:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    safe_prompt = "".join([c for c in prompt if c.isalnum() or c in (' ', '-')]).rstrip()[:30].replace(' ', '_')
                    filename = f"{timestamp}_{safe_prompt}_{i+1}.png"
                    filepath = os.path.join(output_dir, filename)
                    with open(filepath, 'wb') as f:
                        f.write(img_data)
                    print(f"Image saved to {filepath}")
                except Exception as e:
                    print(f"Error saving image file: {e}")