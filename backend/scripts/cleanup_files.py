#!/usr/bin/env python3
"""
文件清理脚本
用于定期清理uploads目录中的过期文件
"""
import sys
import os
from pathlib import Path

# 添加项目根目录到 PYTHONPATH
ROOT_DIR = Path(__file__).parent.parent
sys.path.append(str(ROOT_DIR))

from app.utils.file_utils import cleanup_old_files, get_uploads_stats
from app.core.logger import get_logger

logger = get_logger(service="file_cleanup")

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="清理uploads目录中的过期文件")
    parser.add_argument("--days", type=int, default=30, help="保留天数，默认30天")
    parser.add_argument("--stats", action="store_true", help="只显示统计信息，不执行清理")
    parser.add_argument("--dry-run", action="store_true", help="模拟运行，不实际删除文件")
    
    args = parser.parse_args()
    
    logger.info("=" * 50)
    logger.info("文件清理工具")
    logger.info("=" * 50)
    
    # 显示当前统计信息
    stats = get_uploads_stats()
    logger.info(f"当前文件统计:")
    logger.info(f"  总文件数: {stats['total_files']}")
    logger.info(f"  总大小: {stats['total_size']} 字节")
    logger.info(f"  最旧文件: {stats['oldest_file']}")
    logger.info(f"  最新文件: {stats['newest_file']}")
    
    if args.stats:
        logger.info("只显示统计信息，退出")
        return 0
    
    if args.dry_run:
        logger.info(f"模拟运行: 将清理 {args.days} 天前的文件")
        # 这里可以实现dry-run逻辑
        return 0
    
    # 执行清理
    logger.info(f"开始清理 {args.days} 天前的文件...")
    result = cleanup_old_files(args.days)
    
    logger.info("清理结果:")
    logger.info(f"  删除文件数: {result['deleted']}")
    logger.info(f"  释放空间: {result['total_size']} 字节")
    
    if result['errors']:
        logger.warning(f"  错误数量: {len(result['errors'])}")
        for error in result['errors']:
            logger.warning(f"    {error}")
    
    logger.info("清理完成！")
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
