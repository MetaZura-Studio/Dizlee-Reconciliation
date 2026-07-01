# Local MySQL Setup

Each developer runs their **own** local MySQL instance. No Docker required. Databases are not shared between developers.

## macOS (Homebrew)

### 1. Install MySQL 8

```bash
brew install mysql@8.0
brew services start mysql@8.0
```

Add MySQL to your PATH if needed:

```bash
echo 'export PATH="/opt/homebrew/opt/mysql@8.0/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 2. Secure and configure

If this is a fresh install, set a root password:

```bash
mysql_secure_installation
```

### 3. Create the development database

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dizlee_dev;"
```

### 4. Configure environment

```bash
cp .env.example .env.local
cp .env.example .env
```

Edit both files and set your `DATABASE_URL`. Prisma CLI reads `.env`; Next.js reads `.env.local`.

If your password contains special characters, URL-encode them (e.g. `@` becomes `%40`):

```
DATABASE_URL="mysql://root:your%40password@localhost:3306/dizlee_dev"
```

### 5. Run migrations

```bash
npm install
npx prisma migrate dev
```

### 6. Start the dev server

```bash
npm run dev
```

Admin portal on a separate port:

```bash
npm run dev:admin
```

## Windows

1. Download and install [MySQL Community Server 8.0](https://dev.mysql.com/downloads/mysql/)
2. Create database: `CREATE DATABASE dizlee_dev;`
3. Follow steps 4–6 above

## Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install mysql-server
sudo mysql -e "CREATE DATABASE dizlee_dev;"
```

Then follow steps 4–6 above.

## Keeping schema in sync

When you pull changes from `develop` that include new Prisma migrations:

```bash
npx prisma migrate dev
```

Schema changes travel through **git** (`prisma/migrations/`). Your local test data stays on your machine.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Can't connect to MySQL server` | Ensure MySQL is running: `brew services list` |
| `Access denied for user 'root'` | Check password in `.env.local`, URL-encode special chars |
| `Database dizlee_dev does not exist` | Run `CREATE DATABASE dizlee_dev;` |
| Port 3306 in use | Check what's using it: `lsof -i :3306` |
