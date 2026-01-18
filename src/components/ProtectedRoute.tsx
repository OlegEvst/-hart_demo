import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../utils/auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Компонент для защиты маршрутов - требует авторизации
 * В статической версии (production) пропускает все запросы без проверки
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // В production на сервере всегда требуем авторизации (API доступен)
  // Статическая сборка определяется по отсутствию API
  const hasServerAPI = typeof window !== 'undefined' && (
    !import.meta.env.PROD || 
    window.location.hostname.includes('localhost') || 
    window.location.port !== ''
  );
  
  // В статической версии (без сервера) не требуем авторизации
  if (!hasServerAPI) {
    return <>{children}</>;
  }

  const location = useLocation();
  const authenticated = isAuthenticated();

  if (!authenticated) {
    // Сохраняем текущий путь для редиректа после авторизации
    const loginPath = location.pathname.startsWith("/admin") ? "/admin/login" : "/login";
    return <Navigate to={`${loginPath}?from=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}
