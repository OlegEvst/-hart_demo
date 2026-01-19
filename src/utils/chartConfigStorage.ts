import type { ChartConfig } from './defaultChartConfigs';
import type { SavedChartConfig } from '../data/allChartsConfigs';

// Кэш для конфигураций (ключ: chartId_resolution)
const configCache: Record<string, SavedChartConfig> = {};

// Базовый URL API (из переменных окружения)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Загружает конфигурацию для графика с сервера или из configs.json
 * 
 * УПРОЩЕННАЯ ЛОГИКА:
 * - В статичной сборке (production без сервера) - ТОЛЬКО configs.json (скачанный при сборке)
 * - В development (с сервером) - ТОЛЬКО API endpoint
 */
export async function loadChartConfig(chartId: string, resolution: '276x155' | '344x193' | '900x250' | '564x116'): Promise<ChartConfig | null> {
  // Не делаем запрос, если chartId пустой
  if (!chartId || chartId.trim() === '') {
    return null;
  }
  
  // Нормализуем chartId: заменяем elektrops на electricps (как в TeploChart)
  let normalizedChartId = chartId.replace(/^elektrops/, 'electricps');
  
  // Нормализация для известных несоответствий URL и chartId (как в TeploChart)
  const urlToChartIdMap: Record<string, string> = {
    // Варианты с szao -> без szao (если данных нет для варианта с szao, используем данные без szao)
    'teplokotelnaya_voennyy_komissariat_szao_g_moskvy': 'teplokotelnaya_voennyy_komissariat_g_moskvy', // Используем данные без szao
    'teplokotelnaya_gbu_zhilischnik_rayona_filevskiy_park': 'teplokotelnaya_gbu_zhilischnik_rayona_fil_vskiy_park',
    // Варианты с kotel_naya -> kotelnaya
    'teplokotel_naya_voennyy_komissariat_g_moskvy': 'teplokotelnaya_voennyy_komissariat_g_moskvy',
    'teplokotel_naya_voennyy_komissariat_szao_g_moskvy': 'teplokotelnaya_voennyy_komissariat_g_moskvy', // Используем данные без szao
  };
  
  if (urlToChartIdMap[normalizedChartId]) {
    normalizedChartId = urlToChartIdMap[normalizedChartId];
  }
  
  const key = `${normalizedChartId}_${resolution}`;
  
  // УПРОЩЕННАЯ ЛОГИКА:
  // - В статичной сборке (production без сервера) - ТОЛЬКО configs.json (скачанный при сборке)
  // - В development (с сервером) - ТОЛЬКО API endpoint
  const isStaticBuild = import.meta.env.PROD && !API_BASE_URL;
  
  if (isStaticBuild) {
    // В статичной сборке используем ТОЛЬКО configs.json (скачанный перед сборкой)
    // Никаких API вызовов - всё уже в configs.json
    console.log(`[ConfigStorage] Статичная сборка: загрузка из configs.json для ${normalizedChartId}_${resolution}`);
    try {
      const configsResponse = await fetch('/configs.json', { cache: 'no-store' });
      if (configsResponse.ok) {
        const contentType = configsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const configsData = await configsResponse.json();
          const configKey = `${normalizedChartId}_${resolution}`;
          const savedConfig = configsData[configKey];
          if (savedConfig && savedConfig.config) {
            configCache[key] = savedConfig;
            console.log(`[ConfigStorage] ✓ Загружена конфигурация из configs.json: ${configKey}`);
            console.log(`[ConfigStorage] Значения vAxis: min=${savedConfig.config.vAxisMin}, max=${savedConfig.config.vAxisMax}`);
            return savedConfig.config;
          } else {
            console.warn(`[ConfigStorage] ⚠ Конфигурация не найдена в configs.json: ${configKey}`);
            // Показываем доступные ключи для отладки
            const availableKeys = Object.keys(configsData).filter(k => k.includes(normalizedChartId)).slice(0, 5);
            if (availableKeys.length > 0) {
              console.warn(`[ConfigStorage] Доступные ключи для ${normalizedChartId}:`, availableKeys);
            }
          }
        } else {
          console.warn(`[ConfigStorage] ⚠ configs.json вернул не JSON (${contentType})`);
        }
      } else {
        console.warn(`[ConfigStorage] ⚠ configs.json недоступен (HTTP ${configsResponse.status})`);
      }
    } catch (configsError) {
      console.warn('[ConfigStorage] ⚠ Ошибка загрузки configs.json:', configsError);
    }
    // Если configs.json недоступен, возвращаем null (будет использован дефолт)
    return null;
  }
  
  // В development - используем ТОЛЬКО API endpoint
  try {
    const apiUrl = `${API_BASE_URL}/api/charts/${normalizedChartId}/config/${resolution}`;
    const response = await fetch(apiUrl, {
      cache: 'no-store',
    });
    
    if (response.ok) {
      const result = await response.json();
      
      if (result === null) {
        return null;
      }
      
      if (result && result.config) {
        const savedConfig: SavedChartConfig = result;
        configCache[key] = savedConfig;
        return savedConfig.config;
      }
      
      return null;
    } else {
      console.warn(`[ConfigStorage] API вернул HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const apiUrlForLog = `${API_BASE_URL}/api/charts/${normalizedChartId}/config/${resolution}`;
    console.warn(`[ConfigStorage] ⚠ Ошибка запроса к API (${apiUrlForLog}):`, errorMessage);
    return null;
  }
}

/**
 * Синхронная версия для обратной совместимости (использует кэш)
 * ВАЖНО: Использует только кэш, не делает запросов к API
 */
export function loadChartConfigSync(chartId: string, resolution: '276x155' | '344x193' | '900x250' | '564x116'): ChartConfig | null {
  // Нормализуем chartId: заменяем elektrops на electricps (как в TeploChart)
  let normalizedChartId = chartId.replace(/^elektrops/, 'electricps');
  
  // Нормализация для известных несоответствий URL и chartId (как в TeploChart)
  const urlToChartIdMap: Record<string, string> = {
    'teplokotelnaya_voennyy_komissariat_szao_g_moskvy': 'teplokotelnaya_voennyy_komissariat_g_moskvy',
    'teplokotelnaya_gbu_zhilischnik_rayona_filevskiy_park': 'teplokotelnaya_gbu_zhilischnik_rayona_fil_vskiy_park',
    'teplokotel_naya_voennyy_komissariat_g_moskvy': 'teplokotelnaya_voennyy_komissariat_g_moskvy',
    'teplokotel_naya_voennyy_komissariat_szao_g_moskvy': 'teplokotelnaya_voennyy_komissariat_g_moskvy',
  };
  
  if (urlToChartIdMap[normalizedChartId]) {
    normalizedChartId = urlToChartIdMap[normalizedChartId];
  }
  
  const key = `${normalizedChartId}_${resolution}`;
  const cached = configCache[key];
  return cached?.config || null;
}

/**
 * Сохраняет конфигурацию графика на сервер
 */
export async function saveChartConfig(
  chartId: string,
  resolution: '276x155' | '344x193' | '900x250' | '564x116',
  config: ChartConfig
): Promise<void> {
  const apiUrl = `${API_BASE_URL}/api/charts/${chartId}/config/${resolution}`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ config }),
  });
  
  if (!response.ok) {
    throw new Error(`Ошибка сохранения конфигурации: HTTP ${response.status}`);
  }
  
  // Обновляем кэш после успешного сохранения
  const key = `${chartId}_${resolution}`;
  configCache[key] = {
    chartId,
    resolution,
    config,
    savedAt: new Date().toISOString(),
  };
}

/**
 * Извлекает chartId из пути (например, "/teplo_strogino" -> "teplo_strogino")
 */
export function getChartIdFromPath(path: string): string {
  // Убираем начальный и конечный слэш
  const cleaned = path.replace(/^\/+|\/+$/g, '');
  return cleaned || '';
}
