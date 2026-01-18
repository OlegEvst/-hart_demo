// Скрипт для генерации файла со всеми конфигурациями стилей из server/storage/configs.json
const fs = require('fs');
const path = require('path');

const configsFile = path.join(__dirname, '../server/storage/configs.json');
const outputFile = path.join(__dirname, '../src/data/allChartsConfigs.ts');

console.log('Генерация файла со всеми конфигурациями стилей...');

if (!fs.existsSync(configsFile)) {
  console.error(`❌ Файл не найден: ${configsFile}`);
  process.exit(1);
}

// Читаем configs.json
const configsData = JSON.parse(fs.readFileSync(configsFile, 'utf-8'));

console.log(`Найдено ${Object.keys(configsData).length} конфигураций`);

// Генерируем TypeScript файл
const configsMap = [];

for (const [key, value] of Object.entries(configsData)) {
  if (value && value.config) {
    configsMap.push(`  '${key}': ${JSON.stringify(value, null, 2)},`);
  }
}

const output = `// Автоматически сгенерированный файл со всеми конфигурациями стилей
// НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ! Используйте: node scripts/generateAllChartConfigs.cjs
// Источник: server/storage/configs.json

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
console.log(`   Конфигураций: ${configsMap.length}`);
