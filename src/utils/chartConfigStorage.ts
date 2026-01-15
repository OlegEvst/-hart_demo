import type { ChartConfig } from '../components/graph_builder';

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
  
  const key = `${chartId}_${resolution}`;
  
  try {
    // Пробуем загрузить с сервера
    const response = await fetch(`${API_BASE_URL}/api/charts/${chartId}/config/${resolution}`);
    
    if (response.ok) {
      const result = await response.json();
      
      // Если сервер вернул null, конфигурации нет
      if (result === null) {
        // Пробуем загрузить из localStorage
        const localStorageKey = `${STORAGE_KEY_PREFIX}${chartId}_${resolution}`;
        const saved = localStorage.getItem(localStorageKey);
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
      // Обрабатываем другие ошибки (не 404, так как сервер теперь всегда возвращает 200)
      // Fallback на localStorage
      const localStorageKey = `${STORAGE_KEY_PREFIX}${chartId}_${resolution}`;
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        const savedConfig: SavedChartConfig = JSON.parse(saved);
        configCache[key] = savedConfig;
        return savedConfig.config;
      }
      return null;
    }
  } catch (error) {
    // Тихая обработка ошибок - не логируем в консоль, если это не критическая ошибка
    // Fallback на localStorage
    const localStorageKey = `${STORAGE_KEY_PREFIX}${chartId}_${resolution}`;
    try {
      const saved = localStorage.getItem(localStorageKey);
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
  const key = `${chartId}_${resolution}`;
  const cached = configCache[key];
  if (cached) {
    return cached.config;
  }
  
  // Fallback на localStorage
  const localStorageKey = `${STORAGE_KEY_PREFIX}${chartId}_${resolution}`;
  try {
    const saved = localStorage.getItem(localStorageKey);
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

