# Flex Application - Production Ubuntu Deployment Guide (Without Docker)

This guide provides step-by-step instructions for deploying the **Flex** full-stack application on an **Ubuntu server** without Docker, using production-grade infrastructure tools.

---

## 🏗️ Architecture Overview

The system consists of three main layers:

| Layer | Technology | Infrastructure / Manager |
| :--- | :--- | :--- |
| **Backend API** | CodeIgniter 4 (PHP 8.2) | **Nginx** + **PHP-FPM** FastCGI (`/run/php/php8.2-fpm.sock`) |
| **Frontend UI** | Next.js (Node.js 20) | **PM2 Process Manager** listening on port `3000` |
| **Database** | MySQL / MariaDB | Local or managed MySQL server listening on port `3306` |
| **Reverse Proxy / SSL** | Nginx & Certbot | Handles HTTPS requests, SSL termination, and proxies |

---

## 1. System Requirements & Package Installation

Connect to your Ubuntu server via SSH and execute the following commands:

### 1.1 Update Package Indexes
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Core Utilities & Nginx
```bash
sudo apt install -y nginx git curl unzip software-properties-common
```

### 1.3 Install PHP 8.2 & Required Extensions
CodeIgniter 4 requires PHP 8.1+ along with extensions for database access, internationalization, image processing, and cURL:

```bash
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.2-fpm php8.2-cli php8.2-mysql php8.2-intl php8.2-curl php8.2-gd php8.2-mbstring php8.2-zip php8.2-xml
```

Verify PHP-FPM status:
```bash
sudo systemctl status php8.2-fpm
```

### 1.4 Install Composer
```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

### 1.5 Install MariaDB Database Server
```bash
sudo apt install -y mariadb-server
sudo mysql_secure_installation
```

### 1.6 Install Node.js (v20 LTS) & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

---

## 2. Database Configuration & Data Seeding

1. Log into the MySQL interactive shell:
   ```bash
   sudo mysql -u root -p
   ```

2. Create the application database and user:
   ```sql
   CREATE DATABASE flex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'flexuser'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';
   GRANT ALL PRIVILEGES ON flex.* TO 'flexuser'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. Import application SQL database dumps:
   ```bash
   mysql -u flexuser -p flex < /var/www/flex/flex_local_dump.sql
   mysql -u flexuser -p flex < /var/www/flex/seed_all_599_app_messages.sql
   ```

---

## 3. CodeIgniter 4 Backend Setup

### 3.1 Directory Structure & Location
Place the project repository in `/var/www/flex`:

```bash
sudo mkdir -p /var/www/flex
sudo chown -R $USER:$USER /var/www/flex
# Clone or copy your application files into /var/www/flex
```

### 3.2 Production Environment Configuration
Create and edit the `.env` file in the root directory:

```bash
cd /var/www/flex
cp .env .env.production
nano .env
```

Configure the following essential settings:
```ini
CI_ENVIRONMENT = production

# Application Base URL (Domain or IP where backend is served)
app.baseURL = 'https://api.yourdomain.com'

# Database Connection Credentials
database.default.hostname = 127.0.0.1
database.default.database = flex
database.default.username = flexuser
database.default.password = YOUR_SECURE_PASSWORD
database.default.DBDriver = MySQLi
database.default.port = 3306
```

### 3.3 Install Composer Dependencies
```bash
composer install --no-dev --optimize-autoloader
```

### 3.4 File Permissions
Assign file ownership to `www-data` (the Nginx/PHP-FPM process user) and grant write permissions to the CodeIgniter `writable/` folder:

```bash
sudo chown -R www-data:www-data /var/www/flex
sudo chmod -R 775 /var/www/flex/writable
```

---

## 4. Next.js Frontend Setup

### 4.1 Environment Configuration
Navigate to the frontend directory and configure production environment variables:

```bash
cd /var/www/flex/frontend
nano .env.local
```

Add your backend API endpoints:
```ini
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_SIDEBAR_ATTR_TYPES=picklist,text
```

### 4.2 Build Frontend Application
```bash
npm install
npm run build
```

### 4.3 Start & Persist Next.js using PM2
Start the Next.js production server with PM2:

```bash
pm2 start npm --name "flex-frontend" -- start
```

Configure PM2 to persist processes across server reboots:
```bash
pm2 save
pm2 startup
```
*(Run the `sudo env PATH=...` command printed in the terminal by `pm2 startup`)*.

---

## 5. Nginx & PHP-FPM Configuration

> [!IMPORTANT]
> For security, the Nginx web root **must** point to `/var/www/flex/public`, NOT the project root. This ensures `.env`, `app/`, and `writable/` files are hidden from direct public web access.

### 5.1 Create Nginx Site File
```bash
sudo nano /etc/nginx/sites-available/flex
```

### 5.2 Nginx Configuration (Separate Subdomains Example)
Replace `yourdomain.com` and `api.yourdomain.com` with your actual domains:

```nginx
# ─────────────────────────────────────────────────────────────
# 1. FRONTEND: Next.js Proxy (yourdomain.com)
# ─────────────────────────────────────────────────────────────
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ─────────────────────────────────────────────────────────────
# 2. BACKEND: CodeIgniter 4 PHP-FPM (api.yourdomain.com)
# ─────────────────────────────────────────────────────────────
server {
    listen 80;
    server_name api.yourdomain.com;

    root /var/www/flex/public;
    index index.php index.html;

    charset utf-8;

    # Rewrite all requests to CodeIgniter front controller
    location / {
        try_files $uri $uri/ /index.php$is_args$args;
    }

    # Pass PHP scripts to PHP-FPM socket
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Block access to hidden files (.env, .git)
    location ~ /\. {
        deny all;
    }

    client_max_body_size 20M;

    access_log /var/log/nginx/flex_backend_access.log;
    error_log  /var/log/nginx/flex_backend_error.log;
}
```

### 5.3 Enable Site & Verify Configuration
```bash
sudo ln -s /etc/nginx/sites-available/flex /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. SSL Security (Certbot / Let's Encrypt)

Secure all domains with free HTTPS SSL certificates:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

Certbot automatically configures SSL certificates and HTTP-to-HTTPS redirects in Nginx.

---

## 7. Managing Background Workers & PM2 Ecosystem (Optional)

If your CodeIgniter app requires background workers (e.g. queue workers), you can manage them in an `ecosystem.config.js` file:

```javascript
module.exports = {
  apps: [
    // Next.js Frontend
    {
      name: "flex-frontend",
      cwd: "/var/www/flex/frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production"
      }
    },
    // Optional Background Queue Worker
    {
      name: "flex-queue-worker",
      cwd: "/var/www/flex",
      script: "spark",
      interpreter: "php",
      args: "queue:work",
      autorestart: true,
      max_memory_restart: "500M"
    }
  ]
};
```

Run ecosystem config:
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## 🛠️ Operational & Troubleshooting Commands

| Action | Command |
| :--- | :--- |
| **Check PM2 status** | `pm2 status` |
| **View PM2 logs** | `pm2 logs` |
| **Restart Nginx** | `sudo systemctl restart nginx` |
| **Restart PHP-FPM** | `sudo systemctl restart php8.2-fpm` |
| **Check Nginx error log** | `sudo tail -f /var/log/nginx/error.log` |
| **Check CI4 writable log** | `tail -f /var/www/flex/writable/logs/log-*.log` |
