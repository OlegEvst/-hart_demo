import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { generateBalanceComponent, generateReserveComponent } from './generateComponentTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загрузка переменных окружения из .env файла
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    }
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
// Пути к статическим файлам (можно настроить через переменные окружения)
const FRONTEND_PATH = process.env.FRONTEND_PATH || path.join(__dirname, 'frontend');
const DIST_PATH = process.env.DIST_PATH || path.join(__dirname, '../dist');
const ADMIN_PATH = process.env.ADMIN_PATH || path.join(__dirname, '../deploy/admin');

// Статические файлы для фронтенда сервиса
if (fs.existsSync(FRONTEND_PATH)) {
  app.use(express.static(FRONTEND_PATH));
}

// Статические файлы основного приложения
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
}

// Статические файлы для админки с заголовками против кэширования
app.use('/admin', (req, res, next) => {
  // Устанавливаем заголовки против кэширования для всех файлов админки
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString(),
    'ETag': ''
  });
  next();
}, express.static(ADMIN_PATH));

// Настройка multer для загрузки файлов
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Создаем папки для хранения данных
// Используем переменные окружения или значения по умолчанию
const PROJECT_ROOT = process.env.PROJECT_ROOT || path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(PROJECT_ROOT, 'src/data');
const COMPONENTS_DIR = process.env.COMPONENTS_DIR || path.join(PROJECT_ROOT, 'src/components');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(COMPONENTS_DIR);
fs.ensureDirSync(UPLOADS_DIR);

// Функция для парсинга Excel файла
function parseExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  return data;
}

// Функция для поиска данных в Excel (улучшенная версия на основе extract_new_data_from_excel.mjs)
function findDataInExcel(data, searchParams) {
  const { plantName, dataType, part } = searchParams;
  
  // Ищем строку с названием объекта (колонка 1 содержит название, колонка 2 = "Наименование показателя")
  let startRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i][1] && data[i][1].toString().includes(plantName) && 
        data[i][2] === 'Наименование показателя') {
      startRow = i;
      break;
    }
  }
  
  if (startRow === -1) return null;
  
  const result = {
    startRow,
    totalNet: null,
    load: null,
    reserve: null,
    years: []
  };
  
  // Определяем колонки в зависимости от части
  // Part 1: колонки D-M (индексы 3-12) = 2025-2034
  // Part 2: колонки Z-AV (индексы 25-35) = 2025-2034
  const labelCol = part === 2 ? 26 : 2; // Колонка с названием показателя
  const startCol = part === 2 ? 26 : 3;  // Первая колонка с данными
  const endCol = part === 2 ? 35 : 12;   // Последняя колонка с данными
  
  // Извлекаем годы из заголовка
  if (data[startRow] && data[startRow][startCol]) {
    for (let j = startCol; j <= endCol; j++) {
      if (data[startRow][j] && typeof data[startRow][j] === 'number' && data[startRow][j] >= 2025) {
        result.years.push(data[startRow][j]);
      }
    }
  }
  
  // Для баланса: ищем вторую строку "Тепловая мощность нетто" и вторую "Нагрузка существующих объектов"
  if (dataType === 'balance') {
    let totalNetRow = -1;
    let foundFirst = false;
    for (let i = startRow + 1; i < startRow + 20; i++) {
      if (data[i] && data[i][labelCol] && 
          data[i][labelCol].toString().includes('Тепловая мощность нетто') ||
          data[i][labelCol].toString().includes('Проектная производительность')) {
        if (foundFirst) {
          totalNetRow = i;
          break;
        }
        foundFirst = true;
      }
    }
    
    let loadRow = -1;
    let foundFirstLoad = false;
    for (let i = startRow + 1; i < startRow + 20; i++) {
      if (data[i] && data[i][labelCol] && 
          data[i][labelCol].toString().includes('Нагрузка существующих объектов')) {
        if (foundFirstLoad) {
          loadRow = i;
          break;
        }
        foundFirstLoad = true;
      }
    }
    
    if (totalNetRow !== -1 && loadRow !== -1) {
      const totalNetValues = [];
      const loadValues = [];
      for (let j = startCol; j <= endCol; j++) {
        const totalNet = data[totalNetRow][j];
        const load = data[loadRow][j];
        if (totalNet !== null && totalNet !== undefined && typeof totalNet === 'number') {
          totalNetValues.push(totalNet);
        }
        if (load !== null && load !== undefined && typeof load === 'number') {
          loadValues.push(load);
        }
      }
      if (totalNetValues.length >= 9) result.totalNet = totalNetValues;
      if (loadValues.length >= 9) result.load = loadValues;
    }
  }
  
  // Для резерва: ищем строку "Резерв"
  if (dataType === 'reserve') {
    let reserveRow = -1;
    for (let i = startRow + 1; i < startRow + 20; i++) {
      if (data[i] && data[i][labelCol] && 
          (data[i][labelCol].toString().includes('Резерв тепловой мощности') ||
           data[i][labelCol].toString().includes('Резерв электрической мощности') ||
           data[i][labelCol].toString().includes('Резерв'))) {
        reserveRow = i;
        break;
      }
    }
    
    if (reserveRow !== -1) {
      const reserveValues = [];
      for (let j = startCol; j <= endCol; j++) {
        const reserve = data[reserveRow][j];
        if (reserve !== null && reserve !== undefined && typeof reserve === 'number') {
          reserveValues.push(reserve);
        }
      }
      if (reserveValues.length >= 9) result.reserve = reserveValues;
    }
  }
  
  return result;
}

// API: Загрузка Excel файла и анализ структуры
app.post('/api/upload-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    const filePath = req.file.path;
    const data = parseExcelFile(filePath);
    
    // Анализируем структуру файла
    const plants = [];
    const years = [];
    
    // Ищем все объекты (ТЭЦ, РТС, ЛОС и т.д.)
    for (let i = 0; i < data.length; i++) {
      if (data[i] && data[i][2] === 'Наименование показателя' && data[i][1]) {
        const plantName = data[i][1].toString();
        if (plantName && !plants.find(p => p.name === plantName)) {
          plants.push({
            name: plantName,
            startRow: i
          });
        }
      }
      
      // Ищем годы в первой строке
      if (data[i] && data[i][2] === 'Наименование показателя' && data[i][3]) {
        for (let j = 3; j <= 13; j++) {
          if (data[i][j] && typeof data[i][j] === 'number' && data[i][j] >= 2025) {
            if (!years.includes(data[i][j])) {
              years.push(data[i][j]);
            }
          }
        }
      }
    }
    
    // Удаляем временный файл
    await fs.remove(filePath);
    
    res.json({
      success: true,
      plants: plants.sort((a, b) => a.name.localeCompare(b.name)),
      years: years.sort()
    });
  } catch (error) {
    console.error('Ошибка при обработке Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Функция для преобразования буквенной колонки в индекс (A=0, B=1, ...)
function columnToIndex(col) {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return result - 1;
}

// Функция для преобразования индекса в буквенную колонку (0=A, 1=B, ...)
function indexToColumn(index) {
  let result = '';
  index++;
  while (index > 0) {
    index--;
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26);
  }
  return result;
}

// Функция для извлечения данных по выбранным строкам и колонкам
// Универсальный парсер, который работает с любыми колонками, выбранными пользователем
function extractDataBySelection(data, selection, dataType) {
  console.log('=== EXTRACT DATA BY SELECTION ===');
  console.log('Selection:', JSON.stringify(selection, null, 2));
  console.log('DataType:', dataType);
  
  const labelCol = columnToIndex(selection.labelCol || 'C');
  const startCol = columnToIndex(selection.startCol || 'D');
  const endCol = columnToIndex(selection.endCol || 'M');
  
  console.log('Column indices:', { 
    labelCol, 
    startCol, 
    endCol,
    labelColLetter: indexToColumn(labelCol),
    startColLetter: indexToColumn(startCol),
    endColLetter: indexToColumn(endCol)
  });
  
  const result = {
    totalNet: null,
    load: null,
    reserve: null,
    years: []
  };
  
  // Универсальный поиск годов: ищем в указанном диапазоне колонок
  // Пробуем несколько строк вокруг строки с объектом
  let headerRow = selection.plantRow !== null && selection.plantRow !== undefined 
    ? selection.plantRow 
    : 0;
  
  console.log('Searching for years starting from row:', headerRow);
  
  // Ищем строку с годами в указанном диапазоне колонок
  // Проверяем строки от plantRow-3 до plantRow+10
  for (let tryRow = Math.max(0, headerRow - 3); tryRow <= Math.min(data.length - 1, headerRow + 10); tryRow++) {
    if (!data[tryRow]) continue;
    
    const yearsInRow = [];
    for (let col = startCol; col <= endCol && col < (data[tryRow].length || 0); col++) {
      const cellValue = data[tryRow][col];
      if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
        // Пробуем разные форматы: число, строка с числом, дата
        let numValue;
        if (typeof cellValue === 'number') {
          numValue = cellValue;
        } else if (typeof cellValue === 'string') {
          // Пробуем извлечь год из строки (например, "2025" или "2025-2034")
          const yearMatch = cellValue.match(/\b(20\d{2})\b/);
          if (yearMatch) {
            numValue = parseInt(yearMatch[1]);
          } else {
            numValue = parseFloat(cellValue);
          }
        } else {
          numValue = parseFloat(cellValue);
        }
        
        if (!isNaN(numValue) && numValue >= 2025 && numValue <= 2040) {
          yearsInRow.push(numValue);
        }
      }
    }
    
    // Если нашли хотя бы 3 года в этой строке, считаем её строкой с годами
    if (yearsInRow.length >= 3) {
      result.years = yearsInRow;
      headerRow = tryRow;
      console.log(`✅ Found ${yearsInRow.length} years in row ${tryRow}:`, yearsInRow);
      break;
    }
  }
  
  // Если годы не найдены, создаем дефолтный список на основе количества колонок
  if (result.years.length === 0) {
    const colCount = endCol - startCol + 1;
    console.warn(`⚠️ Years not found, generating default years for ${colCount} columns`);
    for (let i = 0; i < colCount; i++) {
      result.years.push(2025 + i);
    }
  }
  
  console.log('Final years:', result.years, 'from row:', headerRow);
  
  // Извлекаем данные для баланса
  if (dataType === 'balance') {
    // Используем totalNetRow, если указан
    if (selection.totalNetRow !== null && selection.totalNetRow !== undefined) {
      let values = [];
      const row = selection.totalNetRow;
      // Используем выбранный диапазон колонок, если указан, иначе используем startCol-endCol
      const dataStartCol = selection.totalNetStartCol !== null && selection.totalNetStartCol !== undefined 
        ? selection.totalNetStartCol 
        : startCol;
      const dataEndCol = selection.totalNetEndCol !== null && selection.totalNetEndCol !== undefined 
        ? selection.totalNetEndCol 
        : endCol;
      console.log('Extracting totalNet from row:', row, 'columns:', indexToColumn(dataStartCol), '-', indexToColumn(dataEndCol));
      
      if (data[row]) {
        console.log(`Row ${row} exists, length: ${data[row].length}`);
        console.log(`Extracting from columns ${indexToColumn(dataStartCol)} (${dataStartCol}) to ${indexToColumn(dataEndCol)} (${dataEndCol})`);
        
        for (let col = dataStartCol; col <= dataEndCol && col < (data[row].length || 0); col++) {
          const cellValue = data[row][col];
          const colLetter = indexToColumn(col);
          
          if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
            let numValue;
            if (typeof cellValue === 'number') {
              numValue = cellValue;
            } else if (typeof cellValue === 'string') {
              // Убираем пробелы и пробуем распарсить
              const cleaned = cellValue.toString().trim().replace(/\s+/g, '');
              numValue = parseFloat(cleaned);
            } else {
              numValue = parseFloat(cellValue);
            }
            
            if (!isNaN(numValue)) {
              values.push(numValue);
              console.log(`  Col ${colLetter} (${col}): ${cellValue} -> ${numValue}`);
            } else {
              console.warn(`  Col ${colLetter} (${col}): "${cellValue}" is not a number, using 0`);
              values.push(0);
            }
          } else {
            console.log(`  Col ${colLetter} (${col}): empty, using 0`);
            values.push(0);
          }
        }
        
        // Если количество значений не совпадает с количеством годов, выравниваем
        if (values.length !== result.years.length) {
          console.warn(`⚠️ Values count (${values.length}) doesn't match years count (${result.years.length})`);
          // Дополняем или обрезаем до нужного размера
          while (values.length < result.years.length) {
            values.push(0);
          }
          values = values.slice(0, result.years.length);
        }
      } else {
        console.error(`❌ Row ${row} does not exist in data`);
      }
      
      console.log('TotalNet values:', values, `(${values.length} values)`);
      if (values.length > 0) result.totalNet = values;
    }
    
    // Используем loadRow, если указан
    if (selection.loadRow !== null && selection.loadRow !== undefined) {
      let values = [];
      const row = selection.loadRow;
      // Используем выбранный диапазон колонок, если указан, иначе используем startCol-endCol
      const dataStartCol = selection.loadStartCol !== null && selection.loadStartCol !== undefined 
        ? selection.loadStartCol 
        : startCol;
      const dataEndCol = selection.loadEndCol !== null && selection.loadEndCol !== undefined 
        ? selection.loadEndCol 
        : endCol;
      console.log('Extracting load from row:', row, 'columns:', indexToColumn(dataStartCol), '-', indexToColumn(dataEndCol));
      
      if (data[row]) {
        console.log(`Row ${row} exists, length: ${data[row].length}`);
        for (let col = dataStartCol; col <= dataEndCol && col < (data[row].length || 0); col++) {
          const cellValue = data[row][col];
          const colLetter = indexToColumn(col);
          
          if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
            let numValue;
            if (typeof cellValue === 'number') {
              numValue = cellValue;
            } else if (typeof cellValue === 'string') {
              const cleaned = cellValue.toString().trim().replace(/\s+/g, '');
              numValue = parseFloat(cleaned);
            } else {
              numValue = parseFloat(cellValue);
            }
            
            if (!isNaN(numValue)) {
              values.push(numValue);
            } else {
              values.push(0);
            }
          } else {
            values.push(0);
          }
        }
        
        // Выравниваем количество значений с годами
        if (values.length !== result.years.length) {
          while (values.length < result.years.length) {
            values.push(0);
          }
          values = values.slice(0, result.years.length);
        }
      } else {
        console.error(`❌ Row ${row} does not exist in data`);
      }
      
      console.log('Load values:', values, `(${values.length} values)`);
      if (values.length > 0) result.load = values;
    }
  }
  
  // Извлекаем данные для резерва
  if (dataType === 'reserve') {
    // Используем reserveRow, если указан
    if (selection.reserveRow !== null && selection.reserveRow !== undefined) {
      let values = [];
      const row = selection.reserveRow;
      // Используем выбранный диапазон колонок, если указан, иначе используем startCol-endCol
      const dataStartCol = selection.reserveStartCol !== null && selection.reserveStartCol !== undefined 
        ? selection.reserveStartCol 
        : startCol;
      const dataEndCol = selection.reserveEndCol !== null && selection.reserveEndCol !== undefined 
        ? selection.reserveEndCol 
        : endCol;
      console.log('Extracting reserve from row:', row, 'columns:', indexToColumn(dataStartCol), '-', indexToColumn(dataEndCol));
      
      if (data[row]) {
        console.log(`Row ${row} exists, length: ${data[row].length}`);
        for (let col = dataStartCol; col <= dataEndCol && col < (data[row].length || 0); col++) {
          const cellValue = data[row][col];
          const colLetter = indexToColumn(col);
          
          if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
            let numValue;
            if (typeof cellValue === 'number') {
              numValue = cellValue;
            } else if (typeof cellValue === 'string') {
              const cleaned = cellValue.toString().trim().replace(/\s+/g, '');
              numValue = parseFloat(cleaned);
            } else {
              numValue = parseFloat(cellValue);
            }
            
            if (!isNaN(numValue)) {
              values.push(numValue);
            } else {
              values.push(0);
            }
          } else {
            values.push(0);
          }
        }
        
        // Выравниваем количество значений с годами
        if (values.length !== result.years.length) {
          while (values.length < result.years.length) {
            values.push(0);
          }
          values = values.slice(0, result.years.length);
        }
      } else {
        console.error(`❌ Row ${row} does not exist in data`);
      }
      
      console.log('Reserve values:', values, `(${values.length} values)`);
      if (values.length > 0) result.reserve = values;
    }
  }
  
  console.log('Final result:', result);
  return result;
}

// API: Генерация графика из Excel
app.post('/api/generate-chart', upload.single('file'), async (req, res) => {
  try {
    const config = JSON.parse(req.body.config);
    const { chartId, chartName, plantName, dataType, part, colors, years: configYears, selection } = config;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    const filePath = req.file.path;
    const data = parseExcelFile(filePath);
    
    // Если есть selection (выбранные пользователем строки), используем их
    let chartData;
    console.log('Selection received:', selection);
    console.log('DataType:', dataType);
    
    if (selection && ((selection.totalNetRow !== null && selection.totalNetRow !== undefined) || 
                      (selection.loadRow !== null && selection.loadRow !== undefined) ||
                      (selection.reserveRow !== null && selection.reserveRow !== undefined))) {
      console.log('Using extractDataBySelection');
      chartData = extractDataBySelection(data, selection, dataType);
    } else {
      console.log('Using findDataInExcel (automatic search)');
      chartData = findDataInExcel(data, { plantName, dataType, part });
    }
    
    console.log('Chart data extracted:', chartData);
    
    // Проверяем наличие данных
    let hasData = false;
    if (dataType === 'balance') {
      hasData = chartData && chartData.totalNet && chartData.totalNet.length > 0 && 
                chartData.load && chartData.load.length > 0;
      console.log('Balance data check:', {
        hasTotalNet: chartData && chartData.totalNet && chartData.totalNet.length > 0,
        hasLoad: chartData && chartData.load && chartData.load.length > 0,
        totalNetLength: chartData && chartData.totalNet ? chartData.totalNet.length : 0,
        loadLength: chartData && chartData.load ? chartData.load.length : 0
      });
    } else if (dataType === 'reserve') {
      hasData = chartData && chartData.reserve && chartData.reserve.length > 0;
      console.log('Reserve data check:', {
        hasReserve: chartData && chartData.reserve && chartData.reserve.length > 0,
        reserveLength: chartData && chartData.reserve ? chartData.reserve.length : 0
      });
    }
    
    if (!hasData) {
      await fs.remove(filePath);
      const errorMsg = `Данные не найдены в Excel файле. 
        Тип: ${dataType}, 
        Выбранные строки: totalNet=${selection?.totalNetRow}, load=${selection?.loadRow}, reserve=${selection?.reserveRow},
        Колонки: ${selection?.startCol || 'D'}-${selection?.endCol || 'M'}`;
      console.error(errorMsg);
      return res.status(404).json({ error: errorMsg });
    }
    
    // Генерируем файл данных
    const dataFileName = `${chartId}.ts`;
    const dataFilePath = path.join(DATA_DIR, dataFileName);
    
    let dataFileResult;
    // Используем годы из Excel, если есть, иначе из конфига, иначе дефолтные
    const chartYears = chartData.years && chartData.years.length > 0 
      ? chartData.years.map(y => y.toString())
      : (configYears && configYears.length > 0 
          ? configYears.map(y => y.toString()) 
          : ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035']);
    
    if (dataType === 'reserve') {
      dataFileResult = generateReserveDataFile(chartId, chartData.reserve, chartYears);
    } else {
      dataFileResult = generateBalanceDataFile(chartId, chartData.totalNet, chartData.load, chartYears);
    }
    
    await fs.writeFile(dataFilePath, dataFileResult.content, 'utf-8');
    const dataVarName = dataFileResult.dataVarName;
    
    // Генерируем компонент
    const componentFileName = chartId
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('') + 'Chart.tsx';
    const componentFilePath = path.join(COMPONENTS_DIR, componentFileName);
    
    // Определяем легенды в зависимости от типа данных
    let legendLabels = {};
    if (dataType === 'balance') {
      // Определяем тип легенды по названию объекта или другим признакам
      if (chartName.includes('ЛОС') || chartName.includes('водоотведение')) {
        legendLabels = {
          primary: 'Проектная производительность, тыс.куб.м/сутки',
          secondary: 'Нагрузка существующих объектов, тыс.куб.м/сутки'
        };
      } else {
        legendLabels = {
          primary: 'Тепловая мощность нетто, Гкал/ч',
          secondary: 'Нагрузка существующих объектов, Гкал/ч'
        };
      }
      const componentContent = generateBalanceComponent(chartId, chartName, dataVarName, colors, legendLabels);
      await fs.writeFile(componentFilePath, componentContent, 'utf-8');
    } else {
      // Для резерва определяем тип легенды
      let reserveLegend = 'Резерв тепловой мощности, Гкал/ч';
      if (chartName.includes('электрическ') || chartName.includes('МВА')) {
        reserveLegend = 'Резерв электрической мощности, МВА';
      }
      const componentContent = generateReserveComponent(chartId, chartName, dataVarName, colors, reserveLegend);
      await fs.writeFile(componentFilePath, componentContent, 'utf-8');
    }
    
    // Удаляем временный файл
    await fs.remove(filePath);
    
    const responseData = {
      success: true,
      chartId,
      dataFile: dataFileName,
      componentFile: componentFileName,
      chartData: {
        years: chartYears,
        totalNet: chartData.totalNet,
        load: chartData.load,
        reserve: chartData.reserve
      },
      dataType,
      chartName
    };
    
    console.log('=== SENDING RESPONSE ===');
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    console.log('Chart years:', chartYears);
    console.log('Chart data totalNet:', chartData.totalNet);
    console.log('Chart data load:', chartData.load);
    console.log('Chart data reserve:', chartData.reserve);
    
    res.json(responseData);
  } catch (error) {
    console.error('Ошибка при генерации графика:', error);
    res.status(500).json({ error: error.message });
  }
});

// Функции генерации файлов данных
function generateBalanceDataFile(chartId, totalNet, load, years) {
  const dataVarName = chartId
    .split(/[-_]/)
    .map((word, idx) => idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join('') + 'Data';
  
  let content = `export const ${dataVarName} = [\n`;
  
  const maxLength = Math.max(
    years.length,
    totalNet ? totalNet.length : 0,
    load ? load.length : 0
  );
  
  for (let i = 0; i < maxLength; i++) {
    content += `  {\n`;
    if (years[i]) {
      content += `    "year": "${years[i]}",\n`;
    }
    if (totalNet && totalNet[i] !== undefined) {
      content += `    "total_net": ${totalNet[i]},\n`;
    }
    if (load && load[i] !== undefined) {
      content += `    "load": ${load[i]}\n`;
    }
    content += `  }${i < maxLength - 1 ? ',' : ''}\n`;
  }
  
  content += `];\n`;
  return { content, dataVarName };
}

function generateReserveDataFile(chartId, reserve, years) {
  const dataVarName = chartId
    .split(/[-_]/)
    .map((word, idx) => idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join('') + 'Data';
  
  let content = `export const ${dataVarName} = [\n`;
  
  const maxLength = Math.max(years.length, reserve ? reserve.length : 0);
  
  for (let i = 0; i < maxLength; i++) {
    content += `  {\n`;
    if (years[i]) {
      content += `    "year": "${years[i]}",\n`;
    }
    if (reserve && reserve[i] !== undefined) {
      content += `    "reserve": ${reserve[i]}\n`;
    }
    content += `  }${i < maxLength - 1 ? ',' : ''}\n`;
  }
  
  content += `];\n`;
  return { content, dataVarName };
}

// API: Получение данных графика по ID (с кэшированием)
app.get('/api/charts/:chartId/data', async (req, res) => {
  try {
    const { chartId } = req.params;
    const now = Date.now();
    
    // Проверяем кэш
    const cachedData = chartDataCache.get(chartId);
    const cacheTime = chartDataCacheTime.get(chartId);
    
    if (cachedData && cacheTime && (now - cacheTime) < CHART_DATA_CACHE_TTL) {
      // Возвращаем данные из кэша
      return res.json(cachedData);
    }
    
    // Путь к файлу данных
    const dataFileName = `${chartId}.ts`;
    const dataFilePath = path.join(DATA_DIR, dataFileName);
    
    // Проверяем существование файла
    if (!await fs.pathExists(dataFilePath)) {
      // Показываем список доступных файлов для отладки
      if (await fs.pathExists(DATA_DIR)) {
        const files = await fs.readdir(DATA_DIR);
        const tsFiles = files.filter(f => f.endsWith('.ts')).slice(0, 10);
        console.log(`[API] Файл не найден: ${dataFilePath}. Доступные файлы (первые 10): ${tsFiles.join(', ')}`);
      }
      return res.status(404).json({ error: `Данные для графика ${chartId} не найдены` });
    }
    
    // Читаем файл
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    
    // Извлекаем данные из экспорта используя eval (поддерживает кириллицу в именах переменных)
    // Сначала находим имя экспортируемой переменной
    const varNameMatch = fileContent.match(/export const\s+([\w\u0400-\u04FF_]+)\s*=/);
    
    if (!varNameMatch) {
      return res.status(500).json({ error: 'Не удалось найти экспортируемую переменную в файле' });
    }
    
    const dataVarName = varNameMatch[1];
    
    // Удаляем export const и заменяем на const для выполнения в eval
    const executableCode = fileContent.replace(/export const/g, 'const');
    
    // Используем eval для выполнения кода и получения данных
    // Это безопасно, так как файлы находятся в контролируемой директории
    let data;
    try {
      // Создаем изолированный контекст для выполнения
      const evalCode = `(function() { ${executableCode}; return ${dataVarName}; })()`;
      data = eval(evalCode);
      
      if (!Array.isArray(data)) {
        return res.status(500).json({ 
          error: 'Экспортированная переменная не является массивом',
          dataVarName,
          dataType: typeof data
        });
      }
    } catch (evalError) {
      console.error('Ошибка при выполнении кода файла:', evalError);
      console.error('Имя переменной:', dataVarName);
      console.error('Первые 200 символов кода:', executableCode.substring(0, 200));
      return res.status(500).json({ 
        error: 'Ошибка при выполнении кода файла: ' + evalError.message,
        dataVarName,
        stack: evalError.stack
      });
    }
    
    const responseData = {
      chartId,
      dataVarName,
      data
    };
    
    // Сохраняем в кэш
    chartDataCache.set(chartId, responseData);
    chartDataCacheTime.set(chartId, now);
    
    res.json(responseData);
  } catch (error) {
    console.error('Ошибка при получении данных графика:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Получение списка всех графиков (с кэшированием)
app.get('/api/charts/list', async (req, res) => {
  try {
    const charts = getChartsList();
    res.json({ charts });
  } catch (error) {
    console.error('Ошибка получения списка графиков:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Ошибка получения списка графиков', details: error.message });
  }
});

// API: Сохранение имени пользователя
app.post('/api/user/name', async (req, res) => {
  try {
    const { userName } = req.body;
    
    if (!userName || typeof userName !== 'string' || !userName.trim()) {
      return res.status(400).json({ error: 'Имя пользователя обязательно' });
    }
    
    // Сохраняем имя пользователя (в production можно использовать БД)
    // Пока просто возвращаем успех
    res.json({ success: true, userName: userName.trim() });
  } catch (error) {
    console.error('Ошибка сохранения имени пользователя:', error);
    res.status(500).json({ error: 'Ошибка сохранения имени пользователя' });
  }
});

// Пути к файлам для хранения данных
const STORAGE_DIR = path.join(__dirname, 'storage');
const STATUSES_FILE = path.join(STORAGE_DIR, 'statuses.json');
const CONFIGS_FILE = path.join(STORAGE_DIR, 'configs.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.json');

// Создаем директорию для хранения данных
fs.ensureDirSync(STORAGE_DIR);

// Функции для работы с файлами
function loadFromFile(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Ошибка загрузки из файла ${filePath}:`, error);
  }
  return defaultValue;
}

// Debounce таймеры для каждого файла
const saveTimers = {};
const saveDataCache = {};

// Функция сохранения с debounce (задержка 10 секунд)
function saveToFile(filePath, data) {
  // Сохраняем данные в кэш
  saveDataCache[filePath] = data;
  
  // Очищаем предыдущий таймер для этого файла
  if (saveTimers[filePath]) {
    clearTimeout(saveTimers[filePath]);
  }
  
  // Устанавливаем новый таймер
  saveTimers[filePath] = setTimeout(() => {
    try {
      const dataToSave = saveDataCache[filePath];
      fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      console.log(`Файл ${filePath} сохранен (debounced)`);
      delete saveTimers[filePath];
      delete saveDataCache[filePath];
    } catch (error) {
      console.error(`Ошибка сохранения в файл ${filePath}:`, error);
    }
  }, 10000); // Задержка 10 секунд
}

// Хранилище статусов графиков (загружаем из файла при старте)
let chartStatuses = loadFromFile(STATUSES_FILE, {});

// Хранилище конфигураций графиков (загружаем из файла при старте)
let chartConfigs = loadFromFile(CONFIGS_FILE, {});

// Хранилище истории изменений (загружаем из файла при старте)
let chartHistory = loadFromFile(HISTORY_FILE, []);

// Кэш для списка графиков (ChartDataMapper.ts)
let chartsListCache = null;
let chartsListCacheTime = 0;
const CHARTS_LIST_CACHE_TTL = 60000; // 60 секунд кэш

// Кэш для данных графиков (TS файлы)
const chartDataCache = new Map();
const chartDataCacheTime = new Map();
const CHART_DATA_CACHE_TTL = 300000; // 5 минут кэш для данных графиков

// Функция для получения списка графиков с кэшированием
function getChartsList() {
  const now = Date.now();
  
  // Если кэш актуален, возвращаем его
  if (chartsListCache && (now - chartsListCacheTime) < CHARTS_LIST_CACHE_TTL) {
    return chartsListCache;
  }
  
  // Иначе загружаем из файла
  try {
    const mapperPath = path.join(COMPONENTS_DIR, 'ChartDataMapper.ts');
    
    if (!fs.existsSync(mapperPath)) {
      console.error('ChartDataMapper.ts не найден по пути:', mapperPath);
      return [];
    }
    
    const fileContent = fs.readFileSync(mapperPath, 'utf-8');
    const charts = [];
    
    const objectPattern = /{\s*id:\s*['"]([^'"]+)['"],\s*name:\s*['"](.*?)['"],\s*path:\s*['"]([^'"]+)['"],\s*dataType:\s*['"]([^'"]+)['"][^}]*dataKey:\s*['"]([^'"]*)['"]/gs;
    let match;
    
    while ((match = objectPattern.exec(fileContent)) !== null) {
      const name = match[2].replace(/\\"/g, '"').replace(/\\'/g, "'");
      charts.push({
        id: match[1],
        name: name,
        path: match[3],
        dataType: match[4],
        dataKey: match[5] || undefined
      });
    }
    
    // Если не нашли с dataKey, пробуем без него
    if (charts.length === 0) {
      const objectPatternNoDataKey = /{\s*id:\s*['"]([^'"]+)['"],\s*name:\s*['"](.*?)['"],\s*path:\s*['"]([^'"]+)['"],\s*dataType:\s*['"]([^'"]+)['"]/gs;
      while ((match = objectPatternNoDataKey.exec(fileContent)) !== null) {
        const name = match[2].replace(/\\"/g, '"').replace(/\\'/g, "'");
        charts.push({
          id: match[1],
          name: name,
          path: match[3],
          dataType: match[4],
          dataKey: undefined
        });
      }
    }
    
    // Обновляем кэш
    chartsListCache = charts;
    chartsListCacheTime = now;
    
    return charts;
  } catch (error) {
    console.error('Ошибка получения списка графиков:', error);
    return [];
  }
}

// Функция для инвалидации кэша списка графиков
function invalidateChartsListCache() {
  chartsListCache = null;
  chartsListCacheTime = 0;
}

// API: Получение всех статусов графиков
app.get('/api/charts/statuses', (req, res) => {
  try {
    res.json({ statuses: chartStatuses });
  } catch (error) {
    console.error('Ошибка получения статусов:', error);
    res.status(500).json({ error: 'Ошибка получения статусов' });
  }
});

// API: Получение статуса конкретного графика
app.get('/api/charts/:chartId/status', (req, res) => {
  try {
    const { chartId } = req.params;
    const status = chartStatuses[chartId] || 'not_edited';
    res.json({ chartId, status });
  } catch (error) {
    console.error('Ошибка получения статуса:', error);
    res.status(500).json({ error: 'Ошибка получения статуса' });
  }
});

// API: Установка статуса графика
app.post('/api/charts/:chartId/status', (req, res) => {
  try {
    const { chartId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['not_edited', 'edited', 'ready_for_publication'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Недопустимый статус' });
    }
    
    chartStatuses[chartId] = status;
    
    // Сохраняем в файл (с debounce)
    saveToFile(STATUSES_FILE, chartStatuses);
    
    // Статусы уже в памяти, кэш не нужен - данные актуальны
    
    res.json({ success: true, chartId, status });
  } catch (error) {
    console.error('Ошибка установки статуса:', error);
    res.status(500).json({ error: 'Ошибка установки статуса' });
  }
});

// API: Сохранение конфигурации графика
app.post('/api/charts/:chartId/config/:resolution', (req, res) => {
  try {
    const { chartId, resolution } = req.params;
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({ error: 'Конфигурация обязательна' });
    }
    
    const key = `${chartId}_${resolution}`;
    chartConfigs[key] = {
      chartId,
      resolution,
      config,
      savedAt: new Date().toISOString(),
    };
    
    // Сохраняем в файл
    saveToFile(CONFIGS_FILE, chartConfigs);
    
    // Инвалидируем кэш списка графиков при изменении конфигурации
    // (на случай если изменился ChartDataMapper.ts)
    invalidateChartsListCache();
    
    res.json({ success: true, chartId, resolution });
  } catch (error) {
    console.error('Ошибка сохранения конфигурации:', error);
    res.status(500).json({ error: 'Ошибка сохранения конфигурации' });
  }
});

// API: Получение конфигурации графика
app.get('/api/charts/:chartId/config/:resolution', (req, res) => {
  try {
    const { chartId, resolution } = req.params;
    const key = `${chartId}_${resolution}`;
    const savedConfig = chartConfigs[key];
    
    // Если конфигурация не найдена, возвращаем 200 с null
    // Это предотвращает ошибки 404 в консоли браузера
    // Фронтенд обработает null и использует дефолтную конфигурацию
    if (!savedConfig) {
      return res.status(200).json(null);
    }
    
    res.json(savedConfig);
  } catch (error) {
    console.error('Ошибка получения конфигурации:', error);
    res.status(500).json({ error: 'Ошибка получения конфигурации' });
  }
});

// API: Получение всех конфигураций (опционально, для отладки)
app.get('/api/charts/configs', (req, res) => {
  try {
    res.json({ configs: chartConfigs });
  } catch (error) {
    console.error('Ошибка получения конфигураций:', error);
    res.status(500).json({ error: 'Ошибка получения конфигураций' });
  }
});

// API: Добавление записи в историю изменений
app.post('/api/charts/history', (req, res) => {
  try {
    const entry = req.body;
    
    // Валидация
    if (!entry.chartId || !entry.resolution || !entry.userName || !entry.timestamp) {
      return res.status(400).json({ error: 'Неполные данные записи истории' });
    }
    
    chartHistory.unshift(entry); // Добавляем в начало
    
    // Ограничиваем историю последними 1000 записями
    chartHistory = chartHistory.slice(0, 1000);
    
    // Сохраняем в файл
    saveToFile(HISTORY_FILE, chartHistory);
    
    res.json({ success: true, entry });
  } catch (error) {
    console.error('Ошибка добавления записи в историю:', error);
    res.status(500).json({ error: 'Ошибка добавления записи в историю' });
  }
});

// API: Получение истории для конкретного графика и разрешения
app.get('/api/charts/:chartId/history/:resolution', (req, res) => {
  try {
    const { chartId, resolution } = req.params;
    const filteredHistory = chartHistory.filter(
      entry => entry.chartId === chartId && entry.resolution === resolution
    );
    res.json({ history: filteredHistory });
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    res.status(500).json({ error: 'Ошибка получения истории' });
  }
});

// API: Получение всей истории (опционально, для отладки)
app.get('/api/charts/history', (req, res) => {
  try {
    res.json({ history: chartHistory });
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    res.status(500).json({ error: 'Ошибка получения истории' });
  }
});

// API: Сохранение конфигурации графика
app.post('/api/charts/:chartId/config', (req, res) => {
  const { chartId } = req.params;
  const config = req.body;
  
  // Сохраняем в localStorage через API (или в файл на сервере)
  // Для динамической работы лучше использовать localStorage на клиенте
  res.json({ success: true, chartId, config });
});

// API: Запуск сборки проекта (ОТКЛЮЧЕНО - сборка больше не нужна)
app.post('/api/build', async (req, res) => {
  // Сборка отключена - просто возвращаем успех без запуска сборки
  // Это нужно для обратной совместимости со старым фронтендом
  console.log('Запрос на сборку получен, но сборка отключена (изменения применяются автоматически)');
  return res.json({ success: true, message: 'Сборка отключена - изменения применяются автоматически' });
  try {
    const { spawn } = await import('child_process');
    const projectRoot = path.join(__dirname, '..');
    
    console.log('Запуск сборки проекта...');
    
    // Отправляем ответ сразу, не дожидаясь завершения сборки
    res.json({ success: true, message: 'Сборка проекта запущена в фоне' });
    
    // Запускаем сборку в фоне (после отправки ответа)
    // Используем spawn для лучшей обработки длительных процессов
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: projectRoot,
      shell: true,
      stdio: 'inherit'
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Сборка проекта завершена успешно');
      } else {
        console.error(`Сборка проекта завершилась с кодом ${code}`);
      }
    });
    
    buildProcess.on('error', (error) => {
      console.error('Ошибка при запуске сборки:', error);
    });
  } catch (error) {
    console.error('Ошибка при запуске сборки:', error);
    // Проверяем, не был ли ответ уже отправлен
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: 'Ошибка при запуске сборки: ' + error.message 
      });
    }
  }
});

// Главная страница - конструктор графиков
app.get('/', (req, res) => {
  res.sendFile(path.join(DIST_PATH, 'index.html'));
});

// Функция для отдачи index.html админки с версионированием
function serveAdminIndex(req, res) {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString(),
    'ETag': ''
  });
  const adminIndexPath = path.join(__dirname, '../deploy/admin', 'index.html');
  if (fs.existsSync(adminIndexPath)) {
    // Читаем index.html и добавляем версионирование к URL файлов
    let html = fs.readFileSync(adminIndexPath, 'utf-8');
    const version = Date.now(); // Используем временную метку для версионирования
    // Добавляем версию к URL всех статических файлов
    html = html.replace(/(src|href)=["']([^"']*\.(js|css))["']/g, (match, attr, url) => {
      const separator = url.includes('?') ? '&' : '?';
      return `${attr}="${url}${separator}v=${version}"`;
    });
    res.send(html);
  } else {
    res.status(404).send('Admin index.html not found');
  }
}

// Маршруты для админки - отдаем index.html с версионированием
// ВАЖНО: эти маршруты должны быть ПОСЛЕ express.static, но ДО catch-all маршрута
app.get('/admin', serveAdminIndex);
app.get('/admin/*', serveAdminIndex);

// SPA маршрутизация - все остальные маршруты возвращают index.html
// Это позволяет React Router обрабатывать маршруты на клиенте
// ВАЖНО: этот маршрут должен быть последним, после всех статических файлов
app.get('*', (req, res) => {
  // Пропускаем API маршруты
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Пропускаем запросы к статическим файлам (по расширению)
  // Если файл не найден express.static, возвращаем 404, а не HTML
  const staticFileExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.map'];
  const hasStaticExtension = staticFileExtensions.some(ext => req.path.toLowerCase().endsWith(ext));
  
  if (hasStaticExtension) {
    return res.status(404).send('File not found');
  }
  
  // Статические файлы (assets, admin/assets) обрабатываются express.static выше
  // Если запрос дошел сюда и это не статический файл, значит это SPA маршрут
  
  // Для всех остальных маршрутов возвращаем index.html
  const indexPath = path.join(DIST_PATH, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else if (fs.existsSync(FRONTEND_PATH)) {
    // Fallback на frontend/index.html если dist не существует
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
  } else {
    res.status(404).send('Frontend not found');
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Конструктор графиков: http://localhost:${PORT}/`);
  console.log(`Админка: http://localhost:${PORT}/admin/graph_builder`);
  console.log(`API доступен по адресу http://localhost:${PORT}/api`);
  console.log('\nКонфигурация сервера:');
  console.log(`  PORT: ${PORT}`);
  console.log(`  FRONTEND_PATH: ${FRONTEND_PATH}`);
  console.log(`  DIST_PATH: ${DIST_PATH}`);
  console.log(`  ADMIN_PATH: ${ADMIN_PATH}`);
  console.log(`  PROJECT_ROOT: ${PROJECT_ROOT}`);
  console.log(`  DATA_DIR: ${DATA_DIR}`);
  console.log(`  COMPONENTS_DIR: ${COMPONENTS_DIR}`);
  console.log(`  UPLOADS_DIR: ${UPLOADS_DIR}`);
  
  // Проверяем существование директорий
  if (fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.ts'));
    console.log(`  DATA_DIR существует, файлов: ${files.length}`);
  } else {
    console.log(`  ⚠️  DATA_DIR не существует: ${DATA_DIR}`);
  }
  
  if (fs.existsSync(COMPONENTS_DIR)) {
    const files = fs.readdirSync(COMPONENTS_DIR);
    console.log(`  COMPONENTS_DIR существует, файлов: ${files.length}`);
  } else {
    console.log(`  ⚠️  COMPONENTS_DIR не существует: ${COMPONENTS_DIR}`);
  }
  
  // Логирование загруженных данных
  console.log(`\nЗагружено из файлов:`);
  console.log(`  Статусов графиков: ${Object.keys(chartStatuses).length}`);
  console.log(`  Конфигураций графиков: ${Object.keys(chartConfigs).length}`);
  console.log(`  Записей истории: ${chartHistory.length}`);
});

