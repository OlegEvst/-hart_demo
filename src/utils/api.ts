/**
 * API утилиты для загрузки данных с сервера
 */

// В production используем относительные пути (Nginx проксирует /api на localhost:3001)
// В development используем localhost:3001 или значение из VITE_API_URL
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

export interface ChartInfo {
  id: string;
  name: string;
  path: string;
  dataType: 'balance' | 'reserve' | 'modeling' | 'modelingReserve';
  dataKey?: string;
}

/**
 * Загружает список всех графиков с сервера
 */
export async function fetchChartsList(): Promise<ChartInfo[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/charts/list`);
    
    if (!response.ok) {
      throw new Error(`Ошибка загрузки списка графиков: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.charts || [];
  } catch (error) {
    console.error('Ошибка загрузки списка графиков:', error);
    // Возвращаем пустой массив в случае ошибки
    return [];
  }
}

export interface ChartDataResponse {
  chartId: string;
  dataVarName: string;
  data: Array<{
    year: string;
    total_net?: number;
    load?: number;
    reserve?: number;
    value?: number;
  }>;
}

/**
 * Загружает данные графика с сервера
 */
export async function fetchChartData(chartId: string): Promise<ChartDataResponse> {
  const response = await fetch(`${API_BASE_URL}/api/charts/${chartId}/data`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Данные для графика ${chartId} не найдены на сервере`);
    }
    throw new Error(`Ошибка загрузки данных: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Создает dataLoader функцию для загрузки данных с сервера
 */
export function createServerDataLoader(chartId: string, dataKey?: string) {
  return async () => {
    try {
      const response = await fetchChartData(chartId);
      
      // Преобразуем ответ сервера в формат, который ожидает клиент
      const module: any = {
        [response.dataVarName]: response.data,
        default: response.data,
      };
      
      // Если указан dataKey, добавляем его тоже
      if (dataKey && dataKey !== response.dataVarName) {
        module[dataKey] = response.data;
      }
      
      // Добавляем все возможные варианты ключей для совместимости
      const possibleKeys = [
        response.dataVarName,
        dataKey,
        chartId + 'Data',
        chartId.replace(/_/g, '') + 'Data',
      ].filter(Boolean);
      
      for (const key of possibleKeys) {
        if (key && !module[key]) {
          module[key] = response.data;
        }
      }
      
      return module;
    } catch (error) {
      console.error(`[API] Ошибка загрузки данных для ${chartId}:`, error);
      // Возвращаем пустой модуль в случае ошибки
      return {
        default: [],
      };
    }
  };
}

/**
 * Создает dataLoader функцию для статической загрузки данных (для production сборки)
 * Использует динамический импорт файлов данных
 */
export function createStaticDataLoader(chartId: string, dataKey: string) {
  return async () => {
    try {
      // Определяем путь к файлу данных на основе chartId
      const fileName = chartId;
      
      // Пробуем импортировать файл данных
      let module;
      try {
        // Используем динамический импорт с правильным путем
        module = await import(`../data/${fileName}.ts`);
      } catch (importError: any) {
        console.error(`[Static] Ошибка импорта файла ${fileName}.ts:`, importError);
        // В production сборке не должно быть fallback на сервер
        // Возвращаем пустой модуль, чтобы не ломать приложение
        return {
          default: [],
          [dataKey]: [],
        };
      }
      
      // Ищем данные в модуле по dataKey или используем первый экспорт
      let data = null;
      
      // Сначала пробуем найти по dataKey
      if (dataKey && module[dataKey]) {
        data = module[dataKey];
      } else if (module.default) {
        data = module.default;
      } else {
        // Ищем первый массив в модуле
        const keys = Object.keys(module);
        for (const key of keys) {
          const value = module[key];
          if (Array.isArray(value) && value.length > 0) {
            data = value;
            break;
          }
        }
      }
      
      if (!data || !Array.isArray(data)) {
        console.error(`[Static] Данные не найдены в модуле ${fileName}.ts. Ключи модуля:`, Object.keys(module));
        return {
          default: [],
          [dataKey]: [],
        };
      }
      
      // Создаем объект модуля с нужными ключами
      const result: any = {
        default: data,
      };
      
      // Добавляем dataKey
      if (dataKey) {
        result[dataKey] = data;
      }
      
      // Добавляем все экспорты из модуля для совместимости
      Object.keys(module).forEach(key => {
        if (!result[key]) {
          result[key] = module[key];
        }
      });
      
      return result;
    } catch (error) {
      console.error(`[Static] Ошибка загрузки данных для ${chartId}:`, error);
      return {
        default: [],
        [dataKey]: [],
      };
    }
  };
}
