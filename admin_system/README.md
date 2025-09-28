# FORMU 管理员系统

独立的用户类型分配和管理系统

## 功能特性

- 管理员登录验证
- 用户类型分配（创始人、时间掌控者、星火合伙人）
- 用户列表查看
- 实时数据库连接

## 安装和运行

1. 安装依赖：
```bash
pip install -r requirements.txt
```

2. 确保数据库配置正确：
   - 数据库：formu
   - 用户：root
   - 密码：123456
   - 端口：3306

3. 运行系统：
```bash
python app.py
```

4. 访问系统：
   - 地址：http://localhost:8001
   - 管理员账号：Lihan
   - 管理员密码：Lihan13230118

## API接口

- `POST /api/admin/login` - 管理员登录
- `POST /api/admin/assign-user-type` - 分配用户类型
- `GET /api/admin/users` - 获取用户列表

## 用户类型

- `founder` - 创始人
- `time_master` - 时间掌控者  
- `spark_partner` - 星火合伙人

## Nginx 配置

如果你的项目运行在nginx下，需要添加代理配置。详见 `nginx-setup.md`

快速配置：在你的nginx server块中添加：
```nginx
location /admin-system {
    rewrite ^/admin-system/?(.*) /$1 break;
    proxy_pass http://127.0.0.1:8001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

然后访问：`http://yourdomain.com/admin-system`

## 注意事项

- 系统运行在端口 8001，避免与主系统冲突
- 直接连接主系统数据库，无需额外配置
- 管理员密码硬编码，生产环境需要改进安全性
- 需要nginx代理配置才能通过公网访问
