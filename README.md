# Графики - Универсальная система визуализации данных

Веб-приложение для отображения и управления графиками с админ-панелью для настройки.

## Технологии

- **React 19.2.0** - UI библиотека
- **TypeScript** - типизированный JavaScript
- **Vite 7.2.4** - сборщик и dev-сервер
- **React Router DOM 7.9.6** - маррутизация
- **React Google Charts 5.2.1** - библиотека для графиков
- **Node.js + Express** - серверная часть API

## Структура проекта

```
charts-demo/
├── src/                    # Исходный код фронтенда
│   ├── components/         # React компоненты
│   ├── utils/             # Утилиты (API, конфигурация)
│   └── ...
├── server/                 # Серверная часть
│   ├── server.js          # Express сервер
│   ├── storage/           # Хранилище конфигураций
│   └── ...
├── deploy/                 # Папка для деплоя
│   ├── admin/             # Собранный фронтенд (админка)
│   └── server/            # Серверные файлы
├── dist/                   # Собранный фронтенд (создается при build)
├── package.json            # Зависимости фронтенда
├── server/package.json     # Зависимости сервера
├── .env.example            # Пример переменных окружения
└── deploy.sh               # Скрипт деплоя
```

## Установка и запуск

### 1. Установка зависимостей

```bash
# Установка зависимостей фронтенда
npm install

# Установка зависимостей сервера
cd server
npm install
cd ..
```

### 2. Настройка переменных окружения

Скопируйте `.env.example` в `.env` и настройте:

```bash
cp .env.example .env
```

Отредактируйте `.env`:
- `PORT` - порт сервера (по умолчанию 3001)
- `VITE_API_URL` - URL API (оставьте пустым для production)
- `VITE_ADMIN_BASE_PATH` - базовый путь админки (по умолчанию `/admin`)

### 3. Разработка

Запуск dev-сервера фронтенда:
```bash
npm run dev
```

Запуск сервера (в отдельном терминале):
```bash
cd server
npm run dev
```

Приложение будет доступно:
- Фронтенд: `http://localhost:5173`
- Админка: `http://localhost:5173/admin/graph_builder`
- API: `http://localhost:3001`

### 4. Сборка для production

```bash
npm run build
```

Собранные файлы будут в папке `dist/`.

## Развертывание

### Быстрый деплой

Используйте скрипт `deploy.sh`:

```bash
./deploy.sh
```

Это создаст готовые файлы в папке `deploy/`.

### Деплой на сервер

```bash
./deploy.sh user@server:/path/to/app
```

### Ручной деплой

1. Соберите проект: `npm run build`
2. Скопируйте `dist/*` в `deploy/admin/`
3. Скопируйте `server/*` в `deploy/server/`
4. Загрузите содержимое `deploy/` на сервер

### Настройка сервера

#### Node.js сервер

Запустите сервер:
```bash
cd deploy/server
npm install
npm start
```

Или используйте PM2:
```bash
pm2 start server.js --name charts-api
```

#### Nginx конфигурация (пример)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Админка
    location /admin {
        alias /path/to/app/admin;
        try_files $uri $uri/ /admin/index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Основное приложение
    location / {
        root /path/to/app;
        try_files $uri $uri/ /index.html;
    }
}
```

## API Endpoints

- `GET /api/charts/list` - список всех графиков
- `GET /api/charts/:chartId/data` - данные графика
- `GET /api/charts/:chartId/config/:resolution` - конфигурация графика
- `POST /api/charts/:chartId/config/:resolution` - сохранение конфигурации
- `GET /api/charts/:chartId/history/:resolution` - история изменений
- `GET /api/charts/:chartId/status` - статус графика
- `POST /api/charts/:chartId/status` - обновление статуса

## Скрипты

- `npm run dev` - запуск dev-сервера
- `npm run build` - сборка проекта
- `npm run preview` - предпросмотр production сборки
- `npm run lint` - проверка кода линтером
- `./deploy.sh` - деплой проекта

## Лицензия

Проект для внутреннего использования.
