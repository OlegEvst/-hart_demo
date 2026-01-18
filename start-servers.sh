#!/bin/bash

# Скрипт для запуска обоих серверов

echo "🚀 Запуск серверов проекта charts-demo..."
echo ""

# Переходим в директорию проекта
cd "$(dirname "$0")"

# Проверяем зависимости
if [ ! -d "node_modules" ]; then
  echo "📦 Установка зависимостей frontend..."
  npm install
fi

if [ ! -d "server/node_modules" ]; then
  echo "📦 Установка зависимостей backend..."
  cd server
  npm install
  cd ..
fi

echo ""
echo "✅ Зависимости установлены"
echo ""

# Запускаем backend сервер в фоне
echo "🔧 Запуск backend сервера (порт 3001)..."
cd server
npm start > ../server.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
cd ..

# Ждем немного, чтобы backend запустился
sleep 2

# Запускаем frontend сервер
echo "🎨 Запуск frontend сервера (порт 5173)..."
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Серверы запущены!"
echo ""
echo "📍 Адреса:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:3001"
echo "   Админка: http://localhost:3001/admin/graph_builder"
echo ""
echo "Для остановки серверов используйте:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Логи:"
echo "   Backend: tail -f server.log"
echo "   Frontend: tail -f frontend.log"
