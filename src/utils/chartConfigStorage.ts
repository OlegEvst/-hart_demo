import type { ChartConfig } from './defaultChartConfigs';
// Единый источник данных: configs.json
// В development: загружается через API (который читает server/storage/configs.json)
// В production: загружается напрямую из /configs.json (который включен в архив)

const STORAGE_KEY_PREFIX = 'chart_config_';
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

// Единый источник конфигураций - configs.json
let configsJsonData: Record<string, any> | null = null;
let configsJsonLoaded = false;
let configsJsonLoading = false;

// Загружаем configs.json один раз при старте в production
async function loadConfigsJson(): Promise<void> {
  if (configsJsonLoaded || configsJsonLoading || !import.meta.env.PROD) {
    return;
  }
  
  configsJsonLoading = true;
  try {
    // В production используем абсолютный путь с текущим origin
    const configsUrl = import.meta.env.PROD 
      ? `${window.location.origin}/configs.json`
      : '/configs.json';
    
    const response = await fetch(configsUrl, {
      cache: 'no-store', // Не кэшируем, всегда загружаем актуальную версию
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        configsJsonData = data;
        configsJsonLoaded = true;
        const count = Object.keys(data).length;
        console.log(`[ConfigStorage] ✓ Загружен configs.json (единый источник данных), записей: ${count}`);
      } else {
        // Если получили не JSON (например, HTML), значит endpoint не работает
        console.warn(`[ConfigStorage] ⚠ configs.json вернул не JSON (${contentType}), используем API для загрузки конфигураций`);
        configsJsonLoaded = true; // Помечаем как загруженный, чтобы не пытаться снова
        configsJsonData = null; // Не используем невалидные данные
      }
    } else {
      // В production, если configs.json недоступен, это нормально - используем API
      if (import.meta.env.PROD) {
        console.log(`[ConfigStorage] configs.json недоступен (HTTP ${response.status}), используем API`);
      } else {
        console.warn(`[ConfigStorage] ⚠ configs.json не найден (HTTP ${response.status}), будут использоваться дефолтные конфигурации`);
      }
      configsJsonLoaded = true; // Помечаем как загруженный, чтобы не пытаться снова
    }
  } catch (error) {
    // В production это не критично - используем API
    if (import.meta.env.PROD) {
      console.log('[ConfigStorage] configs.json недоступен, используем API для загрузки конфигураций');
    } else {
      console.warn('[ConfigStorage] ⚠ Ошибка загрузки configs.json:', error);
    }
    configsJsonLoaded = true; // Помечаем как загруженный, чтобы не пытаться снова
  } finally {
    configsJsonLoading = false;
  }
}

// Загружаем при инициализации модуля в production
// Важно: загружаем синхронно при первом обращении, чтобы configs.json был доступен сразу
if (import.meta.env.PROD) {
  // Загружаем сразу при инициализации модуля
  loadConfigsJson().catch(err => {
    console.warn('[ConfigStorage] Ошибка предзагрузки configs.json:', err);
  });
}

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
    // В production на сервере: используем API (как и в development)
    // Статический configs.json используется только в чисто статической сборке (без сервера)
    // Но у нас есть сервер, поэтому используем API
    if (import.meta.env.PROD) {
      // Проверяем, есть ли доступ к API (на сервере API доступен)
      // Пробуем загрузить через API
      try {
        const response = await fetch(`${API_BASE_URL}/api/charts/${normalizedChartId}/config/${resolution}`);
        
        if (response.ok) {
          const result = await response.json();
          
          // Если сервер вернул конфигурацию
          if (result && result.config) {
            const savedConfig: SavedChartConfig = result;
            configCache[key] = savedConfig;
            return savedConfig.config;
          }
        }
      } catch (apiError) {
        // Если API недоступен, пробуем статический configs.json
        // (для чисто статической сборки)
        if (!configsJsonLoaded && !configsJsonLoading) {
          await loadConfigsJson();
        }
        
        let attempts = 0;
        while (configsJsonLoading && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (configsJsonData) {
          const configKey = `${normalizedChartId}_${resolution}`;
          const savedConfig = configsJsonData[configKey];
          if (savedConfig && savedConfig.config) {
            configCache[key] = savedConfig;
            return savedConfig.config;
          }
        }
      }
      
      // Если ни API, ни configs.json не доступны, возвращаем null (будет использован дефолт)
      return null;
    }
    
    // В development: загружаем через API (который читает server/storage/configs.json)
    const response = await fetch(`${API_BASE_URL}/api/charts/${normalizedChartId}/config/${resolution}`);
    
    if (response.ok) {
      const result = await response.json();
      
      // Если сервер вернул null, конфигурации нет
      if (result === null) {
        // Fallback на localStorage
        const localStorageKey = `${STORAGE_KEY_PREFIX}${normalizedChartId}_${resolution}`;
        let saved = localStorage.getItem(localStorageKey);
        if (!saved && normalizedChartId !== chartId) {
          saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${chartId}_${resolution}`);
        }
        if (saved) {
          const savedConfig: SavedChartConfig = JSON.parse(saved);
          configCache[key] = savedConfig;
          return savedConfig.config;
        }
        return null;
      }
      
      // Если сервер вернул конфигурацию
      const savedConfig: SavedChartConfig = result;
      configCache[key] = savedConfig;
      return savedConfig.config;
    } else {
      // Fallback на localStorage
      const localStorageKey = `${STORAGE_KEY_PREFIX}${normalizedChartId}_${resolution}`;
      let saved = localStorage.getItem(localStorageKey);
      if (!saved && normalizedChartId !== chartId) {
        saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${chartId}_${resolution}`);
      }
      if (saved) {
        const savedConfig: SavedChartConfig = JSON.parse(saved);
        configCache[key] = savedConfig;
        return savedConfig.config;
      }
      return null;
    }
  } catch (error) {
    // Fallback на localStorage
    const localStorageKey = `${STORAGE_KEY_PREFIX}${normalizedChartId}_${resolution}`;
    try {
      let saved = localStorage.getItem(localStorageKey);
      if (!saved && normalizedChartId !== chartId) {
        saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${chartId}_${resolution}`);
      }
      if (saved) {
        const savedConfig: SavedChartConfig = JSON.parse(saved);
        configCache[key] = savedConfig;
        return savedConfig.config;
      }
    } catch (e) {
      // Игнорируем ошибки localStorage
    }
    return null;
  }
}

/**
 * Синхронная версия для обратной совместимости (использует кэш)
 */
export function loadChartConfigSync(chartId: string, resolution: '276x155' | '344x193' | '900x250' | '564x116'): ChartConfig | null {
  // Нормализуем chartId: заменяем elektrops на electricps
  const normalizedChartId = chartId.replace(/^elektrops/, 'electricps');
  const key = `${normalizedChartId}_${resolution}`;
  
  const cached = configCache[key];
  if (cached) {
    return cached.config;
  }
  
  // Fallback на localStorage (с нормализованным ID)
  const localStorageKey = `${STORAGE_KEY_PREFIX}${normalizedChartId}_${resolution}`;
  try {
    let saved = localStorage.getItem(localStorageKey);
    if (!saved && normalizedChartId !== chartId) {
      saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${chartId}_${resolution}`);
    }
    if (saved) {
      const savedConfig: SavedChartConfig = JSON.parse(saved);
      configCache[key] = savedConfig;
      return savedConfig.config;
    }
  } catch (e) {
    console.error('Ошибка загрузки из localStorage:', e);
  }
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

