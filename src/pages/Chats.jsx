import React, { useEffect, useRef, useState } from "react";
import { SendHorizonal, MessageCircle, PlusCircle, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

function Chats() {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const scrollRef = useRef(null);
  const socketRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user"));
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Helper to fetch rooms from backend
  const fetchRooms = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/rooms");
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
      localStorage.setItem("chatRooms", JSON.stringify(data));
      return data;
    } catch {
      setRooms([]);
      return [];
    }
  };

  // Helper to fetch messages for a room
  const fetchMessages = async (roomId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/rooms/${roomId}/messages`);
      const msgs = await res.json();
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    // On mount, fetch rooms and set active room
    (async () => {
      const data = await fetchRooms();
      const storedActiveRoom = JSON.parse(localStorage.getItem("activeRoom"));
      const defaultRoom = data.find((room) => room.id === "room-3") || data[0];
      const selectedRoom = storedActiveRoom || defaultRoom;
      setActiveRoom(selectedRoom);
    })();
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    fetchMessages(activeRoom.id);
  }, [activeRoom]);

  // WebSocket for real-time updates
  useEffect(() => {
    if (!activeRoom) return;

    socketRef.current = new WebSocket("ws://localhost:8000/ws/chat");

    socketRef.current.onopen = () => {
      socketRef.current.send(
        JSON.stringify({ type: "join", room: activeRoom.id })
      );
    };

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    socketRef.current.onerror = () => { };
    socketRef.current.onclose = () => { };

    return () => socketRef.current.close();
  }, [activeRoom]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  const getDisplayName = (user) => user?.name || user?.email || "Anonymous";

  const handleSend = () => {
    if (!input.trim()) return;
    const message = {
      type: "message",
      room: activeRoom.id,
      content: input,
      sender: getDisplayName(user),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      id: uuidv4(),
    };
    socketRef.current.send(JSON.stringify(message));
    setInput("");
    // Re-fetch messages after sending
    setTimeout(() => fetchMessages(activeRoom.id), 300);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const message = {
        type: "message",
        room: activeRoom.id,
        content: `File: ${file.name}`,
        fileUrl: event.target.result,
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        sender: getDisplayName(user),
        time: timestamp,
        id: uuidv4(),
      };
      socketRef.current.send(JSON.stringify(message));
      // Re-fetch messages after sending file
      setTimeout(() => fetchMessages(activeRoom.id), 300);
    };
    reader.readAsDataURL(file);
  };

  const switchRoom = async (room) => {
    setActiveRoom(room);
    localStorage.setItem("activeRoom", JSON.stringify(room));
    await fetchMessages(room.id);
    socketRef.current?.send(
      JSON.stringify({ type: "join", room: room.id })
    );
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error("Room name can't be empty");
      return;
    }
    const newRoom = {
      id: `room-${Date.now()}`,
      name: newRoomName.trim(),
    };
    await fetch("http://localhost:8000/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRoom),
    });
    // Re-fetch rooms from backend
    const updatedRooms = await fetchRooms();
    const createdRoom = updatedRooms.find((r) => r.id === newRoom.id);
    setActiveRoom(createdRoom || updatedRooms[0]);
    setMessages([]);
    setNewRoomName("");
    localStorage.setItem("chatRooms", JSON.stringify(updatedRooms));
    localStorage.setItem("activeRoom", JSON.stringify(createdRoom || updatedRooms[0]));
    toast.success("Room created successfully");
  };

  const isImage = (fileName) => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);

  return (
    <div className="flex h-full">
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h2 className="text-xl font-semibold text-blue-600 mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" /> Chats
        </h2>

        <ul className="space-y-2 mb-4">
          {rooms.length > 0 ? (
            rooms.map((room) => (
              <li
                key={room.id}
                onClick={() => switchRoom(room)}
                className={`cursor-pointer px-4 py-2 rounded-md transition-colors ${activeRoom?.id === room.id
                    ? "bg-blue-100 text-blue-600 font-semibold"
                    : "hover:bg-gray-100 text-gray-700"
                  }`}
              >
                {room.name}
              </li>
            ))
          ) : (
            <p className="text-gray-400">No rooms found. Create one below 👇</p>
          )}
        </ul>

        <div className="space-y-2">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="New room name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreateRoom}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            Create Room
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-200 bg-white shadow-sm flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            {activeRoom?.name || "Select a Room"}
          </h3>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} title={isOnline ? "Online" : "Offline"}></div>
            <span className="text-xs text-gray-600">{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-gray-400 text-center mt-10">
              No messages yet. Start the convo 👇
            </p>
          )}
          {messages.map((msg, idx) => {
            const isMine = user && (msg.sender === (user.name || user.email));
            return (
              <div key={msg.id || idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2 rounded-lg max-w-xs ${isMine ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
                  <div className="font-bold text-xs mb-1">{msg.sender}</div>
                  {msg.fileUrl ? (
                    isImage(msg.fileName) ? (
                      <img src={msg.fileUrl} alt={msg.fileName} className="max-w-full max-h-40 rounded mt-1" />
                    ) : (
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        🔗 View {msg.fileName} ({msg.fileSize})
                      </a>
                    )
                  ) : (
                    msg.content
                  )}
                </div>
                <span className="text-xs text-gray-400 mt-1">{msg.time}</span>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        <div className="p-4 border-t border-gray-200 bg-white flex items-center gap-3">
          <input
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            id="chat-file-input"
          />
          <label htmlFor="chat-file-input" className="cursor-pointer text-blue-600 hover:text-blue-800">
            <Paperclip className="w-5 h-5" />
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <SendHorizonal className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chats;
