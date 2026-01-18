// Скрипт для создания списка всех графиков из Excel файлов
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const teploExcelFile = path.join(__dirname, '../../Тепло_для_графика_26_35.xlsx');
const electricExcelFile = path.join(__dirname, '../../Электро_для_графика_26_35.xlsx');
const outputFile = path.join(__dirname, '../src/data/newChartsFromExcel.json');

console.log('Создание списка графиков из Excel...\n');

// Функции для преобразования
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
    if (!id.startsWith('teplo')) id = 'teplo' + id;
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

const allChartIds = new Set();

// Обрабатываем тепло
if (fs.existsSync(teploExcelFile)) {
  const workbook = XLSX.readFile(teploExcelFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  data.forEach(row => {
    if (row.ObjectName) {
      const chartId = nameToChartIdTeplo(row.ObjectName);
      if (chartId) allChartIds.add(chartId);
    }
  });
  
  console.log(`Тепло: ${data.length} строк, ${allChartIds.size} уникальных chartId`);
}

// Обрабатываем электричество
if (fs.existsSync(electricExcelFile)) {
  const workbook = XLSX.readFile(electricExcelFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  let electricCount = 0;
  data.forEach(row => {
    if (row.name) {
      const chartId = nameToChartIdElectric(row.name);
      if (chartId) {
        allChartIds.add(chartId);
        electricCount++;
      }
    }
  });
  
  console.log(`Электричество: ${data.length} строк, ${electricCount} уникальных chartId`);
}

// Сохраняем список
const newChartsList = Array.from(allChartIds).sort();
fs.writeFileSync(outputFile, JSON.stringify(newChartsList, null, 2), 'utf-8');

console.log(`\n✅ Список создан: ${newChartsList.length} графиков`);
console.log(`   Тепло: ${newChartsList.filter(id => id.startsWith('teplo')).length}`);
console.log(`   Электричество: ${newChartsList.filter(id => id.startsWith('electricps')).length}`);
console.log(`\nСохранено в: ${outputFile}`);
