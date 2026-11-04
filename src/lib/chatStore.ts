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

const CODE_KEY = 'sf-access-code';

/** رمز دخول المساعد (اختياري). تفضيل بسيط على الجهاز وليس من بيانات الدراسة. */
export function getAccessCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveAccessCode(code: string): void {
  try {
    if (code.trim()) localStorage.setItem(CODE_KEY, code.trim());
    else localStorage.removeItem(CODE_KEY);
  } catch {
    /* التخزين غير متاح: يُطلب الرمز في كل مرة */
  }
}

function postChat(body: unknown): Promise<Response> {
  const code = getAccessCode();
  return fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(code ? { 'x-access-code': code } : {}) },
    body: JSON.stringify(body),
  });
}

interface ChatState {
  /** الخادم طلب رمز دخول */
  needCode: boolean;
  setNeedCode: (v: boolean) => void;
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
  needCode: false,
  setNeedCode: (needCode) => set({ needCode }),
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
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string; needCode?: boolean };
      if (!res.ok || !data.reply) {
        set({ loading: false, error: data.error ?? 'حدث خطأ، حاول مرة أخرى', ...(data.needCode ? { needCode: true } : {}) });
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
export async function requestQuiz(args: {
  topic: string;
  count: number;
  subject?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  /** نص كتاب: أسئلة مبنية عليه حصراً، ويُستخدم بدل الملف المرفق في المحادثة */
  source?: { name: string; text: string };
}): Promise<string> {
  const att = args.source ?? useChat.getState().attachment;
  let res: Response;
  try {
    res = await postChat({
      mode: 'quiz',
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
  const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string; needCode?: boolean };
  if (data.needCode) {
    useChat.setState({ needCode: true });
    throw new Error(`${data.error ?? 'المساعد محمي.'} (يُدخل الرمز من صفحة المساعد)`);
  }
  if (!res.ok || !data.reply) throw new Error(data.error ?? 'حدث خطأ، حاول مرة أخرى');
  return data.reply;
}
