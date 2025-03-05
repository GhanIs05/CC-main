import React, { useEffect, useRef, useState } from "react";
import { auth, db } from "./firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, updateDoc, getDocs } from "firebase/firestore"; // Added setDoc import
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

const ChatRoom = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false); // Track if user is typing
  const [otherUserTyping, setOtherUserTyping] = useState(false); // Track if the other user is typing

  // Handle sign-in and registration flow
  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store the user data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: email.split('@')[0], // Default displayName is email prefix
      });
      setCurrentUser(user); // Set current user after registration
    } catch (error) {
      console.error("Error registering: ", error);
    }
  };

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setCurrentUser(userCredential.user); // Set current user after login
    } catch (error) {
      console.error("Error logging in: ", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null); // Clear current user after sign out
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // Fetch users after login
  useEffect(() => {
    if (currentUser) {
      const fetchUsers = async () => {
        const usersSnapshot = await getDocs(collection(db, "users"));
        setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };
      fetchUsers();
    }
  }, [currentUser]);

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (!selectedUser || !currentUser) return;
    const chatId = [currentUser.uid, selectedUser.id].sort().join("_");
    const q = query(collection(db, "messages", chatId, "messages"), orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [selectedUser, currentUser]);

  // Fetch typing status for the other user
  useEffect(() => {
    if (!selectedUser || !currentUser) return;
    const chatId = [currentUser.uid, selectedUser.id].sort().join("_");
    const typingRef = doc(db, "typing", chatId); // Corrected to point to a document in 'typing' collection
    const unsubscribe = onSnapshot(typingRef, (docSnap) => {
      if (docSnap.exists()) {
        setOtherUserTyping(docSnap.data().typing);
      }
    });
    return () => unsubscribe();
  }, [selectedUser, currentUser]);

  // Scroll to the bottom of the chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle typing status
  const handleTyping = async () => {
    if (!selectedUser || !currentUser) return;
    const chatId = [currentUser.uid, selectedUser.id].sort().join("_");

    // Set typing status to true
    await setDoc(doc(db, "typing", chatId), {
      typing: true,
    }, { merge: true });

    setTimeout(async () => {
      // Reset typing status after 2 seconds of inactivity
      await setDoc(doc(db, "typing", chatId), {
        typing: false,
      }, { merge: true });
    }, 2000); 
  };

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    const chatId = [currentUser.uid, selectedUser.id].sort().join("_");
    await addDoc(collection(db, "messages", chatId, "messages"), {
      text: newMessage,
      createdAt: serverTimestamp(),
      senderId: currentUser?.uid,
      receiverId: selectedUser.id,
      displayName: currentUser?.displayName || currentUser?.email, // Store displayName in message
      read: false, // Mark new message as unread
    });
    setNewMessage("");
    // Reset typing status when a message is sent
    const typingRef = doc(db, "typing", chatId);
    await setDoc(typingRef, {
      typing: false,
    });
  };

  // Mark message as read (only for receiver)
  const markMessageAsRead = async (messageId) => {
    if (currentUser?.uid === selectedUser.id) return; // Don't mark if the current user is the sender
    const chatId = [currentUser.uid, selectedUser.id].sort().join("_");
    const messageRef = doc(db, "messages", chatId, "messages", messageId);
    await updateDoc(messageRef, {
      read: true, // Update message as read
    });
  };

  return (
    <div className="h-screen flex flex-col bg-cyan-500">
      {!currentUser ? (
        <div className="flex flex-col items-center justify-center h-full bg-cyan-100 p-6">
          <h2 className="text-2xl font-bold mb-4">{isRegistering ? "Register" : "Login"}</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-2 p-2 border rounded w-80"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 p-2 border rounded w-80"
          />
          {isRegistering ? (
            <button onClick={handleRegister} className="bg-blue-500 text-white px-4 py-2 rounded mb-2">Register</button>
          ) : (
            <button onClick={handleLogin} className="bg-green-500 text-white px-4 py-2 rounded mb-2">Login</button>
          )}
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-blue-600">
            {isRegistering ? "Already have an account? Login" : "Don't have an account? Register"}
          </button>
        </div>
      ) : (
        <>
          <div className="bg-cyan-600 text-white p-4 font-bold flex justify-between items-center w-full">
            <span>Chat App</span>
            <button onClick={handleSignOut} className="bg-red-500 px-3 py-1 rounded">Sign Out</button>
          </div>
          <div className="flex flex-1 h-full">
            <div className="w-1/5 bg-cyan-200 p-4">
              <h3 className="text-lg font-bold mb-2">Chats</h3>
              {users.map(user => (
                user.id !== currentUser?.uid && (
                  <button key={user.id} className="block p-2 w-full bg-white rounded mb-2" onClick={() => setSelectedUser(user)}>
                    {user.displayName || user.email}
                  </button>
                )
              ))}
            </div>
            <div className="flex-1 flex flex-col">
              <div className="bg-cyan-100 p-4">
                {selectedUser && (
                  <div className="text-lg font-bold">{selectedUser.displayName || selectedUser.email}</div>
                )}
                {otherUserTyping && <div className="italic text-gray-500">The other person is typing...</div>}
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-cyan-50">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser?.uid ? "items-end" : "items-start"} mb-4`}>
                    <div className={`max-w-xs p-3 rounded-xl text-sm shadow-md ${msg.senderId === currentUser?.uid ? "bg-green-400 text-white" : "bg-gray-300 text-black"}`}>
                      <p>{msg.text}</p>
                      <span className="text-xs text-gray-700 block mt-1">{msg.createdAt?.toDate().toLocaleTimeString()}</span>
                      {msg.read ? (
                        <span className="text-xs text-green-500">✓</span>
                      ) : (
                        <span className="text-xs text-gray-500">⧫</span>
                      )}
                    </div>
                    {/* Add click listener to mark message as read */}
                    {msg.senderId !== currentUser?.uid && (
                      <button onClick={() => markMessageAsRead(msg.id)} className="text-xs text-blue-500">Mark as Read</button>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef}></div>
              </div>
              <form onSubmit={handleSendMessage} className="p-3 bg-white flex items-center border-t">
                <input
                  type="text"
                  className="flex-1 p-2 border rounded-full"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    setIsTyping(e.target.value.trim() !== ""); // Set typing status based on input
                  }}
                  onKeyUp={handleTyping}
                />
                <button type="submit" className="ml-2 bg-blue-500 text-white p-2 rounded-full">Send</button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatRoom;
