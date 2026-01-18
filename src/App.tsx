import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./components/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { GraphBuilder } from "./components/graph_builder";
import { TeploChart } from "./components/TeploChart";

function App() {
  // Админка доступна всегда (и в development, и в production на сервере)
  // Проверяем, не статическая ли это сборка (без сервера)
  const isStaticOnly = import.meta.env.PROD && !window.location.hostname.includes('localhost') && !window.location.port;
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Админка и авторизация - доступна на сервере */}
        {!isStaticOnly && (
          <>
            <Route path="/admin/login" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<ProtectedRoute><Navigate to="/admin/graph_builder" replace /></ProtectedRoute>} />
            <Route path="/admin/" element={<ProtectedRoute><Navigate to="/admin/graph_builder" replace /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Navigate to="/admin/graph_builder" replace /></ProtectedRoute>} />
            <Route path="/admin/graph_builder" element={<ProtectedRoute><GraphBuilder /></ProtectedRoute>} />
            <Route path="/graph_builder" element={<ProtectedRoute><Navigate to="/admin/graph_builder" replace /></ProtectedRoute>} />
          </>
        )}
        
        {/* В статической версии корневой маршрут показывает 404 для несуществующих графиков */}
        {isStaticOnly && (
          <Route path="/" element={<Navigate to="/404" replace />} />
        )}

        {/* Графики тепла и электричества - публичные маршруты без префиксов (должен быть последним) */}
        {/* Убрали ProtectedRoute для статической версии - графики доступны напрямую */}
        <Route path="/:chartId" element={<TeploChart />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
