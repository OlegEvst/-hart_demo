import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

// Учетные данные
const VALID_USERNAME = "user";
const VALID_PASSWORD = "pass123";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // Простая проверка логина и пароля
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      // Сохраняем статус авторизации в localStorage
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("username", username);
      
      // Перенаправляем на главную страницу или на страницу, с которой пришли
      const from = new URLSearchParams(window.location.search).get("from") || "/admin/graph_builder";
      // Если путь не начинается с /admin, добавляем префикс
      const targetPath = from.startsWith("/admin") ? from : `/admin${from.startsWith("/") ? from : `/${from}`}`;
      navigate(targetPath, { replace: true });
    } else {
      setError("Неверный логин или пароль");
    }
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5F5F7",
        fontFamily: "'Golos Text', sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "30px",
            textAlign: "center",
            fontSize: "24px",
            fontWeight: "bold",
            color: "#1C1C1E",
          }}
        >
          Вход в систему
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#1C1C1E",
              }}
            >
              Логин:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #E5E5EA",
                borderRadius: "8px",
                boxSizing: "border-box",
                fontFamily: "'Golos Text', sans-serif",
              }}
              placeholder="Введите логин"
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#1C1C1E",
              }}
            >
              Пароль:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #E5E5EA",
                borderRadius: "8px",
                boxSizing: "border-box",
                fontFamily: "'Golos Text', sans-serif",
              }}
              placeholder="Введите пароль"
              required
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px",
                backgroundColor: "#FFEBEE",
                color: "#C62828",
                borderRadius: "8px",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "16px",
              fontWeight: "bold",
              color: "#FFFFFF",
              backgroundColor: "#007AFF",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "'Golos Text', sans-serif",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#0051D5";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#007AFF";
            }}
          >
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}
