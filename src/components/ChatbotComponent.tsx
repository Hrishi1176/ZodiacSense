'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/context/ToastContext';

type ChatMessage = {
  id: string;
  role: 'user' | 'ai';
  content: string;
};

export default function ChatbotComponent({
  readingId,
  language,
}: {
  readingId: string;
  language: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { showToast } = useToast();
  const trimmedInput = input.trim();

  const placeholder = useMemo(() => {
    switch (language) {
      case 'Hindi':
        return 'उदाहरण: मुझे नई नौकरी कब मिलेगी?';
      case 'Bengali':
        return 'যেমন: আমি কবে নতুন চাকরি পাব?';
      default:
        return 'e.g. When will I get a new job?';
    }
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedInput || loading) return;

    const userMsg = trimmedInput;
    const nextHistory = messages.slice(-6);
    setInput('');
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/birth-chart/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readingId,
          message: userMsg,
          history: nextHistory,
          language,
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        showToast(data.error || 'Failed to get response', 'error');
        setMessages(prev => prev.slice(0, -1));
        setInput(userMsg);
      } else {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'ai', content: data.reply }]);
        if (data.remainingQuota !== undefined) {
          setQuotaInfo(`${data.remainingQuota} / ${data.limit} chats remaining today`);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error', 'error');
      setMessages(prev => prev.slice(0, -1));
      setInput(userMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '2.5rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.5rem', background: 'rgba(139, 92, 246, 0.1)', borderBottom: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#e2e8f0' }}>💬 Ask your AI Astrologer</h3>
        {quotaInfo && <span style={{ fontSize: '0.8rem', color: '#a78bfa' }}>{quotaInfo}</span>}
      </div>

      <div style={{ padding: '1.5rem', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.length === 0 && (
          <p style={{ color: '#94a3b8', textAlign: 'center', margin: 0, fontSize: '0.9rem' }}>
            Have a question about your birth chart? Ask the AI astrologer!
          </p>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div style={{ 
              padding: '0.75rem 1rem', 
              borderRadius: '12px',
              background: msg.role === 'user' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              borderBottomRightRadius: msg.role === 'user' ? 0 : '12px',
              borderBottomLeftRadius: msg.role === 'ai' ? 0 : '12px',
            }}>
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'rgba(255, 255, 255, 0.05)', padding: '0.5rem 1rem', borderRadius: '12px', color: '#a78bfa', fontSize: '0.9rem' }}>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', borderTop: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.2)' }}>
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, padding: '1rem 1.5rem', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', outline: 'none' }}
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading || !trimmedInput}
          style={{ padding: '0 1.5rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: loading || !trimmedInput ? 'not-allowed' : 'pointer', opacity: loading || !trimmedInput ? 0.5 : 1 }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
