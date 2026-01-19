import type { ChartConfig } from './defaultChartConfigs';
// ЕДИНСТВЕННЫЙ ИСТОЧНИК ДАННЫХ: API endpoint /api/charts/:chartId/config/:resolution
// Который читает из chartConfigs в памяти сервера (server/storage/configs.json)
// Все компоненты (админка, TeploChart, статичная сборка) используют один и тот же источник

const STORAGE_KEY_PREFIX = 'chart_config_';
// ВАЖНО: В production всегда используем пустой API_BASE_URL (относительный путь)
// Это позволяет использовать API если сервер доступен, или configs.json если нет
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
    // Всегда пробуем API сначала, который читает из chartConfigs в памяти сервера
    // Если API недоступен (чисто статическая сборка), используем configs.json
    const apiUrl = `${API_BASE_URL}/api/charts/${normalizedChartId}/config/${resolution}`;
    const response = await fetch(apiUrl, {
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
      // Если API вернул ошибку (не 200), пробуем configs.json из архива
      // configs.json синхронизирован с памятью сервера при создании архива
      console.log(`[ConfigStorage] API вернул HTTP ${response.status}, пробуем configs.json`);
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
      
      // Если ни API, ни configs.json не доступны, возвращаем null (будет использован дефолт)
      return null;
    }
  } catch (error) {
    // Если произошла ошибка сети при запросе к API, пробуем configs.json
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`[ConfigStorage] ⚠ Ошибка запроса к API (${apiUrl}):`, errorMessage);
    
    // Если ошибка "Unexpected token '<'" - это значит сервер вернул HTML вместо JSON
    // Это может быть из-за неправильного URL или проблем с роутингом
    if (errorMessage.includes("Unexpected token '<'")) {
      console.warn(`[ConfigStorage] ⚠ Сервер вернул HTML вместо JSON для ${apiUrl}, пробуем configs.json`);
    }
    
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
            console.log(`[ConfigStorage] ✓ Загружена конфигурация из configs.json (ошибка API): ${configKey}`);
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
    
    // Если ни API, ни configs.json не доступны, возвращаем null (будет использован дефолт)
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

