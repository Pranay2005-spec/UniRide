import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useRideState } from '../context/RideStateContext';

export default function ChatOverlay({ rideId, otherName, onClose }) {
  const { user } = useAuth();
  const { chatMessages, sendChatMessage, setUnreadChatCount, chatRideIdRef } = useRideState();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    setUnreadChatCount(0);
    chatRideIdRef.current = rideId;
    return () => { chatRideIdRef.current = null; };
  }, [rideId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    sendChatMessage(rideId, text);
    setText('');
  }

  const quickReplies = [
    "Where are you?",
    "I'm here",
    "Reached the pickup spot",
  ];

  function sendQuick(msg) {
    sendChatMessage(rideId, msg);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-white w-full h-[70vh] rounded-t-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <button onClick={onClose} className="text-gray-400 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-text font-bold text-xs shrink-0">
            {otherName?.[0] || '?'}
          </div>
          <p className="text-sm font-semibold text-text">{otherName || 'Chat'}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {chatMessages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
            </div>
          )}
          {chatMessages.map((msg, i) => {
            const isSystem = msg.senderId === null;
            if (isSystem) {
              return (
                <div key={i} className="flex justify-center">
                  <div className="bg-gray-100 rounded-full px-4 py-1.5">
                    <p className="text-xs text-gray-500 italic">{msg.message}</p>
                  </div>
                </div>
              );
            }
            const isMe = msg.senderId === user?._id;
            return (
              <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isMe ? 'bg-primary text-text rounded-br-sm' : 'bg-gray-100 text-text rounded-bl-sm'}`}>
                  {!isMe && (
                    <p className="text-xs font-semibold text-green-700 mb-0.5">{msg.senderName}</p>
                  )}
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isMe ? 'text-text/60 justify-end' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-400">
                        <path d="M2 13l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 13l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 px-4 pb-1 flex gap-1.5 overflow-x-auto no-scrollbar">
          {quickReplies.map((msg, i) => (
            <button
              key={i}
              onClick={() => sendQuick(msg)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-gray-100 text-xs text-gray-600 font-medium hover:bg-primary-50 hover:text-text transition-colors whitespace-nowrap"
            >
              {msg}
            </button>
          ))}
        </div>
        <form onSubmit={handleSend} className="shrink-0 px-4 py-3 border-t border-border flex items-center gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-sm text-text placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
