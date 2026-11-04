import { create } from 'zustand';

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatAttachment {
  name: string;
  text: string;
  /** هل اقتُطع النص لطوله */
  truncated: boolean;
}

interface ChatState {
  messages: ChatMsg[];
  attachment: ChatAttachment | null;
  setAttachment: (a: ChatAttachment | null) => void;
  loading: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  clear: () => void;
}

/** المحادثة تبقى في الذاكرة فقط (لا تُحفظ على الجهاز) */
export const useChat = create<ChatState>((set, get) => ({
  messages: [],
  attachment: null,
  loading: false,
  error: null,

  setAttachment: (attachment) => set({ attachment }),

  send: async (text) => {
    const content = text.trim();
    if (!content || get().loading) return;

    const messages = [...get().messages, { role: 'user' as const, content }];
    set({ messages, loading: true, error: null });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: messages.slice(-12),
          ...(get().attachment ? { attachment: { name: get().attachment!.name, text: get().attachment!.text } } : {}),
        }),
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

  clear: () => set({ messages: [], attachment: null, error: null, loading: false }),
}));
