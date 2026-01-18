# Обновление на сервере

## Шаг 1: Найти проект
```bash
# Ищем папку с проектом
find / -name "charts-demo" -type d 2>/dev/null
# или
ls -la /root/
ls -la /var/www/
ls -la /home/
```

## Шаг 2: Обновить проект (2-3 команды)

```bash
# Перейти в папку проекта (замените путь на ваш)
cd /path/to/charts-demo

# 1. Обновить код из git
git pull

# 2. Пересобрать проект (если были изменения в коде)
npm run build

# 3. Перезапустить сервер (если используется PM2)
pm2 restart charts-demo
# или если запущен напрямую:
cd server && npm start
```

## Минимальная версия (одна строка)

```bash
cd /path/to/charts-demo && git pull && npm run build && pm2 restart charts-api
```

## Решение конфликта при обновлении (если есть локальные изменения)

Если git pull выдает ошибку о локальных изменениях в `server/storage/*`:

```bash
# Вариант 1: Сохранить локальные изменения и обновить (рекомендуется)
cd /var/www/chart-demo
git stash
git pull
npm run build
pm2 restart charts-api

# Вариант 2: Заменить локальные файлы на версию из git (если локальные не важны)
cd /var/www/chart-demo
git checkout -- server/storage/*.json
git pull
npm run build
pm2 restart charts-api
```

## Проверка статуса PM2

```bash
pm2 list          # Список процессов
pm2 logs          # Логи
pm2 status        # Статус
```
