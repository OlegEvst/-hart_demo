const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const CONFIGS_PATH = path.join(PROJECT_ROOT, "server", "storage", "configs.json");
const BACKUP_DIR = path.join(PROJECT_ROOT, "style_backups");

function isoStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
}

function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return {};
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function convertConfigToBackupFormat(config) {
  // Преобразуем формат из config в формат бэкапа
  return {
    chartArea: {
      left: config.chartAreaLeft || "5%",
      right: config.chartAreaRight || "5%",
      top: config.chartAreaTop || "-10%",
      bottom: typeof config.chartAreaBottom === 'number' ? config.chartAreaBottom : parseInt(String(config.chartAreaBottom).replace('px', '')) || 50,
      height: config.chartAreaHeight || "98%",
      width: config.chartAreaWidth || "94%"
    },
    fontSize: {
      base: config.baseFontSize || 10,
      axis: config.axisFontSize || 10,
      legend: config.legendFontSize || 11
    },
    legend: {
      leftPadding: config.legendLeftPadding || "5%",
      marginTop: config.legendMarginTop || "0px"
    },
    annotations: {
      stemLength: config.annotationStemLength || 5,
      orangeAbove: config.orangeAnnotationAbove !== undefined ? config.orangeAnnotationAbove : true,
      greenAbove: config.greenAnnotationAbove !== undefined ? config.greenAnnotationAbove : false
    },
    vAxis: {
      min: config.vAxisMin !== undefined ? config.vAxisMin : 0,
      max: config.vAxisMax !== undefined ? config.vAxisMax : 5,
      gridlinesCount: config.vAxisGridlinesCount || 1
    },
    container: {
      paddingTop: config.containerPaddingTop || "1.4%",
      chartHeight: config.chartContainerHeight || "200px"
    }
  };
}

function main() {
  console.log("📦 Creating backup of all charts...");
  
  const configs = readJson(CONFIGS_PATH);
  
  // Группируем по chartId
  /** @type {Map<string, Map<string, any>>} */
  const chartsByChartId = new Map();
  
  for (const [key, entry] of Object.entries(configs)) {
    if (!entry || !entry.chartId || !entry.resolution || !entry.config) {
      continue;
    }
    
    const chartId = entry.chartId;
    const resolution = entry.resolution;
    
    if (!chartsByChartId.has(chartId)) {
      chartsByChartId.set(chartId, new Map());
    }
    
    const resolutions = chartsByChartId.get(chartId);
    resolutions.set(resolution, convertConfigToBackupFormat(entry.config));
  }
  
  // Преобразуем в финальный формат
  /** @type {Record<string, Record<string, any>>} */
  const backup = {};
  
  for (const [chartId, resolutions] of chartsByChartId.entries()) {
    backup[chartId] = {};
    for (const [resolution, config] of resolutions.entries()) {
      backup[chartId][resolution] = config;
    }
  }
  
  const backupPath = path.join(BACKUP_DIR, `all_charts_backup_${isoStamp()}.json`);
  writeJson(backupPath, backup);
  
  console.log("✅ Backup created successfully");
  console.log(`   - Total charts: ${chartsByChartId.size}`);
  console.log(`   - Backup saved: ${backupPath}`);
  
  // Статистика по разрешениям
  const resolutionCounts = { "276x155": 0, "344x193": 0, "900x250": 0, "564x116": 0 };
  for (const resolutions of chartsByChartId.values()) {
    for (const res of resolutions.keys()) {
      if (resolutionCounts[res] !== undefined) {
        resolutionCounts[res]++;
      }
    }
  }
  console.log("   - Resolution counts:");
  for (const [res, count] of Object.entries(resolutionCounts)) {
    console.log(`     ${res}: ${count} charts`);
  }
}

main();
