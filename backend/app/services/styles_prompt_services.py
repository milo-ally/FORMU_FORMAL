import uuid
import sys
import asyncio
import uuid  # 添加这行导入
from pathlib import Path
from typing import List, Dict, Optional, AsyncGenerator
from cozepy import AsyncCoze, TokenAuth, Message, ChatEventType, MessageObjectString

current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.append(str(project_root))

from app.core.config import settings

class PromptGenerationService:
    """提示词生成服务基类"""
    
    def __init__(self, bot_id):
        self.base_url = settings.COZE_BASE_URL
        self.authorization = settings.COZE_AUTHORIZATION
        self.bot_id = bot_id
        self.user_id = uuid.uuid4().hex
        # 使用异步Coze客户端替代同步客户端
        self.coze = AsyncCoze(
            auth=TokenAuth(token=self.authorization), 
            base_url=self.base_url
        )
    
    async def generate_stream(
        self, 
        objects: List[MessageObjectString], 
        meta_data: Optional[Dict[str, str]] = None
    ) -> AsyncGenerator[str, None]:
        try:
            user_message = Message.build_user_question_objects(
                objects=objects, 
                meta_data=meta_data
            )
            
            # 直接调用异步stream方法，使用async for遍历
            async for event in self.coze.chat.stream(
                bot_id=self.bot_id,
                user_id=self.user_id,
                additional_messages=[user_message],
            ):
                if event.event == ChatEventType.CONVERSATION_MESSAGE_DELTA:
                    # 按照SSE规范格式化数据，过滤掉空内容
                    if event.message.content.strip():
                        yield f"data: {event.message.content}\n\n"
                elif event.event == ChatEventType.CONVERSATION_CHAT_COMPLETED:
                    print(f"Token使用量: {event.chat.usage.token_count}")
                    # 发送结束消息
                    yield "data: [DONE]\n\n"
                    break
                elif event.event == ChatEventType.ERROR:
                    raise Exception(f"Coze API错误: {event.error}")
                    
        except Exception as e:
            raise RuntimeError(f"调用Coze服务失败: {str(e)}")

# 一些继承PromptGenerationService的子类， 实现不同的风格提示词生成服务
class CuteStylePromptGenerationService(PromptGenerationService):
    '''异步的可爱提示词生成服务类'''
    
    def __init__(self):
        super().__init__(settings.CUTE_STYLE_PROMPT_GENERATION_BOT_ID)

class SteampunkStylePromptGenerationService(PromptGenerationService):
    '''异步的蒸汽朋克提示词生成服务类'''
    
    def __init__(self):
        super().__init__(settings.STEAMPUNK_STYLE_PROMPT_GENERATION_BOT_ID)

class JapaneseComicStylePromptGenerationService(PromptGenerationService):
    '''异步的日漫风格提示词服务类'''
    
    def __init__(self):
        super().__init__(settings.JAPANESE_COMIC_STYLE_PROMPT_GENERATION_BOT_ID)

class AmericanComicStylePromptGenerationService(PromptGenerationService):
    '''异步的美漫风格提示词服务类'''
    
    def __init__(self):
        super().__init__(settings.AMERICAN_COMIC_STYLE_PROMPT_GENERATION_BOT_ID)

class ProfessionStylePromptGenerationService(PromptGenerationService):
    '''异步的职业风格提示词服务类'''
    
    def __init__(self):
        super().__init__(settings.PROFESSION_STYLE_PROMPT_GENERATION_BOT_ID)

class CyberpunkStylePromptGenerationService(PromptGenerationService):
    '''异步的赛博朋克风格提示词服务类'''
    
    def __init__(self):
        super().__init__(settings.CYBERPUNK_STYLE_PROMPT_GENERATION_BOT_ID)

class GothicStylePromptGenerationService(PromptGenerationService):
    '''异步的哥特风提示词服务类'''
    
    def __init__(self):
        super().__init__(settings.GOTHIC_STYLE_PROMPT_GENERATION_BOT_ID)

class RealisticStylePromptGenerationService(PromptGenerationService):
    '''异步的逼真风格提示词服务类'''
    
    def __init__(self):
        super().__init__(settings.REALISTIC_STYLE_PROMPT_GENERATION_BOT_ID)