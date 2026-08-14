'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { Sparkles, MessageCircle, Send, HelpCircle } from 'lucide-react';

type ChatMessage = {
  id: string;
  role: 'user' | 'ai';
  content: string;
};

const SUGGESTED_QUERIES = [
  'When is a favorable period for my career rise?',
  'What does my chart say about marriage & relationship harmony?',
  'How is my current Mahadasha influencing me right now?',
  'What authentic gemstone or Vedic remedy will remove my current obstacles?',
];

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
  const [remainingQuota, setRemainingQuota] = useState<number>(5);
  const [limitQuota, setLimitQuota] = useState<number>(5);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { showToast } = useToast();
  const { t } = useTranslation();
  const trimmedInput = input.trim();

  // Load initial daily quota on mount
  useEffect(() => {
    fetch('/api/user/quota')
      .then((res) => res.json())
      .then((data) => {
        if (data?.remaining?.chatbot !== undefined) {
          setRemainingQuota(data.remaining.chatbot);
          setLimitQuota(data.limits?.chatbot || 5);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const sendQuery = async (queryText: string) => {
    if (!queryText || loading) return;

    const userMsg = queryText;
    const nextHistory = messages.slice(-6);
    setInput('');
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: userMsg }]);
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || t('chat_err_response'), 'error');
        setMessages((prev) => prev.slice(0, -1));
        setInput(userMsg);
      } else {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'ai', content: data.reply }]);
        if (data.remainingQuota !== undefined) {
          setRemainingQuota(data.remainingQuota);
          if (data.limit !== undefined) setLimitQuota(data.limit);
        }
      }
    } catch (err) {
      console.error(err);
      showToast(t('chat_err_connection'), 'error');
      setMessages((prev) => prev.slice(0, -1));
      setInput(userMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(trimmedInput);
  };

  return (
    <div
      style={{
        marginTop: '2.5rem',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(139, 92, 246, 0.35)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1.2rem 1.5rem',
          background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.18) 0%, rgba(59, 130, 246, 0.12) 100%)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(139, 92, 246, 0.5)',
            }}
          >
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 600 }}>
              {t('chat_title', { defaultValue: 'Astrologer Consultation & Problem Solving' })}
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Grounded strictly in your verified planetary chart & classical Vedic sutras
            </span>
          </div>
        </div>

        <div
          style={{
            fontSize: '0.82rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            background: remainingQuota > 0 ? 'rgba(139, 92, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: remainingQuota > 0 ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            color: remainingQuota > 0 ? '#c084fc' : '#fca5a5',
            fontWeight: 500,
          }}
        >
          {remainingQuota} of {limitQuota} daily queries remaining
        </div>
      </div>

      {/* Suggested Quick Queries (if no messages yet) */}
      {messages.length === 0 && (
        <div style={{ padding: '1.25rem 1.5rem 0.5rem', borderBottom: '1px dashed rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 500 }}>
            <HelpCircle size={15} color="#a78bfa" />
            <span>Suggested Questions for Astrologer:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {SUGGESTED_QUERIES.map((sq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendQuery(sq)}
                disabled={loading || remainingQuota <= 0}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  color: '#e2e8f0',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  cursor: loading || remainingQuota <= 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!loading && remainingQuota > 0) {
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.25)';
                }}
              >
                💬 {sq}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Stream */}
      <div
        style={{
          padding: '1.5rem',
          maxHeight: '460px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: msg.role === 'user' ? '80%' : '92%',
            }}
          >
            <div
              style={{
                padding: '0.9rem 1.25rem',
                borderRadius: '16px',
                background:
                  msg.role === 'user'
                    ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
                    : 'rgba(30, 41, 59, 0.85)',
                border:
                  msg.role === 'user'
                    ? '1px solid rgba(139, 92, 246, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                borderBottomRightRadius: msg.role === 'user' ? 2 : '16px',
                borderBottomLeftRadius: msg.role === 'ai' ? 2 : '16px',
              }}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <div className="markdown-body" style={{ color: '#f1f5f9' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div
            style={{
              alignSelf: 'flex-start',
              background: 'rgba(30, 41, 59, 0.85)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              padding: '0.75rem 1.25rem',
              borderRadius: '16px',
              color: '#c084fc',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <Sparkles size={16} className="animate-spin" />
            <span>Consulting your planetary chart & classical Vedic sutras...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(15, 23, 42, 0.95)',
          padding: '0.5rem',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            remainingQuota > 0
              ? 'Ask anything about your life, career, marriage, or remedies...'
              : 'Daily limit reached (5 queries max). Resets tomorrow.'
          }
          style={{
            flex: 1,
            padding: '0.85rem 1.25rem',
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '0.95rem',
            outline: 'none',
          }}
          disabled={loading || remainingQuota <= 0}
        />
        <button
          type="submit"
          disabled={loading || !trimmedInput || remainingQuota <= 0}
          style={{
            padding: '0.85rem 1.4rem',
            background:
              loading || !trimmedInput || remainingQuota <= 0
                ? 'rgba(255, 255, 255, 0.1)'
                : 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 600,
            cursor: loading || !trimmedInput || remainingQuota <= 0 ? 'not-allowed' : 'pointer',
            opacity: loading || !trimmedInput || remainingQuota <= 0 ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
          }}
        >
          <span>Ask</span>
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
