# Логика загрузки и формирования графика

## Шаг 1: Загрузка страницы
- URL: `/teplo_strogino`
- `useParams()` извлекает `chartId = "teplo_strogino"`
- `useWindowSize()` определяет размер окна (width, height)

## Шаг 2: Нормализация chartId для стилей
- `normalizeChartId("teplo_strogino")` вызывается
- Проверка: `elektrops` → `electricps` (не применяется для teplo_strogino)
- Проверка `urlToChartIdMap` (не применяется для teplo_strogino)
- Результат: `normalizedChartIdForStyles = "teplo_strogino"`

## Шаг 3: Загрузка конфигурации стилей
- `useSavedChartConfig("teplo_strogino", width, height)` вызывается
- Определение разрешения на основе width:
  - width > 500 → `resolution = "900x250"`
  - width 340-350 → `resolution = "344x193"`
  - width 260-285 → `resolution = "276x155"`
  - иначе → `resolution = "276x155"` (по умолчанию)

## Шаг 4: Загрузка конфигурации из API/configs.json
- `loadChartConfig("teplo_strogino", resolution)` вызывается
- Нормализация: `normalizedChartId = "teplo_strogino"` (после всех проверок)
- Ключ для поиска: `"teplo_strogino_900x250"` (пример для resolution 900x250)

### В development (с сервером):
- Запрос к API: `GET /api/charts/teplo_strogino/config/900x250`
- Сервер читает из памяти: `chartConfigs["teplo_strogino_900x250"]`
- Если не найдено в памяти → читает из файла `server/storage/configs.json`
- Возвращает конфигурацию или `null`

### В production (статичная сборка):
- Проверка: `isStaticBuild = true` (PROD && !API_BASE_URL)
- Сразу запрос к `/configs.json` (без обращения к API)
- Поиск ключа `"teplo_strogino_900x250"` в загруженном JSON
- Возвращает конфигурацию или `null`

## Шаг 5: Обработка результата загрузки конфигурации
- Если конфигурация найдена → используется она
- Если не найдена → используется дефолтная из `getDefaultConfig(resolution, isTeploChart)`
- Фиксируются параметры легенды из дефолтной конфигурации
- Результат сохраняется в `savedConfig` (state)

## Шаг 6: Загрузка данных графика
- `useEffect` в TeploChart запускается
- Нормализация chartId для данных (та же логика)
- Поиск в `chartDataMap` по `normalizedChartId`
- Загрузка данных через `getChartData(normalizedChartId)`
- Данные сохраняются в `chartData` (state)

## Шаг 7: Проверка перед рендерингом (production)
- Если `import.meta.env.PROD && savedConfig === null` → `return null` (не рендерим)
- Это предотвращает мерцание (правильные вычисленные → неправильные из configs.json)

## Шаг 8: Расчет значений для графика
- Извлечение всех значений из данных:
  - Для balance: `total_net` и `load`
  - Для reserve: `value` или `reserve`
- Расчет адаптивной шкалы (но НЕ используется для vAxis)

## Шаг 9: Определение vAxis (КРИТИЧЕСКИ ВАЖНО)
- Проверка: `savedConfig?.vAxisMin !== undefined && savedConfig?.vAxisMax !== undefined`
- Если ДА → используется `savedConfig.vAxisMin` и `savedConfig.vAxisMax` (как в превью)
- Если НЕТ → используется fallback `adaptiveRange.min/max` (но это не должно происходить)

## Шаг 10: Применение стилей
- Все стили берутся из `savedConfig`:
  - `chartAreaLeft`, `chartAreaRight`, `chartAreaTop`, `chartAreaBottom`
  - `baseFontSize`, `axisFontSize`, `legendFontSize`
  - `vAxisMin`, `vAxisMax`, `vAxisGridlinesCount`
  - и т.д.

## Шаг 11: Рендеринг графика
- Создание данных для Google Charts
- Применение всех стилей из `savedConfig`
- Рендеринг компонента `Chart` из `react-google-charts`

## Шаг 12: Применение vAxis в options
- В превью админки: `viewWindow: { min: vAxisMinForRes, max: vAxisMaxForRes }`
- В TeploChart: `viewWindow: { min: vAxisMin, max: vAxisMax }` (исправлено - убран Math.min(0, vAxisMin))

## Проблемные места для проверки:

1. **Нормализация chartId**: Убедиться, что для стилей и данных используется один и тот же `normalizedChartId`
2. **Загрузка конфигурации**: Проверить, что ключ в `configs.json` совпадает с тем, что ищется
3. **vAxis значения**: Убедиться, что `savedConfig.vAxisMin/vAxisMax` не `undefined`
4. **Production проверка**: Убедиться, что в production график не рендерится до загрузки конфигурации
5. **viewWindow.min**: Использовать `vAxisMin` напрямую, без `Math.min(0, vAxisMin)` (как в превью)
