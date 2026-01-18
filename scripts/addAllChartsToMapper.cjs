// Скрипт для добавления всех графиков из Excel в ChartDataMapper
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const mapperFile = path.join(__dirname, '../src/components/ChartDataMapper.ts');
const teploExcelFile = path.join(__dirname, '../../Тепло_для_графика_26_35.xlsx');
const electricExcelFile = path.join(__dirname, '../../Электро_для_графика_26_35.xlsx');
const dataDir = path.join(__dirname, '../src/data');

console.log('Добавление всех графиков в ChartDataMapper...\n');

// Читаем существующие chartId
const mapperContent = fs.readFileSync(mapperFile, 'utf-8');
const existingChartIds = new Set();
const pattern = /id:\s*['"]([^'"]+)['"]/g;
let match;
while ((match = pattern.exec(mapperContent)) !== null) {
  existingChartIds.add(match[1]);
}

console.log(`Найдено существующих графиков: ${existingChartIds.size}\n`);

// Функции для преобразования названий (копируем из generateAllChartsFromExcel.cjs)
function nameToChartIdTeplo(name) {
  if (!name) return null;
  let id = name.toString().trim().toLowerCase();
  
  const translit = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    ' ': '_', '-': '_', '.': '', ',': '', '(': '', ')': '', '"': '', "'": '',
    '/': '_', '\\': '_', ':': '_', '№': ''
  };
  
  id = id.split('').map(char => {
    if (translit[char]) return translit[char];
    if (char.match(/[a-z0-9]/)) return char;
    return '_';
  }).join('');
  id = id.replace(/_+/g, '_').replace(/^_|_$/g, '');
  
  if (!id.startsWith('teplo')) {
    id = 'teplo' + id.replace(/^(ait|kotelnaya|novaya_kotelnaya|mk|gtes|ges|rts)/, '');
    if (!id.startsWith('teplo')) {
      id = 'teplo' + id;
    }
  }
  
  return id;
}

function nameToChartIdElectric(name) {
  if (!name) return null;
  let id = name.toString().trim().toLowerCase();
  
  const translit = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    ' ': '_', '-': '_', '.': '', ',': '', '(': '', ')': '', '"': '', "'": ''
  };
  
  id = id.split('').map(char => translit[char] || char).join('');
  id = id.replace(/_+/g, '_').replace(/^_|_$/g, '');
  id = id.replace(/^ps_/, '');
  
  if (!id.startsWith('electric')) {
    id = 'electricps_' + id;
  }
  id = id.replace(/electricps_ps_/g, 'electricps_');
  
  return id;
}

function createExportName(name, prefix) {
  if (!name) return null;
  let exportName = name.toString().trim();
  exportName = exportName.replace(/\s+/g, '_');
  return prefix + exportName.replace(/[^а-яА-ЯёЁ0-9_]/g, '') + 'Data';
}

const newEntries = [];

// Обрабатываем тепло
if (fs.existsSync(teploExcelFile)) {
  const workbook = XLSX.readFile(teploExcelFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  console.log('=== ОБРАБОТКА ТЕПЛА ===');
  console.log(`Найдено ${data.length} строк в Excel\n`);
  
  data.forEach((row) => {
    const name = row.ObjectName;
    if (!name) return;
    
    const chartId = nameToChartIdTeplo(name);
    if (!chartId || existingChartIds.has(chartId)) return;
    
    // Проверяем, существует ли файл данных
    const dataFile = path.join(dataDir, `${chartId}.ts`);
    if (!fs.existsSync(dataFile)) {
      console.log(`⚠️  Файл данных не найден: ${chartId}.ts`);
      return;
    }
    
    // Читаем файл данных, чтобы получить имя экспорта
    const dataContent = fs.readFileSync(dataFile, 'utf-8');
    const exportMatch = dataContent.match(/export const (\w+Data)\s*=/);
    const exportName = exportMatch ? exportMatch[1] : createExportName(name, 'teplo');
    
    // Создаем запись для ChartDataMapper
    const displayName = name + ' - Тепло';
    const entry = `  { id: '${chartId}', name: '${displayName.replace(/'/g, "\\'")}', path: '/${chartId}', dataType: 'reserve', dataLoader: createDataLoader('${chartId}', '${exportName}'), dataKey: '${exportName}' }`;
    
    newEntries.push({ entry, chartId, type: 'teplo' });
    existingChartIds.add(chartId);
  });
  
  console.log(`✅ Найдено новых тепловых графиков: ${newEntries.filter(e => e.type === 'teplo').length}\n`);
}

// Обрабатываем электричество
if (fs.existsSync(electricExcelFile)) {
  const workbook = XLSX.readFile(electricExcelFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  console.log('=== ОБРАБОТКА ЭЛЕКТРИЧЕСТВА ===');
  console.log(`Найдено ${data.length} строк в Excel\n`);
  
  data.forEach((row) => {
    const name = row.name;
    if (!name) return;
    
    const chartId = nameToChartIdElectric(name);
    if (!chartId || existingChartIds.has(chartId)) return;
    
    // Проверяем, существует ли файл данных
    const dataFile = path.join(dataDir, `${chartId}.ts`);
    if (!fs.existsSync(dataFile)) {
      console.log(`⚠️  Файл данных не найден: ${chartId}.ts`);
      return;
    }
    
    // Читаем файл данных, чтобы получить имя экспорта
    const dataContent = fs.readFileSync(dataFile, 'utf-8');
    const exportMatch = dataContent.match(/export const (\w+Data)\s*=/);
    const exportName = exportMatch ? exportMatch[1] : createExportName(name, 'electricПс_');
    
    // Создаем запись для ChartDataMapper
    const displayName = name + ' - Электричество';
    const entry = `  { id: '${chartId}', name: '${displayName.replace(/'/g, "\\'")}', path: '/${chartId}', dataType: 'reserve', dataLoader: createDataLoader('${chartId}', '${exportName}'), dataKey: '${exportName}' }`;
    
    newEntries.push({ entry, chartId, type: 'electric' });
    existingChartIds.add(chartId);
  });
  
  console.log(`✅ Найдено новых электрических графиков: ${newEntries.filter(e => e.type === 'electric').length}\n`);
}

if (newEntries.length === 0) {
  console.log('✅ Все графики уже добавлены в ChartDataMapper');
  process.exit(0);
}

// Добавляем записи в ChartDataMapper перед закрывающей скобкой
const lastBracketIndex = mapperContent.lastIndexOf('];');
if (lastBracketIndex === -1) {
  console.error('❌ Не найдена закрывающая скобка в ChartDataMapper.ts');
  process.exit(1);
}

const beforeBracket = mapperContent.substring(0, lastBracketIndex);
const afterBracket = mapperContent.substring(lastBracketIndex);

// Добавляем запятую перед новыми записями, если нужно
const needsComma = !beforeBracket.trim().endsWith(',');
const newEntriesText = newEntries.map(e => e.entry).join(',\n');

const updatedContent = beforeBracket + (needsComma ? ',\n' : '\n') + newEntriesText + '\n' + afterBracket;

fs.writeFileSync(mapperFile, updatedContent, 'utf-8');

console.log(`\n✅ Добавлено ${newEntries.length} новых графиков в ChartDataMapper.ts`);
console.log(`   Тепло: ${newEntries.filter(e => e.type === 'teplo').length}`);
console.log(`   Электричество: ${newEntries.filter(e => e.type === 'electric').length}`);
console.log('\nТеперь нужно:');
console.log('1. Обновить allChartsData.ts (запустить generateAllDataImports.cjs)');
console.log('2. Убедиться, что все графики имеют данные с 2026 по 2035');
