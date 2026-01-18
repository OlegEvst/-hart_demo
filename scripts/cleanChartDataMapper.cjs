const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const CHART_DATA_MAPPER_PATH = path.join(PROJECT_ROOT, 'src/components/ChartDataMapper.ts');
const NEW_CHARTS_JSON_PATH = path.join(PROJECT_ROOT, 'src/data/newChartsFromExcel.json');

// Читаем список новых графиков из Excel
const newChartsFromExcel = JSON.parse(fs.readFileSync(NEW_CHARTS_JSON_PATH, 'utf-8'));
const allowedChartIds = new Set(newChartsFromExcel);

console.log(`📊 Всего графиков в newChartsFromExcel.json: ${newChartsFromExcel.length}`);
console.log(`   - teplo: ${newChartsFromExcel.filter(id => id.startsWith('teplo')).length}`);
console.log(`   - electricps: ${newChartsFromExcel.filter(id => id.startsWith('electricps')).length}`);

// Читаем ChartDataMapper.ts
let content = fs.readFileSync(CHART_DATA_MAPPER_PATH, 'utf-8');

// Находим все записи графиков
const chartPattern = /{\s*id:\s*['"]([^'"]+)['"],\s*name:\s*['"](.*?)['"],\s*path:\s*['"]([^'"]+)['"],\s*dataType:\s*['"]([^'"]+)['"]([^}]*?)(?:dataKey:\s*['"]([^'"]*)['"])?[^}]*}/gs;

const charts = [];
let match;
while ((match = chartPattern.exec(content)) !== null) {
  const id = match[1];
  const name = match[2];
  const path = match[3];
  const dataType = match[4];
  const middlePart = match[5] || '';
  const dataKey = match[6] || '';
  
  charts.push({
    id,
    name,
    path,
    dataType,
    middlePart,
    dataKey,
    fullMatch: match[0],
    index: match.index
  });
}

console.log(`\n📋 Всего графиков в ChartDataMapper.ts: ${charts.length}`);

// Фильтруем: оставляем только те, что есть в newChartsFromExcel
const allowedCharts = charts.filter(chart => allowedChartIds.has(chart.id));
const removedCharts = charts.filter(chart => !allowedChartIds.has(chart.id));

console.log(`✅ Оставляем: ${allowedCharts.length}`);
console.log(`❌ Удаляем: ${removedCharts.length}`);

if (removedCharts.length > 0) {
  console.log(`\n🗑️  Удаляемые графики (первые 10):`);
  removedCharts.slice(0, 10).forEach(chart => {
    console.log(`   - ${chart.id}`);
  });
}

// Находим начало и конец массива chartDataMap
const arrayStartMatch = content.match(/const chartDataMap:\s*ChartDataInfo\[\]\s*=\s*\[/);
if (!arrayStartMatch) {
  console.error('❌ Не найдено начало массива chartDataMap');
  process.exit(1);
}

const arrayStartIndex = arrayStartMatch.index + arrayStartMatch[0].length;
const arrayEndIndex = content.indexOf('];', arrayStartIndex);

if (arrayEndIndex === -1) {
  console.error('❌ Не найден конец массива chartDataMap');
  process.exit(1);
}

// Создаем новый массив с только разрешенными графиками
const newChartsArray = allowedCharts.map(chart => {
  if (chart.dataKey) {
    return `  { id: '${chart.id}', name: '${chart.name.replace(/'/g, "\\'")}', path: '${chart.path}', dataType: '${chart.dataType}', dataLoader: createDataLoader('${chart.id}', '${chart.dataKey}'), dataKey: '${chart.dataKey}' }`;
  } else {
    // Если нет dataKey, используем только dataLoader без dataKey
    const loaderPart = chart.middlePart.includes('dataLoader') ? chart.middlePart.match(/dataLoader:\s*([^,}]+)/)?.[1] || 'createDataLoader(\'' + chart.id + '\')' : 'createDataLoader(\'' + chart.id + '\')';
    return `  { id: '${chart.id}', name: '${chart.name.replace(/'/g, "\\'")}', path: '${chart.path}', dataType: '${chart.dataType}', dataLoader: ${loaderPart} }`;
  }
}).join(',\n');

// Собираем новый файл
const beforeArray = content.substring(0, arrayStartIndex);
const afterArray = content.substring(arrayEndIndex);

const newContent = beforeArray + '\n' + newChartsArray + '\n' + afterArray;

// Сохраняем
fs.writeFileSync(CHART_DATA_MAPPER_PATH, newContent, 'utf-8');

console.log(`\n✅ ChartDataMapper.ts обновлен!`);
console.log(`   Осталось графиков: ${allowedCharts.length}`);
console.log(`   Удалено графиков: ${removedCharts.length}`);
