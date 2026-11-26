import { create } from 'zustand';
import { db, type ChatConversation } from '../db';
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
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export type ChatStyle = 'normal' | 'explain' | 'steps' | 'summary' | 'coach' | 'diagnose' | 'exam_coach' | 'mastery' | 'problem_solver' | 'voice_teacher';

interface ChatState {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  refreshConversations: () => Promise<void>;
  newConversation: () => void;
  openConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
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

function newConversationId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function conversationTitle(messages: ChatMsg[]): string {
  const first = messages.find((message) => message.role === 'user')?.content?.trim();
  if (!first) return 'محادثة جديدة';
  return first.length > 42 ? `${first.slice(0, 42).trim()}…` : first;
}

async function persistConversation(id: string, messages: ChatMsg[]): Promise<void> {
  if (!messages.length) return;
  const existing = await db.conversations.get(id).catch(() => undefined);
  const now = Date.now();
  await db.conversations.put({
    id,
    title: conversationTitle(messages),
    messages: messages.slice(-100),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}

/** تحفظ المحادثات على الجهاز محلياً، وتتيح فتح أكثر من سجل سابق. */

export const useChat = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: newConversationId(),
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
    const activeId = get().activeConversationId ?? newConversationId();
    set({ messages, activeConversationId: activeId, loading: true, error: null, extraUsagePending: false });
    void persistConversation(activeId, messages).then(() => get().refreshConversations()).catch(() => undefined);
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
      const activeId = get().activeConversationId;
      if (activeId) void persistConversation(activeId, done).then(() => get().refreshConversations()).catch(() => undefined);
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
      const activeId = get().activeConversationId;
      if (activeId) void persistConversation(activeId, done).then(() => get().refreshConversations()).catch(() => undefined);
    } catch {
      set({ loading: false, error: 'لا يوجد اتصال بالإنترنت. المساعد يحتاج إلى اتصال.' });
    }
  },

  cancelExtraUsage: () => set({
    extraUsagePending: false,
    error: 'اخترت الانتظار حتى يتجدد رصيد AVORA AI المجاني.',
  }),

  clear: () => {
    get().newConversation();
  },

  refreshConversations: async () => {
    const rows = await db.conversations.orderBy('updatedAt').reverse().toArray().catch(() => []);
    set({ conversations: rows });
  },

  newConversation: () => {
    const id = newConversationId();
    set({ activeConversationId: id, messages: [], attachment: null, error: null, loading: false, extraUsagePending: false });
  },

  openConversation: async (id) => {
    const conversation = await db.conversations.get(id).catch(() => undefined);
    if (!conversation) return;
    set({ activeConversationId: id, messages: conversation.messages, attachment: null, error: null, loading: false, extraUsagePending: false });
  },

  deleteConversation: async (id) => {
    await db.conversations.delete(id).catch(() => undefined);
    if (get().activeConversationId === id) get().newConversation();
    await get().refreshConversations();
  },

  load: async () => {
    if (get().messages.length > 0) {
      await get().refreshConversations();
      return;
    }
    let rows = await db.conversations.orderBy('updatedAt').reverse().toArray().catch(() => []);
    // إذا بدأ المستخدم محادثة أثناء تحميل السجل، لا نستبدلها بمحادثة أقدم.
    if (get().messages.length > 0) {
      await get().refreshConversations();
      return;
    }
    // ترحيل سجل النسخة السابقة دون فقد المحادثة القديمة.
    if (rows.length === 0) {
      const legacy = await db.chatLogs.get('main').catch(() => undefined);
      if (legacy?.messages?.length) {
        const migrated: ChatConversation = {
          id: 'legacy-main',
          title: conversationTitle(legacy.messages),
          messages: legacy.messages,
          createdAt: legacy.at,
          updatedAt: legacy.at,
        };
        await db.conversations.put(migrated).catch(() => undefined);
        rows = [migrated];
      }
    }
    if (rows.length > 0) {
      const latest = rows[0];
      set({ conversations: rows, activeConversationId: latest.id, messages: latest.messages });
    } else {
      set({ conversations: [], activeConversationId: newConversationId() });
    }
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
