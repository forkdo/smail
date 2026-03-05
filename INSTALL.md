# 教程

本项目使用 [just](https://just.systems/man/en/nodejs-installation.html)、[pnpm](https://pnpm.io/installation) 作为管理工具。

## 快速部署

### 初始化
```bash
just init
```

### 配置环境变量
编辑 `.dev.vars` 文件：
```bash
SESSION_SECRET=your_generated_secret_here
DOMAIN=yourdomain.com
```

### 部署至 CloudFlare
```bash
just deploy
```

### 部署至 CloudFlare 预览环境
```bash
just preview
```

## 本地开发

### 安装依赖
```bash
just install
```

### 启动开发服务器
```bash
just dev
```

### 运行测试邮件
```bash
just test
```

查看开发服务器的信息：
```bash
✅ [DEV] Email stored successfully with ID: <EMAIL_ID>
```

打开浏览器，访问 URL：
```bash
http://localhost:5173/mail/<EMAIL_ID>
```

## 生产环境部署

### 1. 创建资源
```bash
# 创建 D1 数据库
just create-d1

# 创建 R2 对象存储
just create-r2

# 创建密钥
just create-secret
```

### 2. 配置域名
```bash
# 更新域名配置
just domain domain="yourdomain.com"
```

### 3. 设置环境变量
```bash
# 设置 Session 密钥
echo "your_secret" | pnpm wrangler secret put SESSION_SECRET

# 设置域名（在 wrangler.jsonc 中配置）
# "vars": {
#   "DOMAIN": "yourdomain.com"
# }
```

### 4. 部署
```bash
just deploy
```

## 域名设置

### 绑定域名（可选）
**Build** → **Compute** → **Workers & Pages** → **smail-app** → **Settings** → **Domains & Routes** → **Add** → **Custom domain**

### 设置 Email Routing
1. 进入 **Email Routing** → **Onboard Domain**
2. 选择域名（需与配置的 DOMAIN 一致）
3. 添加 DNS 记录并启用
4. 配置 **Routing Rules** → **Catch-all address**
5. Action 选择 `Send to a Worker`
6. Destination 选择 `smail-app`
7. 保存并将 Status 切换至 `Active`

发送邮件至页面创建的临时邮箱，查看是否收到邮件。

## 更多命令

查看所有可用命令：
```bash
just -l
```

### 常用命令
```bash
# 基础命令
just build                  # 构建项目
just dev                    # 启动开发服务器
just deploy                 # 部署到生产环境
just preview                # 部署预览版本
just clean                  # 清理构建产物
just destroy                # 销毁所有资源

# 数据库命令
just create-d1              # 创建 D1 数据库
just delete-d1              # 删除 D1 数据库
just db-migrate             # 运行数据库迁移

# R2 命令
just create-r2              # 创建 R2 存储桶
just delete-r2              # 删除 R2 存储桶

# 密钥命令
just create-secret          # 创建 Session 密钥
just delete-secret          # 删除 Session 密钥

# 其他命令
just domain domain="xxx"    # 更新域名配置
just test                   # 运行测试邮件
```

## 环境变量说明

### 开发环境 (.dev.vars)
```bash
SESSION_SECRET=your_secret_here    # Session 加密密钥
DOMAIN=yourdomain.com              # 邮箱域名
```

### 生产环境
- `SESSION_SECRET`: 使用 `wrangler secret put` 设置
- `DOMAIN`: 在 `wrangler.jsonc` 的 `vars` 中配置

## 故障排查

### 邮件无法接收
1. 检查 Email Routing 配置是否正确
2. 确认域名 DNS MX 记录已添加
3. 查看 Worker 日志：`pnpm wrangler tail`

### 数据库错误
```bash
# 检查数据库状态
pnpm wrangler d1 execute smail-database --command "SELECT * FROM mailboxes LIMIT 1"

# 重新运行迁移
pnpm run db:migrate:remote
```

### 构建失败
```bash
# 清理并重新构建
just clean
pnpm install
just build
```
