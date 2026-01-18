// Скрипт для генерации файлов данных из Excel для электрических графиков
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelFile = path.join(__dirname, '../../Электро_для_графика_26_35.xlsx');
const dataDir = path.join(__dirname, '../src/data');

console.log('Генерация файлов данных из Excel...');

if (!fs.existsSync(excelFile)) {
  console.error(`❌ Файл не найден: ${excelFile}`);
  process.exit(1);
}

// Функция для преобразования названия в chartId
function nameToChartId(name) {
  if (!name) return null;
  
  // Убираем лишние пробелы и приводим к нижнему регистру
  let id = name.toString().trim().toLowerCase();
  
  // Заменяем кириллицу на латиницу
  const translit = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    ' ': '_', '-': '_', '.': '', ',': '', '(': '', ')': '', '"': '', "'": ''
  };
  
  id = id.split('').map(char => translit[char] || char).join('');
  
  // Убираем двойные подчеркивания
  id = id.replace(/_+/g, '_');
  id = id.replace(/^_|_$/g, '');
  
  // Убираем двойной префикс "ps" если есть
  id = id.replace(/^ps_/, '');
  
  // Добавляем префикс electricps если его нет
  if (!id.startsWith('electric')) {
    id = 'electricps_' + id;
  }
  
  // Убираем двойной "ps" в середине (electricps_ps_ -> electricps_)
  id = id.replace(/electricps_ps_/g, 'electricps_');
  
  return id;
}

// Функция для создания имени экспорта (кириллица)
function createExportName(name) {
  if (!name) return null;
  
  // Убираем "ПС" и "кВ" из начала, оставляем только название
  let exportName = name.toString().trim();
  
  // Убираем префиксы
  exportName = exportName.replace(/^ПС\s+/, '');
  exportName = exportName.replace(/\s+кВ\s+/, '_');
  exportName = exportName.replace(/\s+/g, '_');
  
  // Создаем имя экспорта
  return 'electricПс_' + exportName.replace(/[^а-яА-ЯёЁ0-9_]/g, '') + 'Data';
}

// Читаем Excel
const workbook = XLSX.readFile(excelFile);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`Найдено ${data.length} графиков в Excel`);

let created = 0;
let updated = 0;
let skipped = 0;

data.forEach((row, index) => {
  const name = row.name;
  if (!name) {
    skipped++;
    return;
  }
  
  const chartId = nameToChartId(name);
  if (!chartId) {
    skipped++;
    return;
  }
  
  // Создаем данные для графика
  const chartData = [];
  const years = ['2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'];
  
  years.forEach(year => {
    const value = row[year];
    if (value !== undefined && value !== null) {
      chartData.push({
        year: year,
        value: typeof value === 'number' ? value : parseFloat(value) || 0
      });
    }
  });
  
  if (chartData.length === 0) {
    skipped++;
    return;
  }
  
  // Создаем имя экспорта
  const exportName = createExportName(name);
  
  // Создаем содержимое файла
  const fileContent = `// Оригинальное название: ${name}
export const ${exportName} = ${JSON.stringify(chartData, null, 2)};
`;
  
  // Сохраняем файл
  const filePath = path.join(dataDir, `${chartId}.ts`);
  const exists = fs.existsSync(filePath);
  
  fs.writeFileSync(filePath, fileContent, 'utf-8');
  
  if (exists) {
    updated++;
  } else {
    created++;
  }
  
  if ((index + 1) % 20 === 0) {
    console.log(`Обработано ${index + 1}/${data.length}...`);
  }
});

console.log(`\n✅ Готово!`);
console.log(`   Создано: ${created}`);
console.log(`   Обновлено: ${updated}`);
console.log(`   Пропущено: ${skipped}`);
console.log(`   Всего: ${created + updated}`);
