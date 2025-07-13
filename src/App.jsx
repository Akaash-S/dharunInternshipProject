import { Routes, Route } from "react-router-dom";
import AuthPage from "./custom/auth/Authentication";
import Layout from "./Layout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Chats from "./pages/Chats";
import Files from "./pages/Files";
import Exports from "./pages/Exports";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <>
      {/* Toast notifications always live and global */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            padding: "12px 16px",
            fontSize: "14px",
          },
          duration: 4000,
        }}
      />

      {/* Routing */}
      <Routes>
        <Route path="/" element={<AuthPage />} /> {/* Login page */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/chats" element={<Chats />} />
          <Route path="/files" element={<Files />} />
        </Route>
        <Route path="/exports" element={<Exports />} />
      </Routes>
    </>
  );
}

export default App;
