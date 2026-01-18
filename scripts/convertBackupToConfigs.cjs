const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BACKUP_PATH = path.join(PROJECT_ROOT, 'style_backups', 'all_charts_backup_2026-01-18T18-48-33.json');
const CONFIGS_PATH = path.join(PROJECT_ROOT, 'server', 'storage', 'configs.json');

function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Ошибка чтения ${filePath}:`, err.message);
    return null;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function convertBackupToConfigs(backup) {
  const configs = {};
  
  // Формат бэкапа: { chartId: { resolution: { config } } }
  // Формат configs.json: { "chartId_resolution": { chartId, resolution, config, savedAt } }
  
  for (const [chartId, resolutions] of Object.entries(backup)) {
    for (const [resolution, configData] of Object.entries(resolutions)) {
      const key = `${chartId}_${resolution}`;
      
      // Преобразуем формат из бэкапа в формат configs.json
      const config = {
        chartAreaLeft: configData.chartArea?.left || '5%',
        chartAreaRight: configData.chartArea?.right || '5%',
        chartAreaTop: configData.chartArea?.top || '-10%',
        chartAreaBottom: typeof configData.chartArea?.bottom === 'number' 
          ? configData.chartArea.bottom 
          : parseInt(String(configData.chartArea?.bottom || '50').replace('px', '')) || 50,
        chartAreaHeight: configData.chartArea?.height || '98%',
        chartAreaWidth: configData.chartArea?.width || '94%',
        baseFontSize: configData.fontSize?.base || 10,
        axisFontSize: configData.fontSize?.axis || 10,
        legendFontSize: configData.fontSize?.legend || 11,
        legendLeftPadding: configData.legend?.leftPadding || '5%',
        legendMarginTop: configData.legend?.marginTop || '0px',
        annotationStemLength: configData.annotations?.stemLength || 5,
        orangeAnnotationAbove: configData.annotations?.orangeAbove !== undefined 
          ? configData.annotations.orangeAbove 
          : true,
        greenAnnotationAbove: configData.annotations?.greenAbove !== undefined 
          ? configData.annotations.greenAbove 
          : false,
        vAxisMin: configData.vAxis?.min !== undefined ? configData.vAxis.min : 0,
        vAxisMax: configData.vAxis?.max !== undefined ? configData.vAxis.max : 5,
        vAxisGridlinesCount: configData.vAxis?.gridlinesCount || 1,
        containerPaddingTop: configData.container?.paddingTop || '1.4%',
        chartContainerHeight: configData.container?.chartHeight || '200px',
      };
      
      // Определяем размеры на основе разрешения
      const dimensions = {
        '276x155': { w: 276, h: 155 },
        '344x193': { w: 344, h: 193 },
        '900x250': { w: 900, h: 250 },
        '564x116': { w: 564, h: 116 }
      };
      
      const dims = dimensions[resolution] || { w: 900, h: 250 };
      
      configs[key] = {
        chartId,
        resolution,
        config: {
          resolution,
          customWidth: dims.w,
          customHeight: dims.h,
          ...config
        },
        savedAt: new Date().toISOString()
      };
    }
  }
  
  return configs;
}

function main() {
  console.log('🔄 Конвертация бэкапа в configs.json...');
  
  const backup = readJson(BACKUP_PATH);
  if (!backup) {
    console.error('❌ Не удалось прочитать бэкап');
    process.exit(1);
  }
  
  console.log(`📦 Загружен бэкап: ${Object.keys(backup).length} графиков`);
  
  // Создаем бэкап текущего configs.json
  const currentConfigsPath = CONFIGS_PATH;
  if (fs.existsSync(currentConfigsPath)) {
    const backupPath = path.join(PROJECT_ROOT, 'style_backups', `configs_before_restore_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.json`);
    fs.copyFileSync(currentConfigsPath, backupPath);
    console.log(`💾 Создан бэкап текущего configs.json: ${backupPath}`);
  }
  
  // Конвертируем бэкап в формат configs.json
  const configs = convertBackupToConfigs(backup);
  
  // Сохраняем
  writeJson(CONFIGS_PATH, configs);
  
  console.log('✅ Конвертация завершена');
  console.log(`   - Создано записей: ${Object.keys(configs).length}`);
  console.log(`   - Сохранено в: ${CONFIGS_PATH}`);
  
  // Статистика по разрешениям
  const resolutionCounts = { '276x155': 0, '344x193': 0, '900x250': 0, '564x116': 0 };
  for (const key of Object.keys(configs)) {
    const res = configs[key].resolution;
    if (resolutionCounts[res] !== undefined) {
      resolutionCounts[res]++;
    }
  }
  console.log('   - По разрешениям:');
  for (const [res, count] of Object.entries(resolutionCounts)) {
    console.log(`     ${res}: ${count} записей`);
  }
}

main();
