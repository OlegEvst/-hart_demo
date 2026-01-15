# Сервис генерации графиков из Excel

Отдельный сервис для автоматической генерации графиков из Excel файлов.

## Установка

```bash
npm install
```

## Запуск

```bash
npm start
```

Сервис будет доступен на `http://localhost:3001`

## Использование

1. Откройте в браузере: `http://localhost:3001`
2. Загрузите Excel файл
3. Выберите объект из списка
4. Настройте параметры графика
5. Нажмите "Создать график"

## API Endpoints

### POST /api/upload-excel
Загрузка и анализ Excel файла

**Request:**
- `file`: Excel файл (multipart/form-data)

**Response:**
```json
{
  "success": true,
  "plants": [
    { "name": "ТЭЦ-11", "startRow": 10 }
  ],
  "years": [2025, 2026, 2027, ...]
}
```

### POST /api/generate-chart
Генерация графика из Excel

**Request:**
- `file`: Excel файл (multipart/form-data)
- `config`: JSON строка с конфигурацией:
```json
{
  "chartId": "balancelos_new",
  "chartName": "ЛОС - Баланс",
  "plantName": "ЛОС",
  "dataType": "balance",
  "part": 1,
  "colors": {
    "primary": "#FF9500",
    "secondary": "#34C759"
  },
  "years": [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]
}
```

**Response:**
```json
{
  "success": true,
  "chartId": "balancelos_new",
  "dataFile": "balancelos_new.ts",
  "componentFile": "BalancelosNewChart.tsx"
}
```

## Структура

- `server.js` - основной сервер
- `frontend/index.html` - веб-интерфейс конструктора
- `generateComponentTemplate.js` - шаблоны для генерации компонентов

## Настройка на хостинге

См. `../SERVER_SETUP.md` для подробной инструкции по настройке на хостинге.

