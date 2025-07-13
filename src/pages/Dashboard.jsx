import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, LogOut, Folder, Settings, Users } from "lucide-react";

function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      navigate("/");
    } else {
      setUser(storedUser);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken")
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">🧠 TeamsX Dashboard</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 hover:text-white border border-red-600 hover:bg-red-600 rounded-md transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          onClick={() => navigate("/chats")}
          className="cursor-pointer bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all p-6"
        >
          <div className="flex items-center gap-3 mb-2 text-blue-600">
            <MessageSquare className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Chat Rooms</h3>
          </div>
          <p className="text-sm text-gray-600">Collaborate with your team instantly.</p>
        </div>

        <div
          onClick={() => navigate("/files")}
          className="cursor-pointer bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all p-6"
        >
          <div className="flex items-center gap-3 mb-2 text-green-600">
            <Folder className="w-6 h-6" />
            <h3 className="text-lg font-semibold">File Manager</h3>
          </div>
          <p className="text-sm text-gray-600">Access and organize shared files.</p>
        </div>

        <div
          onClick={() => navigate("/settings")}
          className="cursor-pointer bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all p-6"
        >
          <div className="flex items-center gap-3 mb-2 text-yellow-600">
            <Settings className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Settings</h3>
          </div>
          <p className="text-sm text-gray-600">Manage your preferences and account.</p>
        </div>

        <div
          onClick={() => alert("Coming soon!")}
          className="cursor-pointer bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all p-6"
        >
          <div className="flex items-center gap-3 mb-2 text-purple-600">
            <Users className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Team Members</h3>
          </div>
          <p className="text-sm text-gray-600">See who's on your squad (soon).</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
