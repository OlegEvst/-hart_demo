const fs = require('fs');
const path = require('path');

// Пути к файлам
const BACKUP_CONFIGS_PATH = path.join(__dirname, '../../backup_from_server/storage/configs.json');
const TARGET_CONFIGS_PATH = path.join(__dirname, '../server/storage/configs.json');
const TARGET_STORAGE_DIR = path.join(__dirname, '../server/storage');

// Создаем директорию storage, если её нет
if (!fs.existsSync(TARGET_STORAGE_DIR)) {
  fs.mkdirSync(TARGET_STORAGE_DIR, { recursive: true });
  console.log('✅ Создана директория server/storage');
}

// Читаем конфигурации из backup
console.log('📖 Читаю конфигурации из backup...');
const backupConfigs = JSON.parse(fs.readFileSync(BACKUP_CONFIGS_PATH, 'utf-8'));

// Загружаем существующие конфигурации (если есть)
let existingConfigs = {};
if (fs.existsSync(TARGET_CONFIGS_PATH)) {
  try {
    existingConfigs = JSON.parse(fs.readFileSync(TARGET_CONFIGS_PATH, 'utf-8'));
    console.log(`📦 Найдено ${Object.keys(existingConfigs).length} существующих конфигураций`);
  } catch (e) {
    console.log('⚠️  Ошибка чтения существующих конфигураций, создаю новый файл');
  }
}

// Объединяем конфигурации (backup имеет приоритет, но сохраняем те, которых нет в backup)
const mergedConfigs = { ...existingConfigs, ...backupConfigs };

// Статистика
const backupCount = Object.keys(backupConfigs).length;
const existingCount = Object.keys(existingConfigs).length;
const mergedCount = Object.keys(mergedConfigs).length;
const updatedCount = Object.keys(backupConfigs).filter(key => existingConfigs.hasOwnProperty(key)).length;
const newCount = Object.keys(backupConfigs).filter(key => !existingConfigs.hasOwnProperty(key)).length;
const keptCount = Object.keys(existingConfigs).filter(key => !backupConfigs.hasOwnProperty(key)).length;

// Сохраняем объединенные конфигурации
fs.writeFileSync(
  TARGET_CONFIGS_PATH,
  JSON.stringify(mergedConfigs, null, 2),
  'utf-8'
);

console.log('\n✅ Импорт завершен!');
console.log(`   - Конфигураций в backup: ${backupCount}`);
console.log(`   - Конфигураций было: ${existingCount}`);
console.log(`   - Конфигураций стало: ${mergedCount}`);
console.log(`   - Обновлено из backup: ${updatedCount}`);
console.log(`   - Добавлено новых из backup: ${newCount}`);
console.log(`   - Сохранено существующих (не в backup): ${keptCount}`);
console.log(`\n📁 Файл сохранен: ${TARGET_CONFIGS_PATH}`);
