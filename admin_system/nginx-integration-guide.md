# FORMU 管理系统 Nginx 集成指南

## 方法一：添加到现有nginx配置

如果你已经有nginx在80端口运行主系统，只需要添加以下配置到现有的server块中：

```nginx
# 在现有的 server { } 块中添加
location /api/admin/ {
    proxy_pass http://127.0.0.1:8001/api/admin/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 方法二：完整的nginx配置示例

```nginx
server {
    listen 80;
    server_name 106.52.180.239;
    
    # 主系统API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 管理系统API (重写规则，避免冲突)
    location /api/admin/ {
        proxy_pass http://127.0.0.1:8001/api/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 主系统前端
    location / {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 配置步骤

1. **编辑nginx配置**
   ```bash
   sudo vim /etc/nginx/sites-available/formu
   ```

2. **添加管理系统代理配置**（参考上面的配置）

3. **测试配置**
   ```bash
   sudo nginx -t
   ```

4. **重载nginx**
   ```bash
   sudo systemctl reload nginx
   ```

5. **确保管理系统服务运行**
   ```bash
   cd /var/www/FORMU_FORMAL/admin_system
   python app.py
   ```

## 测试

配置完成后，管理系统API应该可以通过以下地址访问：
- `http://106.52.180.239/api/admin/users`
- `http://106.52.180.239/api/admin/assign-user-type`

前端页面也应该能正常工作了！
