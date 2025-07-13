import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { ImagePlus } from "lucide-react";

function Settings() {
  const [user, setUser] = useState({ name: "", email: "", avatar_url: "", password: "" });
  const [newPassword, setNewPassword] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      setAvatarPreview(storedUser.avatar_url || null);
    }
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUser((prev) => ({ ...prev, avatar_url: reader.result }));
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!user.name || !user.email) {
      toast.error("Name and Email are required");
      return;
    }

    const updatedUser = {
      ...user,
      password: newPassword || user.password, // only update if newPassword provided
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    setNewPassword("");
    toast.success("✅ Settings saved successfully!");
  };

  return (
    <div className="p-8 overflow-y-auto h-full">
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">⚙️ Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Info */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-blue-600 mb-4">Profile Information</h2>

          <div className="flex flex-col items-center mb-6">
            <label
              htmlFor="avatar-input"
              className="cursor-pointer w-24 h-24 rounded-full bg-gray-200 border overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-blue-500 transition"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImagePlus className="w-8 h-8 text-gray-500" />
              )}
            </label>
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <p className="text-sm text-gray-500 mt-2">Click to change avatar</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={user.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Security & Preferences */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-blue-600 mb-4">Security</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank to keep existing password</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8">
        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-all"
        >
          💾 Save Changes
        </button>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}

export default Settings;
