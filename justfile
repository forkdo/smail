# 初始化
init:
  @echo "Initializing the project..."
  @just install
  @just create-d1
  @just create-r2
  @just create-secret

# 安装依赖库
install:
  @echo "Installing dependencies..."
  @if [[ ! -f "wrangler.jsonc" ]]; then \
    cp wrangler.example.jsonc wrangler.jsonc; \
    echo "Created wrangler.jsonc from example. Please update it with your Cloudflare account details."; \
  else \
    echo "wrangler.jsonc already exists. Skipping creation."; \
  fi    
  @pnpm install

# 构建项目
build:
  @echo "Building the project..."
  @pnpm run build

# 启动开发服务器
dev:
  @if [[ -f ".dev.vars" ]]; then \
    rm .dev.vars; \
    echo "Removed existing .dev.vars file."; \
  fi
  @if [[ ! -f ".dev.vars" ]]; then \
    cp .dev.vars.example .dev.vars; \
    echo "Created .dev.vars from example. Please update it with your development environment variables."; \
  fi
  @secret=$(openssl rand -base64 32); \
    echo "Generated random secret for development environment: $secret"; \
    sed -i "s#SESSION_SECRET=your.*#SESSION_SECRET=$secret#" .dev.vars
  @echo "Starting development server..."
  @pnpm run db:generate
  @pnpm run db:migrate
  @pnpm dev

# 运行测试邮件
test to="test@example.com" from="sender@example.com" port="5173" attachment="":
  @if [[ -n "{{attachment}}" ]]; then \
    attachment=true; \
  fi; \
  pnpm run test:email:custom "{{to}}" "{{from}}" "{{port}}" "{{attachment}}"
  @echo "查看服务端终端输出以验证邮件是否成功发送。格式如下："
  @echo ""
  @echo "  ✅ [DEV] Email stored successfully with ID: <EMAIL_ID>"
  @echo ""; \
  vist_port={{port}}; \
  if [[ -z "{{port}}" ]]; then \
    vist_port=5173; \
  fi; \
    echo "  访问： http://localhost:${vist_port}/mail/<EMAIL_ID> 来查看邮件内容。"; \
    echo ""
  
# 部署至 Cloudflare Workers
deploy:
  @echo "Deploying to Cloudflare Workers..."
  @just db-migrate
  
  @just build && pnpm wrangler deploy

# 部署至 Cloudflare Workers 预览环境
preview:
  @echo "Previewing deployment on Cloudflare Workers..."
  @just create-d1 preview
  @just create-r2 preview
  @just db-migrate
  @just build && pnpm wrangler versions upload
  @read -p "Do you want to deploy to production environment? (y/n) " deploy_prod; \
  if [[ "$deploy_prod" == "y" ]]; then \
    pnpm wrangler versions deploy; \
    echo "Deployed to production environment."; \
  fi

# 清理构建产物
clean:
  @echo "Cleaning build artifacts..."
  @rm -rf build node_modules

# 销毁所有资源
destroy:
  @echo "Destroying all resources..."
  @just delete-d1
  @just delete-r2
  @worker_name=$(jq -r '.name' wrangler.jsonc); \
    if [[ -n "$worker_name" ]]; then \
      echo "Deleting Cloudflare Worker '$worker_name'..."; \
      echo y | pnpm wrangler delete --name "$worker_name"; \
    else \
      echo "Worker name not found in wrangler.jsonc. Skipping worker deletion."; \
    fi
  @just clean
  @rm -f wrangler.jsonc
  @echo "All resources destroyed and cleaned up."

# 创建 D1 数据库
[group('d1')]
create-d1 preview="" db="smail-database":
  @echo "Creating database..."
  @if [[ -n "{{db}}" ]]; then \
      dbname="{{db}}"; \
    else \
      echo "Database name not provided. Using default 'smail-database'."; \
      dbname="smail-database"; \
    fi; \
    if [[ -n "{{preview}}" ]]; then \
      dbname="$dbname-preview"; \
    fi; \
    touch /tmp/cf.empty; \
    database_id=$(pnpm wrangler d1 list --json | jq -r --arg dbname "$dbname" '.[]|select(.name == $dbname).uuid'); \
    if [[ -n "$database_id" ]]; then \
      echo "Database '$dbname' already exists with ID: $database_id. Skipping creation."; \
    else \
      echo "Database '$dbname' does not exist. Creating..."; \
      database_id=$(pnpm wrangler d1 create $dbname | grep database_id | cut -d'"' -f4); \
    fi; \
    echo "Database created with ID: $database_id"; \
    if [[ -n "{{preview}}" ]]; then \
      echo "Previewing database..."; \
      jq --arg id "$database_id" '.d1_databases[0].preview_database_id = $id' wrangler.jsonc > wrangler.jsonc.tmp; \
    else \
      echo "Producting database..."; \
      jq --arg id "$database_id" '.d1_databases[0].database_id = $id' wrangler.jsonc > wrangler.jsonc.tmp; \
    fi
  @mv wrangler.jsonc.tmp wrangler.jsonc

# 删除 D1 数据库
[group('d1')]
delete-d1 db="smail-database":
  @echo "Deleting database..."
  @touch /tmp/cf.empty; \
    pnpm wrangler d1 delete {{db}} -y -c .empty; \
    pnpm wrangler d1 delete {{db}}-preview -y -c .empty; \
    rm /tmp/cf.empty



# 创建 R2 命名空间
[group('r2')]
create-r2 preview="" r2="smail-attachments":
  @echo "Creating R2 bucket..."
  @if [[ -n "{{r2}}" ]]; then \
    bucket_name="{{r2}}"; \
  else \
    echo "R2 bucket name not provided. Using default 'smail-attachments'."; \
    bucket_name="smail-attachments"; \
  fi; \
  if [[ -n "{{preview}}" ]]; then \
    bucket_name="$bucket_name-preview"; \
  fi; \
  pnpm wrangler r2 bucket create "$bucket_name"; \
    echo "R2 bucket '$bucket_name' created successfully."
    
# 删除 R2 命名空间
[group('r2')]
delete-r2 r2="smail-attachments":
  @echo "Deleting R2 bucket..."
  @pnpm wrangler r2 bucket delete "{{r2}}"; \
    echo "R2 bucket '{{r2}}' deleted successfully."
  @pnpm wrangler r2 bucket delete "{{r2}}-preview"; \
    echo "R2 bucket '{{r2}}-preview' deleted successfully."

# 创建 secret
[group('secret')]
create-secret:
  @echo "Creating secret..."
  @secret=$(openssl rand -base64 32); \
    echo "Generated random secret: $secret"; \
    echo "$secret" | pnpm wrangler secret put SESSION_SECRET

# 删除 secret
[group('secret')]
delete-secret:
  @echo "Deleting secret..."
  @echo yes | pnpm wrangler secret delete SESSION_SECRET

# 运行数据库迁移
db-migrate:
  @echo "Running database migrations..."
  @echo y | pnpm run db:migrate:remote

# 设置或更新域名环境变量
[group('domain')]
set-domain domain:
  @echo "Setting DOMAIN environment variable..."
  @if [[ -z "{{domain}}" ]]; then \
    echo "Error: domain parameter is required"; \
    exit 1; \
  fi
  @echo "Setting DOMAIN to: {{domain}}"
  @if [[ -f ".dev.vars" ]]; then \
    sed -i "s/^DOMAIN=.*/DOMAIN={{domain}}/" .dev.vars; \
    echo "Updated .dev.vars"; \
  fi
  @if [[ -f "wrangler.jsonc" ]]; then \
    if grep -q '"DOMAIN"' wrangler.jsonc; then \
      sed -i "s/\"DOMAIN\": \".*\"/\"DOMAIN\": \"{{domain}}\"/" wrangler.jsonc; \
    else \
      jq --arg domain "{{domain}}" '.vars.DOMAIN = $domain' wrangler.jsonc > wrangler.jsonc.tmp; \
      mv wrangler.jsonc.tmp wrangler.jsonc; \
    fi; \
    echo "Updated wrangler.jsonc"; \
  fi
  @echo "DOMAIN set to {{domain}}"