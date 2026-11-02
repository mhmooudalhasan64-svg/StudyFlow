import { create } from 'zustand';

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatState {
  messages: ChatMsg[];
  loading: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  clear: () => void;
}

/** المحادثة تبقى في الذاكرة فقط (لا تُحفظ على الجهاز) */
export const useChat = create<ChatState>((set, get) => ({
  messages: [],
  loading: false,
  error: null,

  send: async (text) => {
    const content = text.trim();
    if (!content || get().loading) return;

    const messages = [...get().messages, { role: 'user' as const, content }];
    set({ messages, loading: true, error: null });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: messages.slice(-12) }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        set({ loading: false, error: data.error ?? 'حدث خطأ، حاول مرة أخرى' });
        return;
      }
      set({
        loading: false,
        messages: [...get().messages, { role: 'assistant', content: data.reply }],
      });
    } catch {
      set({ loading: false, error: 'لا يوجد اتصال بالإنترنت. المساعد يحتاج إلى اتصال.' });
    }
  },

  clear: () => set({ messages: [], error: null, loading: false }),
}));
