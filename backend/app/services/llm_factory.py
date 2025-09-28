from typing import Union
import sys 
from pathlib import Path

current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.append(str(project_root))

from app.core.config import settings, ServiceType
from app.services.picture_analysis_service import PictureAnalysisService
from app.services.tripo_service import Tripo3DService
from app.services.sora_service import SoraService
from app.services.styles_prompt_services import (
    AmericanComicStylePromptGenerationService,
    CuteStylePromptGenerationService,
    CyberpunkStylePromptGenerationService,
    GothicStylePromptGenerationService,
    JapaneseComicStylePromptGenerationService,
    ProfessionStylePromptGenerationService,
    RealisticStylePromptGenerationService,
    SteampunkStylePromptGenerationService,
)

class LLMFactory:
    @staticmethod
    def create_picture_analysis_service():
        """创建图片分析服务"""
        return PictureAnalysisService()

    @staticmethod
    def create_cute_style_prompt_generation_service():
        """创建可爱风格提示生成服务"""
        return CuteStylePromptGenerationService()

    @staticmethod
    def create_american_comic_style_prompt_generation_service():
        """创建美国漫画风格提示生成服务"""
        return AmericanComicStylePromptGenerationService()

    @staticmethod
    def create_japanese_comic_style_prompt_generation_service():
        """创建日本漫画风格提示生成服务"""
        return JapaneseComicStylePromptGenerationService()

    @staticmethod
    def create_cyberpunk_style_prompt_generation_service():
        """创建赛博朋克风格提示生成服务"""
        return CyberpunkStylePromptGenerationService()

    @staticmethod
    def create_gothic_style_prompt_generation_service():
        """创建哥特风格提示生成服务"""
        return GothicStylePromptGenerationService()

    @staticmethod
    def create_profession_style_prompt_generation_service():
        """创建职业风格提示生成服务"""
        return ProfessionStylePromptGenerationService()

    @staticmethod
    def create_realistic_style_prompt_generation_service():
        """创建真实风格提示生成服务"""
        return RealisticStylePromptGenerationService()

    @staticmethod
    def create_steampunk_style_prompt_generation_service():
        """创建蒸汽朋克风格提示生成服务"""
        return SteampunkStylePromptGenerationService()

    @staticmethod
    def create_tripo_3D_image_to_3D_service():
        """图片到3D模型生成服务"""
        return Tripo3DService()
    
    @staticmethod
    def create_sora_service():
        '''Sora 服务'''
        return SoraService()










