# Обновление на сервере

## Быстрое обновление (2-3 команды)

```bash
# 1. Обновить код из git
git pull

# 2. Пересобрать проект (если были изменения в коде)
npm run build

# 3. Перезапустить сервер
cd server && npm start
# или если используется PM2:
pm2 restart charts-demo
```

## Минимальная версия (если только данные обновились)

```bash
git pull && cd server && npm start
```

## Если сервер уже запущен (PM2)

```bash
git pull && npm run build && pm2 restart charts-demo
```
