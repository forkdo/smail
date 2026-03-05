# 域名配置说明

本项目使用占位符域名 `yourdomain.com`，部署时需要替换为你的实际域名。

## 快速替换

使用 justfile 命令一键替换所有域名：

```bash
just domain domain="your-actual-domain.com"
```

## 手动替换

如果需要手动替换，请在以下文件中查找并替换 `yourdomain.com`：

- `app/root.tsx`
- `app/routes/home.tsx`
- `app/routes/contact.tsx`
- `app/routes/privacy.tsx`
- `app/routes/terms.tsx`
- `scripts/test-email.sh`
- `docs/local-development.md`

## 配置 Email Routing

替换域名后，需要在 Cloudflare 配置 Email Routing：

1. 登录 Cloudflare Dashboard
2. 选择你的域名
3. 进入 Email > Email Routing
4. 添加路由规则：`*@your-actual-domain.com` -> 你的 Worker

## 注意事项

- 确保域名已添加到 Cloudflare
- 确保 DNS 记录正确配置
- Email Routing 需要域名验证通过
