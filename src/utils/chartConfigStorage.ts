import type { ChartConfig } from './defaultChartConfigs';
// ЕДИНСТВЕННЫЙ ИСТОЧНИК ДАННЫХ: API endpoint /api/charts/:chartId/config/:resolution
// Который читает из chartConfigs в памяти сервера (server/storage/configs.json)
// Все компоненты (админка, TeploChart, статичная сборка) используют один и тот же источник

const STORAGE_KEY_PREFIX = 'chart_config_';
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

export interface SavedChartConfig {
  chartId: string;
  resolution: '276x155' | '344x193' | '900x250' | '564x116';
  config: ChartConfig;
  savedAt: string;
}

/**
 * Сохраняет конфигурацию графика для конкретного разрешения
 */
export async function saveChartConfig(chartId: string, resolution: '276x155' | '344x193' | '900x250' | '564x116', config: ChartConfig): Promise<void> {
  const key = `${STORAGE_KEY_PREFIX}${chartId}_${resolution}`;
  const savedConfig: SavedChartConfig = {
    chartId,
    resolution,
    config,
    savedAt: new Date().toISOString(),
  };
  
  try {
    // Сохраняем на сервере
    const response = await fetch(`${API_BASE_URL}/api/charts/${chartId}/config/${resolution}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка сохранения конфигурации на сервере: ${response.statusText}`);
    }
    
    // Также сохраняем в localStorage как fallback
    localStorage.setItem(key, JSON.stringify(savedConfig));
    console.log(`Конфигурация сохранена для ${chartId} (${resolution})`);
  } catch (error) {
    console.error('Ошибка сохранения конфигурации:', error);
    // Fallback на localStorage
    try {
      localStorage.setItem(key, JSON.stringify(savedConfig));
    } catch (e) {
      console.error('Ошибка сохранения в localStorage:', e);
    }
  }
}

// Кэш конфигураций для быстрого доступа
let configCache: Record<string, SavedChartConfig> = {};

/**
 * Загружает сохраненную конфигурацию графика для конкретного разрешения
 */
export async function loadChartConfig(chartId: string, resolution: '276x155' | '344x193' | '900x250' | '564x116'): Promise<ChartConfig | null> {
  // Не делаем запрос, если chartId пустой
  if (!chartId || chartId.trim() === '') {
    return null;
  }
  
  // Нормализуем chartId: заменяем elektrops на electricps (как в TeploChart)
  const normalizedChartId = chartId.replace(/^elektrops/, 'electricps');
  
  const key = `${normalizedChartId}_${resolution}`;
  
  try {
    // ЕДИНСТВЕННЫЙ ИСТОЧНИК: API endpoint (как в админке)
    // Всегда используем API, который читает из chartConfigs в памяти сервера
    const response = await fetch(`${API_BASE_URL}/api/charts/${normalizedChartId}/config/${resolution}`, {
      cache: 'no-store', // Не кэшируем, всегда загружаем актуальную версию
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Если сервер вернул null, конфигурации нет - используем дефолт
      if (result === null) {
        return null;
      }
      
      // Если сервер вернул конфигурацию
      if (result && result.config) {
        const savedConfig: SavedChartConfig = result;
        configCache[key] = savedConfig;
        return savedConfig.config;
      }
      
      return null;
    } else {
      // Если API недоступен, возвращаем null (будет использован дефолт)
      // Не используем localStorage или статический configs.json - только API
      console.warn(`[ConfigStorage] API недоступен (HTTP ${response.status}), будет использован дефолт`);
      return null;
    }
  } catch (error) {
    // Если API недоступен, возвращаем null (будет использован дефолт)
    // Не используем localStorage или статический configs.json - только API
    console.warn(`[ConfigStorage] Ошибка загрузки конфигурации через API:`, error);
    return null;
  }
}

/**
 * Синхронная версия для обратной совместимости (использует кэш)
 * ВАЖНО: Использует только кэш, не делает запросов к API
 */
export function loadChartConfigSync(chartId: string, resolution: '276x155' | '344x193' | '900x250' | '564x116'): ChartConfig | null {
  // Нормализуем chartId: заменяем elektrops на electricps
  const normalizedChartId = chartId.replace(/^elektrops/, 'electricps');
  const key = `${normalizedChartId}_${resolution}`;
  
  // Используем только кэш (данные, загруженные через API)
  const cached = configCache[key];
  if (cached) {
    return cached.config;
  }
  
  // Если нет в кэше, возвращаем null (будет использован дефолт)
  // Не используем localStorage - только API через loadChartConfig
  return null;
}

/**
 * Удаляет сохраненную конфигурацию
 */
export function deleteChartConfig(chartId: string, resolution: '276x155' | '344x193' | '900x250' | '564x116'): void {
  const key = `${STORAGE_KEY_PREFIX}${chartId}_${resolution}`;
  localStorage.removeItem(key);
}

/**
 * Проверяет, есть ли сохраненная конфигурация
 */
export function hasSavedConfig(chartId: string, resolution: '276x155' | '344x193' | '900x250' | '564x116'): boolean {
  const key = `${STORAGE_KEY_PREFIX}${chartId}_${resolution}`;
  return localStorage.getItem(key) !== null;
}

/**
 * Получает ID графика из пути
 */
export function getChartIdFromPath(path: string): string {
  // Убираем начальный слэш и возвращаем как есть
  return path.replace(/^\//, '');
}

