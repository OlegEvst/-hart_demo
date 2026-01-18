// Скрипт для генерации файла со всеми импортами данных
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../src/data');
const outputFile = path.join(__dirname, '../src/data/allChartsData.ts');
const mapperPath = path.join(__dirname, '../src/components/ChartDataMapper.ts');

console.log('Генерация файла со всеми импортами данных...');

// Читаем все файлы данных
const dataFiles = fs.readdirSync(dataDir)
  .filter(f => f.endsWith('.ts') && !f.includes('allChartsData') && !f.includes('mapping'))
  .map(f => f.replace('.ts', ''));

console.log(`Найдено ${dataFiles.length} файлов данных`);

// Читаем ChartDataMapper
const mapperContent = fs.readFileSync(mapperPath, 'utf-8');

// Извлекаем chartId и dataKey
const entries = [];
const entryPattern = /{\s*id:\s*['"]([^'"]+)['"][^}]*dataKey:\s*['"]([^'"]*)['"]/gs;
let match;

while ((match = entryPattern.exec(mapperContent)) !== null) {
  const chartId = match[1];
  const dataKey = match[2] || '';
  entries.push({ chartId, dataKey });
}

console.log(`Найдено ${entries.length} записей в ChartDataMapper`);

// Создаем маппинг chartId -> { fileName, dataKey, exportedName }
const mapping = [];
for (const entry of entries) {
  if (dataFiles.includes(entry.chartId)) {
    // Читаем файл, чтобы найти экспорт
    const filePath = path.join(dataDir, entry.chartId + '.ts');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const exportMatch = fileContent.match(/export\s+const\s+(\w+)\s*=/);
    const exportedName = exportMatch ? exportMatch[1] : entry.dataKey;
    
    mapping.push({
      chartId: entry.chartId,
      fileName: entry.chartId,
      dataKey: entry.dataKey || exportedName,
      exportedName: exportedName
    });
  }
}

console.log(`Создано ${mapping.length} маппингов`);

// Генерируем импорты
const imports = [];
const dataMap = [];

for (const item of mapping) {
  // Импортируем весь модуль
  const moduleName = item.chartId.replace(/[^a-zA-Z0-9]/g, '_') + 'Module';
  imports.push(`import * as ${moduleName} from './${item.fileName}';`);
  
  // Добавляем в маппинг
  dataMap.push(`  '${item.chartId}': ${moduleName},`);
}

const output = `// Автоматически сгенерированный файл со всеми импортами данных
// НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ! Используйте: node scripts/generateAllDataImports.cjs

${imports.join('\n')}

// Маппинг chartId -> модуль данных
export const allChartsDataModules: Record<string, any> = {
${dataMap.join('\n')}
};

// Функция для получения данных по chartId и dataKey
export function getChartData(chartId: string, dataKey?: string): any[] | null {
  const module = allChartsDataModules[chartId];
  if (!module) {
    console.error(\`[AllData] Модуль не найден для chartId: \${chartId}\`);
    return null;
  }
  
  // Если указан dataKey, ищем по нему
  if (dataKey && module[dataKey]) {
    return module[dataKey];
  }
  
  // Ищем первый массив в модуле
  const keys = Object.keys(module);
  for (const key of keys) {
    const value = module[key];
    if (Array.isArray(value) && value.length > 0) {
      const firstItem = value[0];
      if (firstItem && typeof firstItem === 'object' && ('year' in firstItem || 'value' in firstItem || 'reserve' in firstItem)) {
        return value;
      }
    }
  }
  
  return null;
}
`;

fs.writeFileSync(outputFile, output, 'utf-8');
console.log(`✅ Файл создан: ${outputFile}`);
console.log(`   Импортировано: ${imports.length} модулей`);
