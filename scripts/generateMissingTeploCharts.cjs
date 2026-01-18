// Скрипт для генерации файлов данных для недостающих тепловых графиков
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelFile = path.join(__dirname, '../../Тепло_для_графика_26_35.xlsx');
const dataDir = path.join(__dirname, '../src/data');

console.log('Генерация файлов данных для недостающих графиков...');

if (!fs.existsSync(excelFile)) {
  console.error(`❌ Файл не найден: ${excelFile}`);
  process.exit(1);
}

// Маппинг URL -> название в Excel
const chartMapping = [
  { 
    url: 'teplokotelnaya_detskiy_sanatoriy_39', 
    excelName: 'Котельная Детский санаторий № 39',
    chartId: 'teplokotelnaya_detskiy_sanatoriy_39',
    displayName: 'Котелная Детский санаторий № 39 - Тепло',
    dataKey: 'teploKotelnaya_detskiy_sanatoriy_39Data'
  },
  { 
    url: 'teplokotelnaya_p_gazoprovod_territoriya_mueg', 
    excelName: 'Котельная п. Газопровод (территория "МУЭГ")',
    chartId: 'teplokotelnaya_p_gazoprovod_territoriya_mueg',
    displayName: 'Котелная п. Газопровод (территория "МУЭГ") - Тепло',
    dataKey: 'teploKotelnaya_p_gazoprovod_territoriya_muegData'
  },
  { 
    url: 'teplonovaya_kotelnaya_vblizi_d_piskovo', 
    excelName: 'Новая котельная вблизи д. Писково',
    chartId: 'teplonovaya_kotelnaya_vblizi_d_piskovo',
    displayName: 'Новая котелная вблизи д. Писково - Тепло',
    dataKey: 'teploNovaya_kotelnaya_vblizi_d_piskovoData'
  },
  { 
    url: 'teplonovaya_kotelnaya_vblizi_d_pyhchevo', 
    excelName: 'Новая котельная вблизи д. Пыхчево',
    chartId: 'teplonovaya_kotelnaya_vblizi_d_pyhchevo',
    displayName: 'Новая котелная вблизи д. Пыхчево - Тепло',
    dataKey: 'teploNovaya_kotelnaya_vblizi_d_pyhchevoData'
  },
  { 
    url: 'teplonovaya_kotelnaya_zhk_lesnaya_skazka', 
    excelName: 'Новая котельная ЖК "Лесная сказка"',
    chartId: 'teplonovaya_kotelnaya_zhk_lesnaya_skazka',
    displayName: 'Новая котелная ЖК "Лесная сказка" - Тепло',
    dataKey: 'teploNovaya_kotelnaya_zhk_lesnaya_skazkaData'
  },
  { 
    url: 'teplonovaya_kotelnaya_rublevo_arhangelskoe', 
    excelName: 'Новая котельная "Рублево-Архангельское"',
    chartId: 'teplonovaya_kotelnaya_rublevo_arhangelskoe',
    displayName: 'Новая котелная "Рублево-Архангельское" - Тепло',
    dataKey: 'teploNovaya_kotelnaya_rublevo_arhangelskoeData'
  },
  { 
    url: 'teplonovaya_kotelnaya_zhk_kvartal_marino', 
    excelName: 'Новая котельная ЖК «Квартал Марьино»',
    chartId: 'teplonovaya_kotelnaya_zhk_kvartal_marino',
    displayName: 'Новая котелная ЖК «Квартал Марьино» - Тепло',
    dataKey: 'teploNovaya_kotelnaya_zhk_kvartal_marinoData'
  }
];

// Читаем Excel
const workbook = XLSX.readFile(excelFile);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`Найдено ${data.length} графиков в Excel\n`);

let created = 0;
let notFound = 0;

chartMapping.forEach(({ url, excelName, chartId, displayName, dataKey }) => {
  // Ищем в Excel
  const row = data.find(r => r.ObjectName === excelName);
  
  if (!row) {
    console.log(`❌ Не найдено: ${excelName}`);
    notFound++;
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
        reserve: typeof value === 'number' ? value : parseFloat(value) || 0
      });
    }
  });
  
  if (chartData.length === 0) {
    console.log(`❌ Нет данных для: ${excelName}`);
    notFound++;
    return;
  }
  
  // Создаем содержимое файла
  const fileContent = `// Оригинальное название: ${excelName}
export const ${dataKey} = ${JSON.stringify(chartData, null, 2)};
`;
  
  // Сохраняем файл
  const filePath = path.join(dataDir, `${chartId}.ts`);
  fs.writeFileSync(filePath, fileContent, 'utf-8');
  
  console.log(`✅ Создан: ${chartId}.ts (${chartData.length} записей)`);
  created++;
});

console.log(`\n✅ Готово!`);
console.log(`   Создано: ${created}`);
console.log(`   Не найдено: ${notFound}`);
