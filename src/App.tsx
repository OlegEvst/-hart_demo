import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./components/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { GraphBuilder } from "./components/graph_builder";
import { TeploChart } from "./components/TeploChart";

function App() {
  // Админка доступна всегда - на сервере и в development
  // В production на сервере всегда показываем админку (API доступен)
  // ВАЖНО: Админка всегда включена, отключена только в чисто статической сборке (без API вообще)
  // Но поскольку у нас есть сервер, админка всегда доступна
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Админка и авторизация - доступна всегда на сервере */}
        {(
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

        {/* Графики тепла и электричества - публичные маршруты без префиксов (должен быть последним) */}
        {/* Убрали ProtectedRoute для статической версии - графики доступны напрямую */}
        <Route path="/:chartId" element={<TeploChart />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
