# Nginx 配置指南

## 方案一：路径代理（推荐）

将管理员系统挂载到主域名的 `/admin-system` 路径下。

### 1. 编辑你的nginx配置文件

通常位置：
- Ubuntu/Debian: `/etc/nginx/sites-available/your-site`
- CentOS/RHEL: `/etc/nginx/conf.d/your-site.conf`

### 2. 在你的主server块中添加：

```nginx
# 在你现有的 server { } 块中添加这个 location
location /admin-system {
    rewrite ^/admin-system/?(.*) /$1 break;
    proxy_pass http://127.0.0.1:8001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### 3. 测试和重载nginx

```bash
# 测试配置
sudo nginx -t

# 重载nginx
sudo systemctl reload nginx
```

### 4. 访问管理员系统

- 地址：`http://yourdomain.com/admin-system`
- 管理员账号：`Lihan`
- 管理员密码：`Lihan13230118`

---

## 方案二：子域名（可选）

如果你想用子域名访问，如 `admin.yourdomain.com`：

### 1. 添加新的server块：

```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 2. 配置DNS

在你的域名管理面板中添加A记录：
- 主机名：`admin`
- 值：你的服务器IP

---

## 启动顺序

1. **启动管理员系统**：
   ```bash
   cd admin_system
   python app.py
   ```

2. **重载nginx配置**：
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **访问测试**：
   - 主系统：`http://yourdomain.com`
   - 管理员系统：`http://yourdomain.com/admin-system`

## 注意事项

- 管理员系统必须在端口8001上运行
- 确保防火墙允许8001端口的本地访问（不需要公网访问）
- 如果使用HTTPS，需要相应调整proxy_set_header配置
