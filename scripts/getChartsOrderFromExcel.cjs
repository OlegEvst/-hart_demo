// Скрипт для получения порядка графиков из Excel файлов
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const teploExcelFile = path.join(__dirname, '../../Тепло_для_графика_26_35.xlsx');
const electricExcelFile = path.join(__dirname, '../../Электро_для_графика_26_35.xlsx');
const outputFile = path.join(__dirname, '../src/data/chartsOrder.json');

console.log('Чтение порядка графиков из Excel файлов...\n');

// Функция для преобразования названия в chartId (для тепла) - копия из generateAllChartsFromExcel.cjs
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

// Функция для преобразования названия в chartId (для электричества) - копия из generateAllChartsFromExcel.cjs
function nameToChartIdElectric(name) {
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
  
  if (!id.startsWith('electricps')) {
    id = 'electricps' + id.replace(/^(ps|подстанция|пс)/, '');
    if (!id.startsWith('electricps')) {
      id = 'electricps' + id;
    }
  }
  return id;
}

const chartsOrder = [];

// Читаем файл Тепло
if (fs.existsSync(teploExcelFile)) {
  console.log('Чтение файла Тепло...');
  const workbook = XLSX.readFile(teploExcelFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  // Используем ObjectName как в generateAllChartsFromExcel.cjs
  data.forEach((row) => {
    if (row.ObjectName) {
      const name = row.ObjectName.toString().trim();
      if (name) {
        const chartId = nameToChartIdTeplo(name);
        if (chartId) {
          chartsOrder.push({
            id: chartId,
            name: name,
            category: 'teplo',
            order: chartsOrder.length
          });
        }
      }
    }
  });
  console.log(`  Найдено графиков teplo: ${chartsOrder.length}`);
}

// Читаем файл Электро
if (fs.existsSync(electricExcelFile)) {
  console.log('Чтение файла Электро...');
  const workbook = XLSX.readFile(electricExcelFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  // Используем name как в generateAllChartsFromExcel.cjs
  data.forEach((row) => {
    if (row.name) {
      const name = row.name.toString().trim();
      if (name) {
        const chartId = nameToChartIdElectric(name);
        if (chartId) {
          chartsOrder.push({
            id: chartId,
            name: name,
            category: 'electric',
            order: chartsOrder.length
          });
        }
      }
    }
  });
  console.log(`  Найдено графиков electric: ${chartsOrder.length - chartsOrder.filter(c => c.category === 'teplo').length}`);
}

// Создаем объект для быстрого поиска порядка по ID
const orderMap = {};
chartsOrder.forEach((chart, index) => {
  orderMap[chart.id] = index;
});

// Сохраняем порядок
const output = {
  charts: chartsOrder,
  orderMap: orderMap
};

fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');

console.log(`\n✅ Порядок графиков сохранен в ${outputFile}`);
console.log(`   Всего графиков: ${chartsOrder.length}`);
console.log(`   - teplo: ${chartsOrder.filter(c => c.category === 'teplo').length}`);
console.log(`   - electric: ${chartsOrder.filter(c => c.category === 'electric').length}`);
