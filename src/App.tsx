import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./components/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { GraphBuilder } from "./components/graph_builder";
import { TeploChart } from "./components/TeploChart";

function App() {
  // В статической версии (production) исключаем админку
  const isStaticBuild = import.meta.env.PROD;
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Админка и авторизация - только в режиме разработки */}
        {!isStaticBuild && (
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
        {isStaticBuild && (
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
