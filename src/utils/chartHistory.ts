export interface ChartHistoryEntry {
  chartId: string;
  resolution: '276x155' | '344x193' | '900x250' | '564x116';
  userName: string;
  timestamp: string;
  action: 'saved' | 'modified';
  changes?: Record<string, { before: any; after: any }>;
}

const HISTORY_STORAGE_KEY = 'chart_history';
const USER_NAME_KEY = 'chart_editor_user_name';
const USER_NAME_COOKIE_KEY = 'chart_editor_user_name';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

/**
 * Получает значение из cookie
 */
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Устанавливает cookie
 */
function setCookie(name: string, value: string, days: number = 365): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

/**
 * Сохраняет имя пользователя на сервере
 */
async function saveUserNameToServer(userName: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/user/name`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userName }),
    });
  } catch (error) {
    console.error('Ошибка сохранения имени пользователя на сервере:', error);
    // Не прерываем выполнение, если сервер недоступен
  }
}

/**
 * Получает имя пользователя или запрашивает его
 */
export async function getUserName(): Promise<string> {
  // Проверяем cookie
  const cookieName = getCookie(USER_NAME_COOKIE_KEY);
  if (cookieName) {
    return cookieName;
  }
  
  // Проверяем localStorage
  const stored = localStorage.getItem(USER_NAME_KEY);
  if (stored) {
    // Сохраняем в cookie для будущих сессий
    setCookie(USER_NAME_COOKIE_KEY, stored);
    return stored;
  }
  
  // Если имени нет ни в cookie, ни в localStorage, запрашиваем
  const userName = prompt('Введите ваше имя для истории изменений:');
  if (userName && userName.trim()) {
    const trimmedName = userName.trim();
    
    // Сохраняем в localStorage
    localStorage.setItem(USER_NAME_KEY, trimmedName);
    
    // Сохраняем в cookie
    setCookie(USER_NAME_COOKIE_KEY, trimmedName);
    
    // Сохраняем на сервере
    await saveUserNameToServer(trimmedName);
    
    return trimmedName;
  }
  
  return 'Неизвестный пользователь';
}

/**
 * Обновляет имя пользователя
 */
export async function setUserName(name: string): Promise<void> {
  const trimmedName = name.trim();
  localStorage.setItem(USER_NAME_KEY, trimmedName);
  setCookie(USER_NAME_COOKIE_KEY, trimmedName);
  await saveUserNameToServer(trimmedName);
}

/**
 * Получает имя пользователя без запроса
 */
export function getUserNameSilent(): string | null {
  // Проверяем cookie
  const cookieName = getCookie(USER_NAME_COOKIE_KEY);
  if (cookieName) {
    return cookieName;
  }
  
  // Проверяем localStorage
  return localStorage.getItem(USER_NAME_KEY);
}

/**
 * Сравнивает две конфигурации и возвращает различия
 */
export function compareConfigs(
  oldConfig: Record<string, any>,
  newConfig: Record<string, any>
): Record<string, { before: any; after: any }> {
  const changes: Record<string, { before: any; after: any }> = {};
  
  // Собираем все уникальные ключи из обеих конфигураций
  const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);
  
  for (const key of allKeys) {
    const oldValue = oldConfig[key];
    const newValue = newConfig[key];
    
    // Сравниваем значения (с учетом глубокого сравнения для объектов)
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = {
        before: oldValue,
        after: newValue,
      };
    }
  }
  
  return changes;
}

/**
 * Добавляет запись в историю изменений
 */
export async function addHistoryEntry(
  chartId: string,
  resolution: '276x155' | '344x193' | '900x250' | '564x116',
  action: 'saved' | 'modified' = 'saved',
  oldConfig?: Record<string, any>,
  newConfig?: Record<string, any>
): Promise<void> {
  const userName = await getUserName();
  
  // Вычисляем изменения, если предоставлены конфигурации
  let changes: Record<string, { before: any; after: any }> | undefined;
  if (oldConfig && newConfig) {
    changes = compareConfigs(oldConfig, newConfig);
    // Если изменений нет, не добавляем запись
    if (Object.keys(changes).length === 0) {
      return;
    }
  }
  
  const entry: ChartHistoryEntry = {
    chartId,
    resolution,
    userName,
    timestamp: new Date().toISOString(),
    action,
    changes,
  };
  
  try {
    // Сохраняем на сервере
    const response = await fetch(`${API_BASE_URL}/api/charts/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка сохранения истории на сервере: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Ошибка сохранения истории на сервере:', error);
    // Fallback на localStorage
    const history = getHistory();
    history.unshift(entry);
    const limitedHistory = history.slice(0, 100);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(limitedHistory));
  }
}

/**
 * Получает всю историю изменений
 */
export function getHistory(): ChartHistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Ошибка загрузки истории:', error);
    return [];
  }
}

/**
 * Получает историю для конкретного графика
 */
export function getChartHistory(chartId: string): ChartHistoryEntry[] {
  const history = getHistory();
  return history.filter(entry => entry.chartId === chartId);
}

/**
 * Получает историю для конкретного графика и разрешения
 */
export async function getChartHistoryByResolution(
  chartId: string,
  resolution: '276x155' | '344x193' | '900x250' | '564x116'
): Promise<ChartHistoryEntry[]> {
  // Не делаем запрос, если chartId пустой
  if (!chartId || chartId.trim() === '') {
    return [];
  }
  
  try {
    // Загружаем с сервера
    const response = await fetch(`${API_BASE_URL}/api/charts/${chartId}/history/${resolution}`);
    
    if (response.ok) {
      const data = await response.json();
      return data.history || [];
    } else {
      throw new Error(`Ошибка загрузки истории: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Ошибка загрузки истории с сервера:', error);
    // Fallback на localStorage
    const history = getHistory();
    return history.filter(
      entry => entry.chartId === chartId && entry.resolution === resolution
    );
  }
}

/**
 * Синхронная версия для обратной совместимости (использует localStorage)
 */
export function getChartHistoryByResolutionSync(
  chartId: string,
  resolution: '276x155' | '344x193' | '900x250' | '564x116'
): ChartHistoryEntry[] {
  const history = getHistory();
  return history.filter(
    entry => entry.chartId === chartId && entry.resolution === resolution
  );
}

/**
 * Форматирует дату для отображения (реальная дата и время)
 */
export function formatHistoryDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

