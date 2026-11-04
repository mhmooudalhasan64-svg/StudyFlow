import { create } from 'zustand';
import { useApp } from '../store';
import { buildLearnerProfile, contextFrom } from './advisor';
import { toDateKey } from './utils';

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
  /** إرسال ملخص مستوى الطالب مع الأسئلة لتخصيص الشرح */
  useProfile: boolean;
  setUseProfile: (v: boolean) => void;
  loading: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  clear: () => void;
}

/** المحادثة تبقى في الذاكرة فقط (لا تُحفظ على الجهاز) */
export const useChat = create<ChatState>((set, get) => ({
  messages: [],
  attachment: null,
  useProfile: true,
  setUseProfile: (useProfile) => set({ useProfile }),
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
          ...(get().useProfile ? { profile: learnerProfile() } : {}),
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

function learnerProfile(): string {
  return buildLearnerProfile(contextFrom(useApp.getState(), toDateKey()));
}

/** يطلب من المساعد إنشاء اختبار (نص JSON خام يُحلَّل لاحقاً بـ parseGeneratedQuiz) */
export async function requestQuiz(args: { topic: string; count: number }): Promise<string> {
  const att = useChat.getState().attachment;
  let res: Response;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mode: 'quiz',
        topic: args.topic,
        count: args.count,
        ...(att ? { attachment: { name: att.name, text: att.text } } : {}),
      }),
    });
  } catch {
    throw new Error('لا يوجد اتصال بالإنترنت. المساعد يحتاج إلى اتصال.');
  }
  const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
  if (!res.ok || !data.reply) throw new Error(data.error ?? 'حدث خطأ، حاول مرة أخرى');
  return data.reply;
}
