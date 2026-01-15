/**
 * Утилиты для работы с авторизацией
 */

/**
 * Проверяет, авторизован ли пользователь
 */
export function isAuthenticated(): boolean {
  return localStorage.getItem("isAuthenticated") === "true";
}

/**
 * Выход из системы
 */
export function logout(): void {
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("username");
  window.location.href = "/login";
}

/**
 * Получает имя текущего пользователя
 */
export function getUsername(): string | null {
  return localStorage.getItem("username");
}
