// Скрипт для проверки и исправления всех файлов данных - все должны иметь данные с 2026 по 2035
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../src/data');
const years = ['2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'];

console.log('Проверка и исправление данных графиков...\n');

const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.ts') && !f.includes('allCharts') && !f.includes('allChartsConfigs'));

let fixed = 0;
let checked = 0;
let problems = [];

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Ищем экспорт данных
  const exportMatch = content.match(/export const (\w+Data)\s*=\s*(\[[\s\S]*?\]);/);
  if (!exportMatch) return;
  
  const exportName = exportMatch[1];
  let data;
  try {
    data = eval('(' + exportMatch[2] + ')');
  } catch (e) {
    return;
  }
  
  checked++;
  
  // Проверяем, какие годы присутствуют
  const dataYears = data.map(d => String(d.year));
  const missingYears = years.filter(y => !dataYears.includes(y));
  
  if (missingYears.length === 0) {
    return; // Все годы присутствуют
  }
  
  // Определяем тип данных
  const firstItem = data[0] || {};
  const dataType = firstItem.reserve !== undefined ? 'reserve' :
                   firstItem.value !== undefined ? 'value' :
                   firstItem.total_net !== undefined ? 'total_net' :
                   firstItem.load !== undefined ? 'load' : 'reserve';
  
  // Добавляем недостающие годы со значением 0
  missingYears.forEach(year => {
    const newItem = { year };
    if (dataType === 'reserve') {
      newItem.reserve = 0;
    } else if (dataType === 'value') {
      newItem.value = 0;
    } else if (dataType === 'total_net') {
      newItem.total_net = 0;
      if (firstItem.load !== undefined) {
        newItem.load = 0;
      }
    } else if (dataType === 'load') {
      newItem.load = 0;
    }
    data.push(newItem);
  });
  
  // Сортируем по годам
  data.sort((a, b) => {
    const yearA = parseInt(String(a.year));
    const yearB = parseInt(String(b.year));
    return yearA - yearB;
  });
  
  // Обновляем файл
  const newDataString = JSON.stringify(data, null, 2);
  content = content.replace(
    /export const \w+Data\s*=\s*\[[\s\S]*?\];/,
    `export const ${exportName} = ${newDataString};`
  );
  
  fs.writeFileSync(filePath, content, 'utf-8');
  fixed++;
  
  if (fixed % 50 === 0) {
    console.log(`Исправлено ${fixed} файлов...`);
  }
});

console.log(`\n✅ Готово!`);
console.log(`   Проверено: ${checked}`);
console.log(`   Исправлено: ${fixed}`);
