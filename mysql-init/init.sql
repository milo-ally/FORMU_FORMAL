-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS FORMU CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE FORMU;

-- 删除现有表（如果存在）
DROP TABLE IF EXISTS usage_tasks;
DROP TABLE IF EXISTS user_usage;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

-- 创建用户表（与后端 SQLAlchemy 模型一致）
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) NOT NULL DEFAULT 'spark_partner',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME NULL,
    status VARCHAR(20) DEFAULT 'active'
);

-- 创建项目表（与后端 SQLAlchemy 模型一致）
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    style VARCHAR(50) NOT NULL,
    image_url VARCHAR(500),
    analysis_text TEXT,
    prompt_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 使用次数：按用户累计
CREATE TABLE user_usage (
    user_id INT PRIMARY KEY,
    used_count INT NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 使用次数去重：记录已计次的 task_id（Sora / Tripo）
CREATE TABLE usage_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id VARCHAR(128) NOT NULL,
    service_type VARCHAR(32) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usage_tasks_task_id UNIQUE (task_id),
    CONSTRAINT fk_usage_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_usage_tasks_user_id ON usage_tasks(user_id);

