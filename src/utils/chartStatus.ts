export type ChartStatus = 'not_edited' | 'edited' | 'ready_for_publication';

const STATUS_STORAGE_KEY = 'chart_statuses';
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

export interface ChartStatusMap {
  [chartId: string]: ChartStatus;
}

// Кэш статусов для быстрого доступа
let statusCache: ChartStatusMap = {};
let statusCacheLoaded = false;

/**
 * Загружает все статусы с сервера
 */
export async function loadStatusesFromServer(): Promise<ChartStatusMap> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/charts/statuses`);
    if (!response.ok) {
      throw new Error(`Ошибка загрузки статусов: ${response.statusText}`);
    }
    const data = await response.json();
    statusCache = data.statuses || {};
    statusCacheLoaded = true;
    
    // Сохраняем в localStorage как fallback
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statusCache));
    
    return statusCache;
  } catch (error) {
    console.error('Ошибка загрузки статусов с сервера:', error);
    // Fallback на localStorage
    try {
      const stored = localStorage.getItem(STATUS_STORAGE_KEY);
      if (stored) {
        statusCache = JSON.parse(stored);
        return statusCache;
      }
    } catch (e) {
      console.error('Ошибка загрузки статусов из localStorage:', e);
    }
    return {};
  }
}

/**
 * Получает все статусы графиков
 */
export function getAllChartStatuses(): ChartStatusMap {
  // Если кэш не загружен, возвращаем из localStorage
  if (!statusCacheLoaded) {
    try {
      const stored = localStorage.getItem(STATUS_STORAGE_KEY);
      if (stored) {
        statusCache = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Ошибка загрузки статусов:', error);
    }
  }
  return statusCache;
}

/**
 * Получает статус конкретного графика
 */
export function getChartStatus(chartId: string): ChartStatus {
  const statuses = getAllChartStatuses();
  return statuses[chartId] || 'not_edited';
}

/**
 * Устанавливает статус графика
 */
export async function setChartStatus(chartId: string, status: ChartStatus): Promise<void> {
  try {
    // Отправляем на сервер
    const response = await fetch(`${API_BASE_URL}/api/charts/${chartId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка установки статуса: ${response.statusText}`);
    }
    
    // Обновляем кэш
    statusCache[chartId] = status;
    statusCacheLoaded = true;
    
    // Сохраняем в localStorage как fallback
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statusCache));
  } catch (error) {
    console.error('Ошибка установки статуса на сервере:', error);
    // Fallback на localStorage
    statusCache[chartId] = status;
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statusCache));
  }
}

/**
 * Получает цвет для статуса
 */
export function getStatusColor(status: ChartStatus): string {
  switch (status) {
    case 'not_edited':
      return '#FF3B30'; // Красный
    case 'edited':
      return '#FF9500'; // Оранжевый
    case 'ready_for_publication':
      return '#34C759'; // Зеленый
    default:
      return '#FF3B30';
  }
}

/**
 * Получает текст для статуса
 */
export function getStatusText(status: ChartStatus): string {
  switch (status) {
    case 'not_edited':
      return 'Не редактировался';
    case 'edited':
      return 'Редактировался';
    case 'ready_for_publication':
      return 'Готов к публикации';
    default:
      return 'Не редактировался';
  }
}

/**
 * Получает цветной индикатор для статуса (Unicode символ)
 */
export function getStatusIndicator(status: ChartStatus): string {
  switch (status) {
    case 'not_edited':
      return '🔴'; // Красный кружок
    case 'edited':
      return '🟠'; // Оранжевый кружок
    case 'ready_for_publication':
      return '🟢'; // Зеленый кружок
    default:
      return '🔴';
  }
}

/**
 * Запускает сборку проекта
 */
export async function triggerBuild(): Promise<boolean> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');
    const response = await fetch(`${apiUrl}/api/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка сборки: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка запуска сборки:', error);
    // Если API недоступен, просто возвращаем true (статус обновлен)
    return true;
  }
}
