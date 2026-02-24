# 教程

本项目使用 [just](https://just.systems/man/en/nodejs-installation.html)、[pnpm](https://pnpm.io/installation) 作为管理工具。

## 快速部署
- 初始化
```bash
just init
```

- 部署至 CloudFlare
```bash
just deploy
```

- 部署至 CloudFlare 预览环境
```bash
just preview
```

## 安装教程

### 安装依赖
```bash
just install
```

### 本地测试
- 启动开发服务器
```bash
just dev
```

- 运行测试邮件
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

### 部署至生产环境

```bash
# 安装依赖
just install

# 创建 D1 数据库
just create-d1

# 创建 KV 缓存
just create-kv

# 创建 R2 对象存储
just create-r2

# 创建密钥
just create-secret
```

```bash
# 部署至 CloudFlare
just deploy
```

## 域名设置

### 绑定域名（可选）
**Build** -> **Compute** -> **Workers & Pages** -> ***（smail-app）** -> **Settings** -> **Domains & Routes** -> **Add** -> **Custom domain**：
```bash
https://dash.cloudflare.com/<ACCOUNT_ID>/workers/services/view/smail-app/production/settings
```

### 设置域名 DNS MX

> Build / Compute / Email Service / Email Routing / Onboard Domain / Select Zone（**选择域名，此域名需跟部署时输入的域名（`Enter the new domain`）一致**）/ Add records and Enable / **点击进入此服务的设置** / Routing Rules / Catch-all address / Catch All（Edit） / Create custom address（**Action 选择 `Send to a Worker`，Destination 选择 `smail-app`**）/ Save -> Status 点击后，从 `Disabled` 切换至 `Active`。

发送邮件至页面创建的临时邮箱，查看是否收到邮件。


## 更多帮助
```bash
just -l
```

```bash
Available recipes:
    build                                       # 构建项目
    clean                                       # 清理构建产物
    db-migrate                                  # 运行数据库迁移
    deploy                                      # 部署至 Cloudflare Workers
    destroy                                     # 销毁所有资源
    dev                                         # 启动开发服务器
    domain domain=""                            # 更新域名
    init                                        # 初始化
    install                                     # 安装依赖库
    preview                                     # 部署至 Cloudflare Workers 预览环境
    test to="test@smail.pw" from="sender@example.com" port="5173" attachment="" # 运行测试邮件

    [d1]
    create-d1 preview="" db="smail-database"    # 创建 D1 数据库
    delete-d1 db="smail-database"               # 删除 D1 数据库

    [kv]
    create-kv kv="smail-kv"                     # 创建 KV 命名空间
    delete-kv kv="smail-kv"                     # 删除 KV 命名空间

    [pages]
    home action="hide"                          # 用法: just home [hide|show]
    layout action="hide"                        # 用法: just layout [hide|show]

    [r2]
    create-r2 preview="" r2="smail-attachments" # 创建 R2 命名空间
    delete-r2 r2="smail-attachments"            # 删除 R2 命名空间

    [secret]
    create-secret                               # 创建 secret
    delete-secret                               # 删除 secret
```