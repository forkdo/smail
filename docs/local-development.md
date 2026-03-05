# 本地开发调试指南

本文档说明如何在本地环境中调试和测试Smail临时邮箱服务的邮件功能。

## 🚀 快速开始

### 1. 启动开发服务器

```bash
pnpm dev
```

这将启动两个服务：
- **前端页面**: http://localhost:5173/
- **Email Worker**: http://localhost:8787/ (用于接收邮件)

### 2. 设置数据库

如果这是第一次运行，需要创建数据库表：

```bash
# 生成迁移文件（如果schema有变化）
pnpm run db:generate

# 应用迁移到本地数据库
pnpm run db:migrate
```

### 3. 发送测试邮件

#### 方法一：使用npm脚本（推荐）

```bash
# 发送默认测试邮件
pnpm run test:email

# 发送自定义测试邮件
pnpm run test:email:custom [收件人] [发件人] [端口]

# 例如：
pnpm run test:email:custom test@yourdomain.com sender@example.com 8787
```

#### 方法二：直接运行脚本

```bash
# 使用默认参数
node scripts/test-email.js

# 自定义参数
node scripts/test-email.js [收件人] [发件人] [端口]
```

#### 方法三：使用curl命令

```bash
curl --request POST 'http://localhost:8787/cdn-cgi/handler/email' \
  --url-query 'from=sender@example.com' \
  --url-query 'to=test@yourdomain.com' \
  --header 'Content-Type: application/json' \
  --data-raw 'Received: from smtp.example.com (127.0.0.1)
        by cloudflare-email.com (unknown) id 4fwwffRXOpyR
        for <test@yourdomain.com>; Wed, 04 Jun 2025 15:50:20 +0000
From: "测试发件人" <sender@example.com>
Reply-To: sender@example.com
To: test@yourdomain.com
Subject: 本地开发测试邮件
Content-Type: text/html; charset="utf-8"
X-Mailer: Local Test
Date: Wed, 04 Jun 2025 08:49:44 -0700
Message-ID: <123456789@test.local>

<h1>测试邮件</h1>
<p>这是一封测试邮件。</p>'
```

## 📧 测试流程

1. **发送邮件**: 使用上述任一方法发送测试邮件
2. **查看日志**: 检查终端中的开发服务器日志，确认邮件已接收和处理
3. **查看界面**: 打开 http://localhost:5173/ 查看邮件是否出现在收件箱中
4. **验证功能**: 点击邮件查看详细内容，测试所有功能

## 🔧 配置说明

### wrangler.jsonc 配置

```jsonc
{
  "send_email": [
    {
      "name": "EMAIL"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "smail-database",
      "migrations_dir": "./app/db/migrations"
    }
  ]
}
```

### 重要的环境变量

确保以下环境变量已正确配置（在 `.dev.vars` 文件中）：

```bash
# D1数据库相关
DB_NAME=smail-database

# R2存储相关（如果使用附件功能）
R2_BUCKET=smail-attachments
```

## 🐛 故障排除

### 常见问题

#### 1. "no such table: mailboxes" 错误

**原因**: 数据库表还没有创建

**解决方案**:
```bash
pnpm run db:migrate
```

#### 2. 邮件发送失败

**检查项**:
- 开发服务器是否正在运行
- 端口是否正确（默认8787）
- wrangler.jsonc中是否有send_email配置

#### 3. 邮件接收后没有出现在界面中

**检查项**:
- 查看开发服务器日志是否有错误
- 确认邮件处理器是否正确存储到数据库
- 检查前端是否正确查询数据库

#### 4. 数据库连接错误

**解决方案**:
```bash
# 重置数据库（谨慎操作，会删除所有数据）
pnpm run db:reset

# 重新应用迁移
pnpm run db:migrate
```

### 调试技巧

1. **查看数据库内容**:
```bash
pnpm wrangler d1 execute smail-database --command="SELECT * FROM mailboxes;"
pnpm wrangler d1 execute smail-database --command="SELECT * FROM emails;"
```

2. **清空测试数据**:
```bash
pnpm wrangler d1 execute smail-database --command="DELETE FROM emails; DELETE FROM mailboxes;"
```

3. **查看完整的邮件处理日志**:
在worker代码中添加更多的console.log语句来跟踪邮件处理流程。

## 📝 开发工作流

### 典型的开发流程

1. **启动服务**:
```bash
pnpm dev
```

2. **修改代码** (邮件处理逻辑、前端界面等)

3. **测试变更**:
```bash
pnpm run test:email
```

4. **检查结果** (界面、数据库、日志)

5. **重复 2-4 步骤**

### 批量测试

如果需要测试多个邮件场景，可以创建一个批量测试脚本：

```bash
# 测试不同类型的邮件
pnpm run test:email:custom test1@yourdomain.com sender1@example.com
pnpm run test:email:custom test2@yourdomain.com sender2@example.com
pnpm run test:email:custom test3@yourdomain.com sender3@example.com
```

## 🚀 部署前测试

在部署到生产环境之前，建议进行完整的本地测试：

1. **功能测试**: 所有邮件处理功能
2. **界面测试**: 前端显示和交互
3. **性能测试**: 大量邮件的处理能力
4. **错误处理**: 各种异常情况的处理

---

如有问题，请查看开发服务器的控制台输出或提交issue。 