'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Maximize2 } from 'lucide-react';

export function CommanderChat() {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'COMMANDER ONLINE. LLAMA 3.3 READY.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const sendQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context: 'frontend' })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'ERR: CONNECTION LOST' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={false}
      animate={{ height: isMinimized ? 48 : 500 }}
      className="glass-panel border-white/5 flex flex-col w-[400px] rounded-2xl overflow-hidden bg-[#0A0A0B]/80 font-mono shadow-2xl"
    >
      <div className="bg-[#161618] p-3 border-b border-white/5 flex items-center justify-between cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#4A6CF7] animate-pulse shadow-[0_0_10px_#4A6CF7]"></div>
          <span className="text-[10px] font-bold tracking-widest text-[#E5E7EB] uppercase">AI Copilot</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="text-gray-400 hover:text-white transition-colors">
            {isMinimized ? <Maximize2 size={12} /> : <Minus size={12} />}
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {!isMinimized && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm tracking-tight">
              {messages.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-[#F5F5F7] text-black font-semibold' : 'text-[#E5E7EB]'}`}>
                    {msg.role === 'ai' && <span className="text-[#4A6CF7] font-bold mr-2">&gt;</span>}
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="text-[#E5E7EB] flex items-center gap-2">
                    <span className="text-[#4A6CF7] font-bold">&gt;</span>
                    <span className="animate-pulse">Processing...</span>
                  </div>
                </motion.div>
              )}
            </div>

            <form onSubmit={sendQuery} className="p-3 border-t border-white/5 bg-[#161618] flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Execute command..." 
                className="flex-1 bg-transparent px-3 py-2 text-sm text-[#F5F5F7] placeholder-[#E5E7EB] focus:outline-none"
              />
              <button type="submit" disabled={loading} className="bg-[#4A6CF7] hover:bg-[#7F9CF5] text-white px-5 py-2 rounded-lg text-xs tracking-widest uppercase font-bold transition-colors disabled:opacity-50">
                Run
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
