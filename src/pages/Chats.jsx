import React, { useEffect, useRef, useState } from "react";
import { SendHorizonal, MessageCircle, PlusCircle, Paperclip } from "lucide-react";
import toast from "react-hot-toast";

function Chats() {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const scrollRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let storedRooms = [];
    try {
      const raw = localStorage.getItem("chatRooms");
      storedRooms = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    } catch {
      storedRooms = [];
    }

    const storedActiveRoom = JSON.parse(localStorage.getItem("activeRoom"));
    const storedMessages = JSON.parse(localStorage.getItem("chatMessages"));

    fetch("http://localhost:8000/api/rooms")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Invalid rooms response");
        setRooms(data);
        localStorage.setItem("chatRooms", JSON.stringify(data));

        const defaultRoom = data.find((room) => room.id === "room-3") || data[0];
        const selectedRoom = storedActiveRoom || defaultRoom;

        setActiveRoom(selectedRoom);
        setMessages(storedMessages?.[selectedRoom?.id] || []);
      })
      .catch(() => {
        setRooms(storedRooms);
        if (storedRooms.length > 0) {
          const fallbackRoom = storedActiveRoom || storedRooms[0];
          setActiveRoom(fallbackRoom);
          setMessages(storedMessages?.[fallbackRoom?.id] || []);
        }
        toast.error("Failed to load rooms from server, using local fallback");
      });
  }, []);

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
        const updatedMessages = [...messages, data.message];
        setMessages(updatedMessages);

        const storedMessages = JSON.parse(localStorage.getItem("chatMessages")) || {};
        storedMessages[activeRoom.id] = updatedMessages;
        localStorage.setItem("chatMessages", JSON.stringify(storedMessages));
      }
    };

    socketRef.current.onerror = () => { };
    socketRef.current.onclose = () => { };

    return () => socketRef.current.close();
  }, [activeRoom]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const message = {
      type: "message",
      room: activeRoom.id,
      content: input,
      sender: "You",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    socketRef.current.send(JSON.stringify(message));
    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);
    setInput("");

    const storedMessages = JSON.parse(localStorage.getItem("chatMessages")) || {};
    storedMessages[activeRoom.id] = updatedMessages;
    localStorage.setItem("chatMessages", JSON.stringify(storedMessages));
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

      // Message to be sent via WebSocket
      const message = {
        type: "message",
        room: activeRoom.id,
        content: `File: ${file.name}`,
        fileUrl: event.target.result,
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        sender: "You",
        time: timestamp,
      };

      // Send message to WebSocket
      socketRef.current.send(JSON.stringify(message));

      // Update chat messages in state and localStorage
      const updatedMessages = [...messages, message];
      setMessages(updatedMessages);

      const storedMessages = JSON.parse(localStorage.getItem("chatMessages")) || {};
      storedMessages[activeRoom.id] = updatedMessages;
      localStorage.setItem("chatMessages", JSON.stringify(storedMessages));

      // 🔥 Store uploaded file metadata separately for use in Files.jsx
      const uploadedFiles = JSON.parse(localStorage.getItem("uploadedFiles")) || [];
      uploadedFiles.push({
        roomId: activeRoom.id,
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        fileUrl: event.target.result,
        time: timestamp,
      });
      localStorage.setItem("uploadedFiles", JSON.stringify(uploadedFiles));
    };

    reader.readAsDataURL(file);
  };


  const switchRoom = (room) => {
    setActiveRoom(room);
    localStorage.setItem("activeRoom", JSON.stringify(room));

    const storedMessages = JSON.parse(localStorage.getItem("chatMessages")) || {};
    setMessages(storedMessages[room.id] || []);

    socketRef.current?.send(
      JSON.stringify({ type: "join", room: room.id })
    );
  };

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) {
      toast.error("Room name can't be empty");
      return;
    }

    const newRoom = {
      id: `room-${Date.now()}`,
      name: newRoomName.trim(),
    };

    fetch("http://localhost:8000/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRoom),
    }).catch(() => { });

    const updatedRooms = [...rooms, newRoom];
    setRooms(updatedRooms);
    setActiveRoom(newRoom);
    setMessages([]);
    setNewRoomName("");

    localStorage.setItem("chatRooms", JSON.stringify(updatedRooms));
    localStorage.setItem("activeRoom", JSON.stringify(newRoom));

    toast.success("Room created successfully");
  };

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
        <div className="p-4 border-b border-gray-200 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">
            {activeRoom?.name || "Select a Room"}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-gray-400 text-center mt-10">
              No messages yet. Start the convo 👇
            </p>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className="flex flex-col items-end">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg max-w-xs">
                {msg.fileUrl ? (
                  <a href={msg.fileUrl} download={msg.fileName} className="underline">
                    📎 {msg.fileName} ({msg.fileSize})
                  </a>
                ) : (
                  msg.content
                )}
              </div>
              <span className="text-xs text-gray-400 mt-1">{msg.time}</span>
            </div>
          ))}
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
