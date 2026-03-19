import { ThemeProvider } from "./contexts/ThemeContext";
import { BrowserRouter, Routes, Route } from "react-router";

import { Checkin } from "./pages/checkin.jsx";
import { Dashboard } from "./pages/dashboard.jsx";
import { History } from "./pages/history.jsx";
import { Login } from "./pages/login.jsx";
import { Progress } from "./pages/progress.jsx";
import { Register } from "./pages/register.jsx";

import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="checkin" element={<Checkin />} />
          <Route path="history" element={<History />} />
          <Route path="progress" element={<Progress />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
