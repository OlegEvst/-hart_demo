// Скрипт для генерации всех графиков из Excel файлов
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const teploExcelFile = path.join(__dirname, '../../Тепло_для_графика_26_35.xlsx');
const electricExcelFile = path.join(__dirname, '../../Электро_для_графика_26_35.xlsx');
const dataDir = path.join(__dirname, '../src/data');
const mapperFile = path.join(__dirname, '../src/components/ChartDataMapper.ts');

console.log('Генерация всех графиков из Excel файлов...\n');

// Читаем существующие chartId из ChartDataMapper
const mapperContent = fs.readFileSync(mapperFile, 'utf-8');
const existingChartIds = new Set();
const pattern = /id:\s*['"]([^'"]+)['"]/g;
let match;
while ((match = pattern.exec(mapperContent)) !== null) {
  existingChartIds.add(match[1]);
}

console.log(`Найдено существующих графиков: ${existingChartIds.size}\n`);

// Функция для преобразования названия в chartId (для тепла)
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
    '/': '_', '\\': '_', ':': '_', '№': '', '№': ''
  };
  
  // Заменяем все не-латинские и не-цифровые символы на подчеркивание
  id = id.split('').map(char => {
    if (translit[char]) return translit[char];
    if (char.match(/[a-z0-9]/)) return char;
    return '_';
  }).join('');
  id = id.replace(/_+/g, '_').replace(/^_|_$/g, '');
  
  // Добавляем префикс teplo если его нет
  if (!id.startsWith('teplo')) {
    id = 'teplo' + id.replace(/^(ait|kotelnaya|novaya_kotelnaya|mk|gtes|ges|rts)/, '');
    if (!id.startsWith('teplo')) {
      id = 'teplo' + id;
    }
  }
  
  return id;
}

// Функция для преобразования названия в chartId (для электричества)
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

// Функция для создания имени экспорта (кириллица)
function createExportName(name, prefix) {
  if (!name) return null;
  let exportName = name.toString().trim();
  exportName = exportName.replace(/\s+/g, '_');
  return prefix + exportName.replace(/[^а-яА-ЯёЁ0-9_]/g, '') + 'Data';
}

const years = ['2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'];
const newCharts = [];

// Обрабатываем тепло
console.log('=== ОБРАБОТКА ТЕПЛА ===');
if (fs.existsSync(teploExcelFile)) {
  const workbook = XLSX.readFile(teploExcelFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`Найдено ${data.length} строк в Excel\n`);
  
  let created = 0;
  let skipped = 0;
  
  data.forEach((row, index) => {
    const name = row.ObjectName;
    if (!name) {
      skipped++;
      return;
    }
    
    const chartId = nameToChartIdTeplo(name);
    if (!chartId) {
      skipped++;
      return;
    }
    
    // Пропускаем, если уже существует
    if (existingChartIds.has(chartId)) {
      return;
    }
    
    // Создаем данные для графика (всегда с 2026 по 2035)
    const chartData = [];
    years.forEach(year => {
      const value = row[year];
      chartData.push({
        year: year,
        reserve: (value !== undefined && value !== null && value !== '') 
          ? (typeof value === 'number' ? value : parseFloat(value) || 0)
          : 0
      });
    });
    
    // Создаем имя экспорта
    const exportName = createExportName(name, 'teplo');
    
    // Создаем содержимое файла
    const fileContent = `// Оригинальное название: ${name}
export const ${exportName} = ${JSON.stringify(chartData, null, 2)};
`;
    
    // Сохраняем файл
    const filePath = path.join(dataDir, `${chartId}.ts`);
    fs.writeFileSync(filePath, fileContent, 'utf-8');
    
    newCharts.push({
      chartId,
      name: name + ' - Тепло',
      path: `/${chartId}`,
      dataType: 'reserve',
      exportName,
      dataKey: exportName
    });
    
    created++;
    
    if ((index + 1) % 50 === 0) {
      console.log(`Обработано ${index + 1}/${data.length}...`);
    }
  });
  
  console.log(`✅ Создано новых тепловых графиков: ${created}`);
  console.log(`   Пропущено: ${skipped}\n`);
} else {
  console.log('❌ Файл не найден:', teploExcelFile);
}

// Обрабатываем электричество
console.log('=== ОБРАБОТКА ЭЛЕКТРИЧЕСТВА ===');
if (fs.existsSync(electricExcelFile)) {
  const workbook = XLSX.readFile(electricExcelFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`Найдено ${data.length} строк в Excel\n`);
  
  let created = 0;
  let skipped = 0;
  
  data.forEach((row, index) => {
    const name = row.name;
    if (!name) {
      skipped++;
      return;
    }
    
    const chartId = nameToChartIdElectric(name);
    if (!chartId) {
      skipped++;
      return;
    }
    
    // Пропускаем, если уже существует
    if (existingChartIds.has(chartId)) {
      return;
    }
    
    // Создаем данные для графика (всегда с 2026 по 2035)
    const chartData = [];
    years.forEach(year => {
      const value = row[year];
      chartData.push({
        year: year,
        reserve: (value !== undefined && value !== null && value !== '') 
          ? (typeof value === 'number' ? value : parseFloat(value) || 0)
          : 0
      });
    });
    
    // Создаем имя экспорта
    const exportName = createExportName(name, 'electricПс_');
    
    // Создаем содержимое файла
    const fileContent = `// Оригинальное название: ${name}
export const ${exportName} = ${JSON.stringify(chartData, null, 2)};
`;
    
    // Сохраняем файл
    const filePath = path.join(dataDir, `${chartId}.ts`);
    fs.writeFileSync(filePath, fileContent, 'utf-8');
    
    newCharts.push({
      chartId,
      name: name + ' - Электричество',
      path: `/${chartId}`,
      dataType: 'reserve',
      exportName,
      dataKey: exportName
    });
    
    created++;
    
    if ((index + 1) % 50 === 0) {
      console.log(`Обработано ${index + 1}/${data.length}...`);
    }
  });
  
  console.log(`✅ Создано новых электрических графиков: ${created}`);
  console.log(`   Пропущено: ${skipped}\n`);
} else {
  console.log('❌ Файл не найден:', electricExcelFile);
}

console.log(`\n✅ Всего создано новых графиков: ${newCharts.length}`);
console.log('\nТеперь нужно:');
console.log('1. Добавить записи в ChartDataMapper.ts');
console.log('2. Обновить allChartsData.ts (запустить generateAllDataImports.cjs)');
console.log('3. Добавить логику пометки новых графиков в админке');

// Сохраняем список новых графиков для дальнейшей обработки
fs.writeFileSync(
  path.join(__dirname, 'newCharts.json'),
  JSON.stringify(newCharts, null, 2),
  'utf-8'
);
console.log('\nСписок новых графиков сохранен в scripts/newCharts.json');
