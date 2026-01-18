// Скрипт для генерации файла со всеми конфигурациями стилей
// из server/storage/configs.json с учетом statuses.json
const fs = require('fs');
const path = require('path');

const configsFile = path.join(__dirname, '../server/storage/configs.json');
const statusesFile = path.join(__dirname, '../server/storage/statuses.json');
const historyFile = path.join(__dirname, '../server/storage/history.json');
const outputFile = path.join(__dirname, '../src/data/allChartsConfigs.ts');

console.log('Генерация файла со всеми конфигурациями стилей...');

if (!fs.existsSync(configsFile)) {
  console.error(`❌ Файл не найден: ${configsFile}`);
  process.exit(1);
}

// Читаем configs.json (полные конфигурации)
const configsData = JSON.parse(fs.readFileSync(configsFile, 'utf-8'));

// Читаем statuses.json (статусы графиков)
let statusesData = {};
if (fs.existsSync(statusesFile)) {
  statusesData = JSON.parse(fs.readFileSync(statusesFile, 'utf-8'));
  console.log(`Найдено ${Object.keys(statusesData).length} статусов`);
}

// Читаем history.json (история изменений)
let historyData = [];
if (fs.existsSync(historyFile)) {
  historyData = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
  console.log(`Найдено ${historyData.length} записей в истории`);
}

console.log(`Найдено ${Object.keys(configsData).length} конфигураций в configs.json`);

// Генерируем TypeScript файл
const configsMap = [];
let includedCount = 0;
let skippedCount = 0;

// Применяем все конфигурации из configs.json
for (const [key, value] of Object.entries(configsData)) {
  if (value && value.config) {
    // Извлекаем chartId из ключа (формат: chartId_resolution)
    const parts = key.split('_');
    // Находим последний элемент, который должен быть resolution (например, 900x250)
    let chartId = '';
    let resolution = '';
    
    // Ищем resolution в конце (формат: числоxчисло)
    const resolutionMatch = key.match(/(\d+x\d+)$/);
    if (resolutionMatch) {
      resolution = resolutionMatch[1];
      chartId = key.substring(0, key.length - resolution.length - 1); // Убираем _resolution
    } else {
      // Если не нашли, используем весь ключ как chartId
      chartId = key;
    }
    
    // Проверяем статус (если есть)
    const status = statusesData[chartId];
    
    // Включаем все конфигурации (можно фильтровать по статусу, если нужно)
    // if (status === 'ready_for_publication' || !status) {
    configsMap.push(`  '${key}': ${JSON.stringify(value, null, 2)},`);
    includedCount++;
    // } else {
    //   skippedCount++;
    // }
  }
}

const output = `// Автоматически сгенерированный файл со всеми конфигурациями стилей
// НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ! Используйте: node scripts/generateAllChartConfigsFromHistory.cjs
// Источник: server/storage/configs.json, statuses.json, history.json

export interface SavedChartConfig {
  chartId: string;
  resolution: '276x155' | '344x193' | '900x250' | '564x116';
  config: any;
  savedAt: string;
}

// Маппинг chartId_resolution -> конфигурация
export const allChartsConfigs: Record<string, SavedChartConfig> = {
${configsMap.join('\n')}
};

// Функция для получения конфигурации по chartId и resolution
export function getChartConfig(chartId: string, resolution: '276x155' | '344x193' | '900x250' | '564x116'): SavedChartConfig | null {
  const key = \`\${chartId}_\${resolution}\`;
  return allChartsConfigs[key] || null;
}
`;

fs.writeFileSync(outputFile, output, 'utf-8');
console.log(`✅ Файл создан: ${outputFile}`);
console.log(`   Включено конфигураций: ${includedCount}`);
if (skippedCount > 0) {
  console.log(`   Пропущено конфигураций: ${skippedCount}`);
}
