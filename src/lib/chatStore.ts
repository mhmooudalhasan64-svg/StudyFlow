import { create } from 'zustand';
import { db } from '../db';
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

function postChat(body: unknown): Promise<Response> {
  return fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
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
  /** يعيد آخر محادثة محفوظة في الجهاز (إن لم توجد محادثة حالية) */
  load: () => Promise<void>;
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
      const res = await postChat({
        messages: messages.slice(-12),
        ...(get().useProfile ? { profile: learnerProfile() } : {}),
        ...(get().attachment ? { attachment: { name: get().attachment!.name, text: get().attachment!.text } } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        set({ loading: false, error: data.error ?? 'حدث خطأ، حاول مرة أخرى' });
        return;
      }
      const done = [...get().messages, { role: 'assistant' as const, content: data.reply }];
      set({ loading: false, messages: done });
      void db.chatLogs.put({ key: 'main', messages: done.slice(-40), at: Date.now() }).catch(() => undefined);
    } catch {
      set({ loading: false, error: 'لا يوجد اتصال بالإنترنت. المساعد يحتاج إلى اتصال.' });
    }
  },

  clear: () => {
    set({ messages: [], attachment: null, error: null, loading: false });
    void db.chatLogs.delete('main').catch(() => undefined);
  },

  load: async () => {
    if (get().messages.length > 0) return;
    const log = await db.chatLogs.get('main').catch(() => undefined);
    if (log && get().messages.length === 0) set({ messages: log.messages });
  },
}));

function learnerProfile(): string {
  return buildLearnerProfile(contextFrom(useApp.getState(), toDateKey()));
}

/** سؤال حر عن مقاطع من كتاب (يجيب منها فقط ويذكر أرقام الصفحات) */
export async function askBook(args: { question: string; name: string; text: string }): Promise<string> {
  let res: Response;
  try {
    res = await postChat({
      messages: [{ role: 'user', content: args.question }],
      attachment: { name: args.name, text: args.text },
      bookAsk: true,
    });
  } catch {
    throw new Error('لا يوجد اتصال بالإنترنت. المساعد يحتاج إلى اتصال.');
  }
  const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
  if (!res.ok || !data.reply) throw new Error(data.error ?? 'حدث خطأ، حاول مرة أخرى');
  return data.reply;
}

/** يطلب من المساعد إنشاء اختبار (نص JSON خام يُحلَّل لاحقاً بـ parseGeneratedQuiz) */
export async function requestQuiz(args: {
  topic: string;
  count: number;
  subject?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  /** نص كتاب: أسئلة مبنية عليه حصراً، ويُستخدم بدل الملف المرفق في المحادثة */
  source?: { name: string; text: string };
  /** quiz (افتراضي) أو cards لبطاقات مراجعة */
  mode?: 'quiz' | 'cards' | 'exam';
}): Promise<string> {
  const att = args.source ?? useChat.getState().attachment;
  let res: Response;
  try {
    res = await postChat({
      mode: args.mode ?? 'quiz',
      topic: args.topic,
      subject: args.subject,
      ...(args.difficulty ? { difficulty: args.difficulty } : {}),
      ...(args.source ? { fromBook: true } : {}),
      count: args.count,
      ...(att ? { attachment: { name: att.name, text: att.text } } : {}),
    });
  } catch {
    throw new Error('لا يوجد اتصال بالإنترنت. المساعد يحتاج إلى اتصال.');
  }
  const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
  if (!res.ok || !data.reply) throw new Error(data.error ?? 'حدث خطأ، حاول مرة أخرى');
  return data.reply;
}
