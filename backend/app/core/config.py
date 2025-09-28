from pydantic_settings import BaseSettings
from enum import Enum
from pathlib import Path
import json
import os

# 获取项目根目录
ROOT_DIR = Path(__file__).parent.parent.parent
ENV_FILE = ROOT_DIR / ".env"
RUNTIME_CONFIG_FILE = ROOT_DIR / "runtime_config.json"

class ServiceType(str, Enum):
	COZE="coze"
     

class Settings(BaseSettings):
	
	# COZE BASE_URL 
	COZE_BASE_URL: str = ""
	COZE_AUTHORIZATION: str = ""

	# 图片特征分析
	PICTURE_ANALYSIS_BOT_ID: str = ""

	# 可爱风格
	CUTE_STYLE_PROMPT_GENERATION_BOT_ID: str = ""

	# 蒸汽朋克风格
	STEAMPUNK_STYLE_PROMPT_GENERATION_BOT_ID: str = ""
	
	# 日漫风格
	JAPANESE_COMIC_STYLE_PROMPT_GENERATION_BOT_ID: str = ""

	# 美漫风格
	AMERICAN_COMIC_STYLE_PROMPT_GENERATION_BOT_ID: str = ""

	# 职业风格
	PROFESSION_STYLE_PROMPT_GENERATION_BOT_ID: str = ""

	# 赛博朋克风格 
	CYBERPUNK_STYLE_PROMPT_GENERATION_BOT_ID: str = ""

	# 哥特风格
	GOTHIC_STYLE_PROMPT_GENERATION_BOT_ID: str = ""

	# 写实风格
	REALISTIC_STYLE_PROMPT_GENERATION_BOT_ID: str = ""

	# 存储用户信息用的mysql
    # Database settings
	DB_HOST: str = "localhost"
	DB_PORT: int = 3306
	DB_USER: str = "root"
	DB_PASSWORD: str = "milo_2357"
	DB_NAME: str = "FORMU"

	# Tripo
	TRIPO_API_KEY: str = ""

	# Sora 
	SORA_BASE_URL: str = ""
	SORA_API_KEY: str = ""

	# JWT settings
	SECRET_KEY: str = "your secret key"
	ALGORITHM: str = "HS256"
	ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

	def __init__(self, **kwargs):
		super().__init__(**kwargs)
		self._load_runtime_config()

	def _load_runtime_config(self):
		"""加载运行时配置"""
		if RUNTIME_CONFIG_FILE.exists():
			try:
				with open(RUNTIME_CONFIG_FILE, 'r', encoding='utf-8') as f:
					runtime_config = json.load(f)
				
				# 更新COZE配置
				if 'coze' in runtime_config:
					coze_config = runtime_config['coze']
					self.COZE_BASE_URL = coze_config.get('baseUrl', self.COZE_BASE_URL)
					self.COZE_AUTHORIZATION = coze_config.get('authorization', self.COZE_AUTHORIZATION)
				
				# 更新Bot配置
				if 'bots' in runtime_config:
					bots_config = runtime_config['bots']
					self.PICTURE_ANALYSIS_BOT_ID = bots_config.get('pictureAnalysis', self.PICTURE_ANALYSIS_BOT_ID)
					self.CUTE_STYLE_PROMPT_GENERATION_BOT_ID = bots_config.get('cuteStyle', self.CUTE_STYLE_PROMPT_GENERATION_BOT_ID)
					self.STEAMPUNK_STYLE_PROMPT_GENERATION_BOT_ID = bots_config.get('steampunkStyle', self.STEAMPUNK_STYLE_PROMPT_GENERATION_BOT_ID)
					self.JAPANESE_COMIC_STYLE_PROMPT_GENERATION_BOT_ID = bots_config.get('japaneseComicStyle', self.JAPANESE_COMIC_STYLE_PROMPT_GENERATION_BOT_ID)
					self.AMERICAN_COMIC_STYLE_PROMPT_GENERATION_BOT_ID = bots_config.get('americanComicStyle', self.AMERICAN_COMIC_STYLE_PROMPT_GENERATION_BOT_ID)
					self.PROFESSION_STYLE_PROMPT_GENERATION_BOT_ID = bots_config.get('professionStyle', self.PROFESSION_STYLE_PROMPT_GENERATION_BOT_ID)
					self.CYBERPUNK_STYLE_PROMPT_GENERATION_BOT_ID = bots_config.get('cyberpunkStyle', self.CYBERPUNK_STYLE_PROMPT_GENERATION_BOT_ID)
					self.GOTHIC_STYLE_PROMPT_GENERATION_BOT_ID = bots_config.get('gothicStyle', self.GOTHIC_STYLE_PROMPT_GENERATION_BOT_ID)
					self.REALISTIC_STYLE_PROMPT_GENERATION_BOT_ID = bots_config.get('realisticStyle', self.REALISTIC_STYLE_PROMPT_GENERATION_BOT_ID)
				
				# 更新Tripo配置
				if 'tripo' in runtime_config:
					tripo_config = runtime_config['tripo']
					self.TRIPO_API_KEY = tripo_config.get('apiKey', self.TRIPO_API_KEY)
				
				# 更新Sora配置
				if 'sora' in runtime_config:
					sora_config = runtime_config['sora']
					self.SORA_API_KEY = sora_config.get('apiKey', self.SORA_API_KEY)
					self.SORA_BASE_URL = sora_config.get('baseUrl', self.SORA_BASE_URL)
					
			except Exception as e:
				print(f"加载运行时配置失败: {e}")

	@property
	def DATABASE_URL(self) -> str:
		return f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"


	class Config:
		env_file = str(ENV_FILE)
		env_file_encoding = "utf-8"
		case_sensitive = True 

settings = Settings() 