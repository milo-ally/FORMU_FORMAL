import os
import sys
import uvicorn
from pathlib import Path

# 先设置正确的工作目录
def set_up_environment():
    # 获取当前文件路径
    current_file = Path(__file__).resolve()
    # 获取backend目录路径
    backend_dir = current_file.parent.parent
    # 切换到backend目录
    os.chdir(backend_dir)
    # 将backend目录添加到Python路径
    if str(backend_dir) not in sys.path:
        sys.path.append(str(backend_dir))
    
    return backend_dir

# 设置环境
backend_dir = set_up_environment()

# 现在可以正确导入app模块中的内容
from app.core.logger import get_logger

logger = get_logger(service="server")

def start_server():
    logger.info("Starting server...")
    logger.info(f"Working directory: {os.getcwd()}")
    
    uvicorn.run(
        "app.main:app",  # 使用完整模块路径
        host="0.0.0.0",
        port=8000,
        access_log=False,
        log_level="error",
        reload=True
    )

if __name__ == "__main__":
    start_server()