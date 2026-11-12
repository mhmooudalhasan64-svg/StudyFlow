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
  // In the Android build, call the deployed Vercel API; on the web, keep the same-origin route.
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
  return fetch(`${apiBase}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-vayora-build': '7' },
    body: JSON.stringify(body),
  });
}

export type ChatStyle = 'normal' | 'explain' | 'steps' | 'summary' | 'coach' | 'diagnose' | 'exam_coach' | 'mastery' | 'problem_solver' | 'voice_teacher';

interface ChatState {
  /** المادة الحالية (تُرسل ليبقى الشرح ضمنها) */
  subject: string | null;
  setSubject: (s: string | null) => void;
  /** أسلوب الرد */
  style: ChatStyle;
  setStyle: (s: ChatStyle) => void;
  /** يعيد توليد آخر رد */
  regenerate: () => void;
  messages: ChatMsg[];
  attachment: ChatAttachment | null;
  setAttachment: (a: ChatAttachment | null) => void;
  /** إرسال ملخص مستوى الطالب مع الأسئلة لتخصيص الشرح */
  useProfile: boolean;
  setUseProfile: (v: boolean) => void;
  loading: boolean;
  error: string | null;
  extraUsagePending: boolean;
  continueWithExtraUsage: () => Promise<void>;
  cancelExtraUsage: () => void;
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
  extraUsagePending: false,

  setAttachment: (attachment) => set({ attachment }),

  subject: null,
  setSubject: (subject) => set({ subject }),
  style: 'normal',
  setStyle: (style) => set({ style }),

  regenerate: () => {
    const { messages, loading } = get();
    if (loading) return;
    let i = messages.length - 1;
    while (i >= 0 && messages[i].role !== 'user') i--;
    if (i < 0) return;
    const text = messages[i].content;
    set({ messages: messages.slice(0, i), error: null });
    void get().send(text);
  },

  send: async (text) => {
    const content = text.trim();
    if (!content || get().loading) return;
    const messages = [...get().messages, { role: 'user' as const, content }];
    set({ messages, loading: true, error: null, extraUsagePending: false });
    try {
      const res = await postChat({
        messages: messages.slice(-12),
        ...(get().subject ? { subject: get().subject } : {}),
        ...(get().style !== 'normal' ? { style: get().style } : {}),
        ...(get().useProfile ? { profile: learnerProfile() } : {}),
        ...(get().attachment ? { attachment: { name: get().attachment!.name, text: get().attachment!.text } } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string; code?: string };
      if (res.status === 402 && data.code === 'extra_usage_consent_required') {
        set({ loading: false, extraUsagePending: true, error: null });
        return;
      }
      if (!res.ok || !data.reply) {
        set({ loading: false, error: data.error ?? 'حدث خطأ، حاول مرة أخرى' });
        return;
      }
      const done = [...get().messages, { role: 'assistant' as const, content: data.reply }];
      set({ loading: false, messages: done, extraUsagePending: false });
      void db.chatLogs.put({ key: 'main', messages: done.slice(-40), at: Date.now() }).catch(() => undefined);
    } catch {
      set({ loading: false, error: 'لا يوجد اتصال بالإنترنت. المساعد يحتاج إلى اتصال.' });
    }
  },

  continueWithExtraUsage: async () => {
    const current = get();
    if (!current.extraUsagePending || current.loading || current.messages.length === 0) return;
    set({ loading: true, error: null, extraUsagePending: false });
    try {
      const res = await postChat({
        messages: current.messages.slice(-12),
        extraUsageConsent: true,
        ...(current.subject ? { subject: current.subject } : {}),
        ...(current.style !== 'normal' ? { style: current.style } : {}),
        ...(current.useProfile ? { profile: learnerProfile() } : {}),
        ...(current.attachment ? { attachment: { name: current.attachment.name, text: current.attachment.text } } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        set({ loading: false, error: data.error ?? 'تعذّر تفعيل الاستخدام الإضافي حالياً.' });
        return;
      }
      const done = [...get().messages, { role: 'assistant' as const, content: data.reply }];
      set({ loading: false, messages: done, extraUsagePending: false });
      void db.chatLogs.put({ key: 'main', messages: done.slice(-40), at: Date.now() }).catch(() => undefined);
    } catch {
      set({ loading: false, error: 'لا يوجد اتصال بالإنترنت. المساعد يحتاج إلى اتصال.' });
    }
  },

  cancelExtraUsage: () => set({
    extraUsagePending: false,
    error: 'اخترت الانتظار حتى يتجدد رصيد AVORA AI المجاني.',
  }),

  clear: () => {
    set({ messages: [], attachment: null, error: null, loading: false, extraUsagePending: false });
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

/** سؤال AVORA عن تفريغ فيديو؛ لا يُطلب من النموذج اختراع مشاهد أو توقيتات. */
export async function askVideo(args: { question: string; title: string; transcript: string }): Promise<string> {
  const transcript = args.transcript.trim().slice(0, 8000);
  if (transcript.length < 20) throw new Error('أضف نص ترجمة أو تفريغاً أطول للفيديو أولاً.');
  let res: Response;
  try {
    res = await postChat({
      messages: [{ role: 'user', content: args.question.trim() }],
      attachment: { name: args.title.slice(0, 80), text: transcript },
      videoAsk: true,
    });
  } catch {
    throw new Error('لا يوجد اتصال بالإنترنت. يحتاج تحليل الفيديو إلى اتصال.');
  }
  const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
  if (!res.ok || !data.reply) throw new Error(data.error ?? 'تعذّر تحليل الفيديو. حاول مرة أخرى.');
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

/** إنشاء شجرة مفاهيم من نص الدرس أو الملف المرفق. */
export async function requestMindMap(args: {
  topic: string;
  source?: string;
  attachment?: { name: string; text: string };
}): Promise<string> {
  const att = args.attachment;
  let res: Response;
  try {
    res = await postChat({
      mode: 'mindmap',
      topic: args.topic.slice(0, 160),
      ...(args.source ? { sourceText: args.source.slice(0, 8000) } : {}),
      ...(att ? { attachment: { name: att.name, text: att.text } } : {}),
    });
  } catch {
    throw new Error('لا يوجد اتصال بالإنترنت. إنشاء الخريطة يحتاج إلى اتصال.');
  }
  const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
  if (!res.ok || !data.reply) throw new Error(data.error ?? 'تعذّر إنشاء الخريطة الذهنية.');
  return data.reply;
}
