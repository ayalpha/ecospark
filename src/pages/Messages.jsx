// src/pages/Messages.jsx — the DM surface, rebuilt to Instagram/GitHub grade.
//
// Layout: conversation rail + thread pane (slides over the rail on mobile).
// Thread features: grouped bubbles, date + unread separators, per-message
// action bar (react / reply / copy / edit / delete), double-tap ❤️, reaction
// chips, read receipts ("Seen" from the chat doc's lastReadAt watermark),
// live typing indicator (freshness window on chat doc's typing map), presence
// (lastActiveAt heartbeat written by ActivityTracker), media + animated
// emoji, a new-chat picker, and scroll intelligence (smart follow + new-message FAB).
// Writes that the rules don't allow yet (edit/delete content ops) need the
// pending rules deploy — the UI surfaces failures as toasts either way.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import {
  subscribeConversations, subscribeMessages, subscribeChatDoc, sendMessage, getPublicProfile,
  markChatAsRead, markChatSeen, markThreadMessagesRead, setChatTyping, toggleMessageReaction,
  toggleBlockUser, editMessage, deleteMessage, deleteConversationForUser, createOrGetChat,
  subscribeUserProfile,
} from '../services/firestoreService';
import { resolveUsername } from '../services/usernameService';
import { convertFileToBase64 } from '../lib/fileUtils';
import { collection, query, orderBy as qOrderBy, limit as qLimit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Avatar from '../components/common/Avatar';
import {
  Send, ArrowLeft, Paperclip, X, Smile, MoreVertical, Ban,
  Trash2, Pencil, Check, MessageSquare, Search, Plus, Copy,
  Reply as ReplyIcon, ChevronDown, PencilLine, CornerUpLeft, AtSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Messages.module.css';

const TYPING_FRESH_MS = 4000;     // chat.typing[uid] newer than this = typing
const TYPING_WRITE_MS = 2000;     // throttle our own typing writes
const ONLINE_WINDOW_MS = 120000;  // lastActiveAt newer than this = online
const GROUP_WINDOW_MS = 5 * 60000;
const EDIT_WINDOW_MS = 60 * 60000;

const QUICK_REACTIONS = ['❤️', '🔥', '😂', '👍', '😮', '😢'];

const ANIMATED_EMOJIS = [
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.gif',
];

/* ── time helpers ────────────────────────────────────────────────────────── */

const msOf = (ts) => (ts?.toMillis ? ts.toMillis() : typeof ts === 'number' ? ts : 0);

function relTime(ms, tick) { // eslint-disable-line no-unused-vars
  if (!ms) return '';
  const diff = Date.now() - ms;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 7 * 86400000) return new Date(ms).toLocaleDateString([], { weekday: 'short' });
  return new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function formatClock(ts) {
  if (!ts) return '';
  return new Date(msOf(ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(ms) {
  const d = new Date(ms);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today - that) / 86400000;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}

function presenceLabel(lastActiveAt) {
  if (!lastActiveAt) return 'Offline';
  const diff = Date.now() - lastActiveAt;
  if (diff < ONLINE_WINDOW_MS) return 'Active now';
  if (diff < 3600000) return `Active ${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (diff < 86400000) return `Active ${Math.floor(diff / 3600000)}h ago`;
  return 'Offline';
}

export default function Messages() {
  const { profile } = useAuthStore();
  const params = useParams();
  const navigate = useNavigate();
  const myId = profile?.id;

  // :handle is either the chat id or /@username. Handles resolve to (or
  // create) the chat; the @username stays in the URL as the pretty form.
  const rawHandle = params.handle || null;
  const isHandle = typeof rawHandle === 'string' && rawHandle.startsWith('@');
  const [activeChatId, setActiveChatId] = useState(!isHandle ? rawHandle : null);
  const [resolving, setResolving] = useState(isHandle);
  const [resolveError, setResolveError] = useState(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // @username → chat resolution, with a HARD timeout: under Firestore quota
  // backoff these queries can pend for minutes, and a spinner that never
  // ends is worse than an honest "try again".
  useEffect(() => {
    if (!rawHandle) { setActiveChatId(null); setResolving(false); setResolveError(null); return undefined; }
    if (!rawHandle.startsWith('@')) { setActiveChatId(rawHandle); setResolving(false); setResolveError(null); return undefined; }
    let alive = true;
    setResolving(true); setActiveChatId(null); setResolveError(null);
    const timeout = setTimeout(() => {
      if (!alive) return;
      setResolving(false);
      setResolveError('The database is slow to respond right now. Give it a moment and try again.');
    }, 15000);
    resolveUsername(rawHandle.slice(1)).then((uid) => {
      if (!alive) return null;
      if (!uid) { setResolving(false); setResolveError('No one goes by that username.'); return null; }
      return createOrGetChat(myId, uid).then((id) => {
        if (alive) { setActiveChatId(id); setResolving(false); }
      });
    }).catch(() => {
      if (alive) { setResolving(false); setResolveError('Could not open that chat. Try again.'); }
    }).finally(() => clearTimeout(timeout));
    return () => { alive = false; clearTimeout(timeout); };
  }, [rawHandle, myId, retryNonce]);

  const chatId = activeChatId;

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatDoc, setChatDoc] = useState(null);
  const [profilesCache, setProfilesCache] = useState({});
  const [liveOther, setLiveOther] = useState(null); // live profile of the thread's other user
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [newChatUsers, setNewChatUsers] = useState(null); // null = loading
  const [listSearch, setListSearch] = useState('');
  const [actionMsgId, setActionMsgId] = useState(null); // bubble action bar
  const [reactMsgId, setReactMsgId] = useState(null);   // quick-reaction row
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [, setTick] = useState(0); // re-render for relative times / presence
  const [newBelow, setNewBelow] = useState(0); // FAB counter

  const messagesEndRef = useRef(null);
  const scrollRef = useRef(null);
  const nearBottomRef = useRef(true);
  const fileInputRef = useRef(null);
  const editInputRef = useRef(null);
  const typingLastWriteRef = useRef(0);
  const typingClearTimerRef = useRef(null);
  const openLastReadRef = useRef(null); // lastReadAt watermark at thread open (unread divider)
  const longPressTimerRef = useRef(null);
  const seenForChatRef = useRef(null);

  // 30s re-render so relative times and presence labels stay honest
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  /* ── conversations + profile hydration ─────────────────────────────────── */
  useEffect(() => {
    if (!myId) return undefined;
    const unsub = subscribeConversations(myId, async (chats) => {
      const visible = chats.filter((c) => {
        const deletedFor = c.deletedFor?.[myId];
        if (!deletedFor) return true;
        return (c.updatedAt?.toMillis?.() || 0) > (deletedFor.toMillis?.() || 0);
      });
      setConversations(visible);
      setProfilesCache((cache) => {
        const missing = visible
          .map((c) => c.participants.find((p) => p !== myId))
          .filter((id) => id && !cache[id]);
        if (missing.length === 0) return cache;
        const newCache = { ...cache };
        missing.forEach((id) => {
          getPublicProfile(id).then((p) => { if (p) setProfilesCache((c2) => ({ ...c2, [id]: p })); });
        });
        return newCache;
      });
    });
    return () => unsub();
  }, [myId]);

  /* ── thread subscriptions (messages + chat doc + live other profile) ───── */
  useEffect(() => {
    setMessages([]); setChatDoc(null); setReplyTo(null); setActionMsgId(null);
    setReactMsgId(null); setEditingMsgId(null); setNewBelow(0);
    openLastReadRef.current = null;
    seenForChatRef.current = null;
    nearBottomRef.current = true;
    setLiveOther(null);
    if (!chatId) return undefined;
    const unsubMsgs = subscribeMessages(chatId, (msgs) => setMessages(msgs));
    const unsubChat = subscribeChatDoc(chatId, (doc0) => {
      setChatDoc(doc0);
      if (openLastReadRef.current === null && doc0) {
        openLastReadRef.current = doc0.lastReadAt?.[myId] || 0;
      }
    });
    return () => { unsubMsgs(); unsubChat(); };
  }, [chatId, myId]);

  const activeChat = conversations.find((c) => c.id === chatId) || chatDoc;
  const otherUserId = activeChat?.participants?.find((p) => p !== myId) || null;

  useEffect(() => {
    if (!otherUserId) { setLiveOther(null); return undefined; }
    return subscribeUserProfile(otherUserId, (p) => setLiveOther(p));
  }, [otherUserId]);

  /* ── seen + receipts: on open and whenever new messages land ───────────── */
  useEffect(() => {
    if (!chatId || !myId || messages.length === 0) return;
    markChatSeen(chatId, myId);
    markThreadMessagesRead(chatId, myId);
    if (activeChat?.unreadBy?.includes(myId)) markChatAsRead(chatId, myId);
  }, [chatId, myId, messages.length, activeChat?.unreadBy]);

  /* ── scroll intelligence ────────────────────────────────────────────────── */
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
    setNewBelow(0);
    nearBottomRef.current = true;
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (nearBottomRef.current || last.senderId === myId) {
      requestAnimationFrame(() => scrollToBottom(messages.length < 30 ? 'auto' : 'smooth'));
    } else {
      setNewBelow((n) => n + 1);
    }
  }, [messages, myId, scrollToBottom]);

  useEffect(() => {
    if (editingMsgId) editInputRef.current?.focus();
  }, [editingMsgId]);

  useEffect(() => {
    if (chatId) {
      const t = setTimeout(() => document.getElementById('dm-input')?.focus(), 250);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [chatId]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottomRef.current) setNewBelow(0);
  };

  /* ── derived thread data ────────────────────────────────────────────────── */
  const otherProfile = liveOther || (otherUserId ? profilesCache[otherUserId] : null);
  const otherLastActive = msOf(otherProfile?.lastActiveAt) || null;
  const isOnline = otherLastActive && (Date.now() - otherLastActive) < ONLINE_WINDOW_MS;
  const isOtherTyping = (chatDoc?.typing?.[otherUserId] || 0) > Date.now() - TYPING_FRESH_MS;
  const isBlocked = !!otherUserId && profile?.blockedUsers?.includes(otherUserId);
  const hasBlockedMe = !!otherUserBlockedFlag(otherProfile, myId);

  const filteredConvs = conversations.filter((c) => {
    if (!listSearch.trim()) return true;
    const oId = c.participants.find((p) => p !== myId);
    const p = profilesCache[oId];
    const hay = `${p?.displayName || ''} ${p?.username || ''}`.toLowerCase();
    return hay.includes(listSearch.trim().toLowerCase());
  });

  // Read receipt: has the other user's watermark passed my last real message?
  const lastOwn = [...messages].reverse().find((m) => m.senderId === myId && !m.deleted);
  const otherReadAt = chatDoc?.lastReadAt?.[otherUserId] || 0;
  const seen = !!(lastOwn && otherReadAt >= msOf(lastOwn.createdAt) - 1000);

  // Unread divider: first message newer than the watermark captured at open
  let dividerBeforeId = null;
  if (openLastReadRef.current > 0 && chatDoc) {
    const firstNew = messages.find((m) => msOf(m.createdAt) > openLastReadRef.current && m.senderId !== myId);
    dividerBeforeId = firstNew?.id || null;
  }

  /* ── actions ────────────────────────────────────────────────────────────── */
  const handleAttachmentChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await convertFileToBase64(file);
      const isVideo = file.type.startsWith('video/');
      setAttachment({ url: base64, type: isVideo ? 'video' : 'image' });
    } catch (err) {
      toast.error(err.message || 'Failed to attach file');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearTypingSignal = useCallback(() => {
    // The typing indicator expires by freshness (4s), so no write is needed
    // here — just reset the throttle so the next burst writes fresh.
    typingLastWriteRef.current = 0;
  }, []);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!chatId || !myId) return;
    const now = Date.now();
    if (now - typingLastWriteRef.current > TYPING_WRITE_MS) {
      typingLastWriteRef.current = now;
      setChatTyping(chatId, myId, true);
    }
    clearTimeout(typingClearTimerRef.current);
    typingClearTimerRef.current = setTimeout(clearTypingSignal, TYPING_WRITE_MS + 500);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if ((!inputText.trim() && !attachment) || !chatId || !myId || sending) return;
    setSending(true);
    const text = inputText;
    const currentAttachment = attachment;
    const currentReply = replyTo;
    setInputText(''); setAttachment(null); setReplyTo(null);
    clearTimeout(typingClearTimerRef.current);
    typingLastWriteRef.current = 0;
    try {
      await sendMessage(chatId, myId, text, currentAttachment?.url || null, currentAttachment?.type || null,
        currentReply ? { id: currentReply.id, name: currentReply.name, text: currentReply.text, hasMedia: currentReply.hasMedia } : null);
    } catch {
      toast.error('Failed to send message');
      setInputText(text);
      setAttachment(currentAttachment);
      setReplyTo(currentReply);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSendEmoji = async (emojiUrl) => {
    if (!chatId || !myId) return;
    setShowEmojiPicker(false);
    try {
      await sendMessage(chatId, myId, '', emojiUrl, 'image');
    } catch {
      toast.error('Failed to send emoji');
    }
  };

  const startEdit = (msg) => {
    if ((msg.createdAt?.toMillis?.() || 0) < Date.now() - EDIT_WINDOW_MS) {
      toast.error('Messages can only be edited within 1 hour of sending.');
      return;
    }
    setEditingMsgId(msg.id);
    setEditText(msg.text || '');
    setActionMsgId(null);
  };

  const submitEdit = async () => {
    if (!editText.trim() || !editingMsgId) return;
    try {
      await editMessage(chatId, editingMsgId, editText.trim());
    } catch {
      toast.error('Could not edit message — the rules update may still be pending.');
    }
    setEditingMsgId(null); setEditText('');
  };

  const handleDeleteMessage = async (msgId) => {
    setActionMsgId(null);
    try {
      await deleteMessage(chatId, msgId);
    } catch {
      toast.error('Could not delete message — the rules update may still be pending.');
    }
  };

  const handleToggleReaction = async (msg, emoji) => {
    if (!chatId || !myId) return;
    setReactMsgId(null);
    try {
      await toggleMessageReaction(chatId, msg.id, emoji, myId);
    } catch {
      toast.error('Could not react');
    }
  };

  const handleCopy = async (msg) => {
    setActionMsgId(null);
    try {
      await navigator.clipboard.writeText(msg.text || '');
      toast.success('Copied');
    } catch { /* clipboard unavailable */ }
  };

  const startReply = (msg) => {
    setReplyTo({
      id: msg.id,
      name: msg.senderId === myId ? 'You' : (otherProfile?.displayName || 'User'),
      text: msg.text || (msg.mediaUrl ? (msg.mediaType === 'video' ? 'Sent a video' : 'Sent a photo') : ''),
      hasMedia: !!msg.mediaUrl,
    });
    setActionMsgId(null);
    document.getElementById('dm-input')?.focus();
  };

  const handleToggleBlock = async () => {
    if (!otherUserId || !myId) return;
    try {
      await toggleBlockUser(myId, otherUserId, !isBlocked);
      toast.success(isBlocked ? 'User unblocked' : 'User blocked');
      setShowMenu(false);
    } catch {
      toast.error('Failed to update block status');
    }
  };

  const handleDeleteChat = async () => {
    if (!chatId || !myId) return;
    try {
      await deleteConversationForUser(chatId, myId);
      toast.success('Conversation deleted');
      navigate('/messages');
    } catch {
      toast.error('Could not delete conversation');
    }
    setShowDeleteConfirm(false); setShowMenu(false);
  };

  const openNewChatWith = async (uid) => {
    if (!myId || !uid || uid === myId) return;
    try {
      const u = (newChatUsers || []).find((x) => x.id === uid);
      const id = await createOrGetChat(myId, uid);
      setShowNewChat(false);
      setNewChatSearch('');
      navigate(u?.username ? `/messages/@${u.username}` : `/messages/${id}`);
    } catch {
      toast.error('Could not start the chat');
    }
  };

  const loadNewChatUsers = useCallback(async (search) => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), qOrderBy('displayName'), qLimit(50)));
      const q = search.trim().toLowerCase();
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.id !== myId)
        .filter((u) => !profile?.blockedUsers?.includes(u.id))
        .filter((u) => !q || `${u.displayName || ''} ${u.username || ''}`.toLowerCase().includes(q))
        .slice(0, 20);
      return rows;
    } catch {
      return [];
    }
  }, [myId, profile?.blockedUsers]);

  useEffect(() => {
    if (!showNewChat) return;
    let alive = true;
    const t = setTimeout(() => {
      loadNewChatUsers(newChatSearch).then((rows) => { if (alive) setNewChatUsers(rows); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [showNewChat, newChatSearch, loadNewChatUsers]);

  /* ── bubble grouping: same sender within 5 min = one group ──────────────── */
  const rows = []; // { type: 'divider'|'separator'|'msg', ... }
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const ms = msOf(msg.createdAt);
    const prevMs = msOf(prev?.createdAt);
    // Just-sent messages have no createdAt until the server commit lands —
    // never let them mint a bogus 1970 separator.
    if (ms && (i === 0 || !prevMs || dayLabel(ms) !== dayLabel(prevMs))) {
      rows.push({ type: 'separator', label: dayLabel(ms), id: `sep-${msg.id}` });
    }
    if (dividerBeforeId && msg.id === dividerBeforeId) {
      rows.push({ type: 'divider', id: `new-${msg.id}` });
    }
    const grouped = !!prev && prev.senderId === msg.senderId
      && (ms && prevMs ? (ms - prevMs) < GROUP_WINDOW_MS : true)
      && !prev.deleted && !msg.deleted
      && (!ms || !prevMs || dayLabel(ms) === dayLabel(prevMs));
    const next = messages[i + 1];
    const nextMs = msOf(next?.createdAt);
    const groupEnd = !next || next.senderId !== msg.senderId
      || (!ms || !nextMs || (nextMs - ms) >= GROUP_WINDOW_MS)
      || next.deleted
      || (!ms || !nextMs || dayLabel(nextMs) !== dayLabel(ms));
    rows.push({ type: 'msg', msg, grouped, groupEnd });
  });

  const msgBeingActedOn = messages.find((m) => m.id === actionMsgId);

  return (
    <div className={styles.container}>
      {/* ── conversation rail ─────────────────────────────────────────────── */}
      <aside className={`${styles.rail} ${chatId ? styles.railHidden : ''}`}>
        <div className={styles.railHead}>
          <h2 className={styles.railTitle}><MessageSquare size={20} /> Chats</h2>
          <button className={styles.newChatBtn} onClick={() => { setShowNewChat(true); setNewChatUsers(null); }} title="New message" type="button">
            <Plus size={16} /> New
          </button>
        </div>

        <div className={styles.railSearch}>
          <Search size={14} />
          <input
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
          />
          {listSearch && (
            <button className={styles.searchClear} onClick={() => setListSearch('')} type="button"><X size={12} /></button>
          )}
        </div>

        <div className={styles.convList}>
          {conversations.length === 0 ? (
            <div className={styles.railEmpty}>
              <MessageSquare size={34} />
              <p>No conversations yet</p>
              <button className={styles.railEmptyBtn} onClick={() => setShowNewChat(true)} type="button">Start one</button>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className={styles.railEmpty}><p>No chats match “{listSearch.trim()}”.</p></div>
          ) : filteredConvs.map((chat) => {
            const oId = chat.participants.find((p) => p !== myId);
            const p = profilesCache[oId];
            const isUnread = chat.unreadBy?.includes(myId);
            const online = p?.lastActiveAt && (Date.now() - msOf(p.lastActiveAt)) < ONLINE_WINDOW_MS;
            const lastMine = chat.lastMessageSender === myId;
            return (
              <button
                key={chat.id}
                type="button"
                className={`${styles.convItem} ${chatId === chat.id ? styles.convActive : ''}`}
                onClick={() => navigate(p?.username ? `/messages/@${p.username}` : `/messages/${chat.id}`)}
              >
                <span className={styles.convAvatarWrap}>
                  <Avatar src={p?.photoURL} activeFrame={p?.activeFrame} size={50} />
                  {online && <i className={styles.onlineDot} />}
                  {isUnread && <i className={styles.unreadDot} />}
                </span>
                <span className={styles.convText}>
                  <span className={`${styles.convName} ${isUnread ? styles.convNameUnread : ''}`}>
                    {p?.displayName || 'User'}
                  </span>
                  <span className={`${styles.convPreview} ${isUnread ? styles.convPreviewUnread : ''}`}>
                    {chat.lastMessage
                      ? <>{lastMine && <em>You:</em>} {String(chat.lastMessage).slice(0, 42)}{String(chat.lastMessage).length > 42 ? '…' : ''}</>
                      : <em>Say hi 👋</em>}
                  </span>
                </span>
                <span className={styles.convTime}>{relTime(msOf(chat.updatedAt))}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── thread pane ───────────────────────────────────────────────────── */}
      <section className={`${styles.thread} ${!chatId ? styles.threadHidden : ''}`}>
        {!chatId && resolving ? (
          <div className={styles.threadEmpty}>
            <span className={styles.sendSpinner} style={{ width: 22, height: 22, borderColor: 'rgba(45,212,167,0.3)', borderTopColor: '#2DD4A7' }} />
            <h3>Opening chat…</h3>
          </div>
        ) : !chatId && resolveError ? (
          <div className={styles.threadEmpty}>
            <h3>Couldn't open that chat</h3>
            <p>{resolveError}</p>
            <button className={styles.emptyCta} onClick={() => setRetryNonce((n) => n + 1)} type="button">Try again</button>
          </div>
        ) : !chatId || (!activeChat && !otherUserId) ? (
          <div className={styles.threadEmpty}>
            <div className={styles.emptyOrb} />
            <MessageSquare size={44} />
            <h3>Your messages</h3>
            <p>Pick a conversation on the left, or start a new one.</p>
            <button className={styles.emptyCta} onClick={() => setShowNewChat(true)} type="button">
              <Plus size={15} /> New message
            </button>
          </div>
        ) : (
          <>
            {/* header */}
            <header className={styles.threadHead}>
              <button className={styles.backBtn} onClick={() => navigate('/messages')} aria-label="Back" type="button">
                <ArrowLeft size={19} />
              </button>
              <button className={styles.headIdentity} onClick={() => otherUserId && navigate(otherProfile?.username ? `/@${otherProfile.username}` : `/user/${otherUserId}`)} type="button">
                <span className={styles.headAvatarWrap}>
                  <Avatar src={otherProfile?.photoURL} activeFrame={otherProfile?.activeFrame} size={40} />
                  {isOnline && <i className={styles.onlineDot} />}
                </span>
                <span className={styles.headText}>
                  <span className={styles.headName}>
                    {otherProfile?.displayName || 'User'}
                    {otherProfile?.username && <span className={styles.headHandle}><AtSign size={10} />{otherProfile.username}</span>}
                  </span>
                  <span className={`${styles.headStatus} ${isOtherTyping ? styles.headStatusTyping : ''}`}>
                    {isOtherTyping ? 'typing…' : presenceLabel(otherLastActive)}
                  </span>
                </span>
              </button>

              <div className={styles.headMenuWrap}>
                <button className={styles.iconBtn} onClick={() => setShowMenu((v) => !v)} aria-label="Conversation menu" type="button">
                  <MoreVertical size={18} />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      className={styles.dropdown}
                      initial={{ opacity: 0, scale: 0.94, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: -6 }}
                      transition={{ duration: 0.14 }}
                    >
                      <button className={styles.dropdownItem} onClick={() => { setShowMenu(false); otherUserId && navigate(`/user/${otherUserId}`); }} type="button">
                        <AtSign size={14} /> View profile
                      </button>
                      <button className={styles.dropdownItem} onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }} type="button">
                        <Trash2 size={14} style={{ color: '#f87171' }} /> Delete chat
                      </button>
                      <div className={styles.dropdownDivider} />
                      <button className={styles.dropdownItem} onClick={handleToggleBlock} type="button">
                        <Ban size={14} /> {isBlocked ? 'Unblock user' : 'Block user'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </header>

            {/* messages */}
            <div className={styles.scroll} ref={scrollRef} onScroll={onScroll} onClick={() => { setShowMenu(false); setShowEmojiPicker(false); setActionMsgId(null); setReactMsgId(null); }}>
              {messages.length === 0 && (
                <div className={styles.threadGreeting}>
                  <Avatar src={otherProfile?.photoURL} activeFrame={otherProfile?.activeFrame} size={72} />
                  <h4>{otherProfile?.displayName || 'User'}</h4>
                  <p>
                    {otherProfile?.username ? `@${otherProfile.username} · ` : ''}
                    {otherProfile?.displayName ? `${otherProfile.displayName.split(' ')[0]} is on EcoSpark` : 'On EcoSpark'}
                  </p>
                  <span>Say hi 👋 — messages are private between the two of you.</span>
                </div>
              )}

              {rows.map((row) => {
                if (row.type === 'separator') {
                  return <div key={row.id} className={styles.dayPill}><span>{row.label}</span></div>;
                }
                if (row.type === 'divider') {
                  return <div key={row.id} className={styles.newPill}><span>New</span></div>;
                }

                const msg = row.msg;
                const mine = msg.senderId === myId;

                if (msg.deleted) {
                  return (
                    <div key={msg.id} className={`${styles.row} ${mine ? styles.rowMine : styles.rowTheirs} ${row.groupEnd ? styles.rowEnd : ''}`}>
                      {!mine && <span className={styles.avatarSlot}>{row.groupEnd && <Avatar src={otherProfile?.photoURL} activeFrame={otherProfile?.activeFrame} size={30} />}</span>}
                      <div className={styles.deletedBubble}>{mine ? 'You unsent this message' : 'This message was unsent'}</div>
                      {mine && <span className={styles.avatarSlot} />}
                    </div>
                  );
                }

                const canEdit = mine && !msg.deleted && (msOf(msg.createdAt) > Date.now() - EDIT_WINDOW_MS);
                const reactions = msg.reactions || {};
                const reactionEntries = Object.entries(reactions).filter(([, uids]) => (uids || []).length > 0);
                const showReceipt = mine && row.groupEnd && msg.id === lastOwn?.id;
                const barOpen = actionMsgId === msg.id;
                const reacting = reactMsgId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`${styles.row} ${mine ? styles.rowMine : styles.rowTheirs} ${row.groupEnd ? styles.rowEnd : ''} ${row.grouped ? styles.rowGrouped : ''}`}
                    onMouseEnter={() => !reacting && setActionMsgId(msg.id)}
                    onMouseLeave={() => { if (actionMsgId === msg.id && !reacting) setActionMsgId(null); }}
                    onTouchStart={() => {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = setTimeout(() => setActionMsgId(msg.id), 550);
                    }}
                    onTouchEnd={() => clearTimeout(longPressTimerRef.current)}
                    onDoubleClick={() => handleToggleReaction(msg, '❤️')}
                  >
                    {!mine && <span className={styles.avatarSlot}>{row.groupEnd && <Avatar src={otherProfile?.photoURL} activeFrame={otherProfile?.activeFrame} size={30} />}</span>}

                    <div className={`${styles.bubbleCol} ${mine ? styles.bubbleMine : ''}`}>
                      {msg.replyTo && (
                        <div className={`${styles.replyQuote} ${mine ? styles.replyQuoteMine : ''}`}>
                          <CornerUpLeft size={11} />
                          <span><b>{msg.replyTo.name}</b> {msg.replyTo.text || (msg.replyTo.hasMedia ? 'Photo' : '')}</span>
                        </div>
                      )}

                      {msg.mediaUrl && (
                        <div className={`${styles.mediaWrap} ${mine ? styles.mediaMine : ''}`}>
                          {msg.mediaType === 'video'
                            ? <video src={msg.mediaUrl} controls className={styles.media} />
                            : <img src={msg.mediaUrl} alt="" className={styles.media} loading="lazy" />}
                        </div>
                      )}

                      {msg.text && (
                        <div className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                          {msg.text}
                          {msg.isEdited && <span className={styles.editedTag}>edited</span>}
                        </div>
                      )}

                      {reactionEntries.length > 0 && (
                        <div className={`${styles.reactionChips} ${mine ? styles.chipsMine : ''}`}>
                          {reactionEntries.map(([emoji, uids]) => (
                            <button
                              key={emoji}
                              type="button"
                              className={`${styles.reactionChip} ${(uids || []).includes(myId) ? styles.reactionMine : ''}`}
                              onClick={() => handleToggleReaction(msg, emoji)}
                              title={`${(uids || []).length} reaction${(uids || []).length > 1 ? 's' : ''}`}
                            >
                              {emoji}{(uids || []).length > 1 && <i>{uids.length}</i>}
                            </button>
                          ))}
                        </div>
                      )}

                      {row.groupEnd && (
                        <div className={styles.bubbleFoot}>
                          <span>{formatClock(msg.createdAt)}</span>
                          {msg.isEdited && <span className={styles.editedTagFoot}>· edited</span>}
                          {showReceipt && <span className={`${styles.receipt} ${seen ? styles.receiptSeen : ''}`}>{seen ? 'Seen' : 'Sent'}</span>}
                        </div>
                      )}
                    </div>

                    {mine && <span className={styles.avatarSlot} />}

                    {/* action bar */}
                    {barOpen && (
                      <div className={`${styles.actionBar} ${mine ? styles.barLeft : styles.barRight}`}>
                        {reacting ? (
                          <>
                            {QUICK_REACTIONS.map((emoji) => (
                              <button key={emoji} type="button" className={styles.actionBtn} onClick={() => handleToggleReaction(msg, emoji)}>
                                <span style={{ fontSize: 15 }}>{emoji}</span>
                              </button>
                            ))}
                            <button type="button" className={styles.actionBtn} onClick={() => setReactMsgId(null)}><X size={13} /></button>
                          </>
                        ) : (
                          <>
                            <button type="button" className={styles.actionBtn} title="React" onClick={() => setReactMsgId(msg.id)}><Smile size={13} /></button>
                            <button type="button" className={styles.actionBtn} title="Reply" onClick={() => startReply(msg)}><ReplyIcon size={13} /></button>
                            {!!msg.text && (
                              <button type="button" className={styles.actionBtn} title="Copy" onClick={() => handleCopy(msg)}><Copy size={13} /></button>
                            )}
                            {canEdit && (
                              <button type="button" className={styles.actionBtn} title="Edit" onClick={() => startEdit(msg)}><Pencil size={13} /></button>
                            )}
                            {mine && (
                              <button type="button" className={styles.actionBtn} title="Unsend" onClick={() => handleDeleteMessage(msg.id)}><Trash2 size={13} /></button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {isOtherTyping && (
                <div className={`${styles.row} ${styles.rowTheirs} ${styles.rowEnd}`}>
                  <span className={styles.avatarSlot}><Avatar src={otherProfile?.photoURL} activeFrame={otherProfile?.activeFrame} size={30} /></span>
                  <div className={`${styles.bubble} ${styles.bubbleTheirs} ${styles.typingBubble}`}>
                    <i /><i /><i />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* scroll-to-bottom FAB */}
            {newBelow > 0 && (
              <button className={styles.jumpFab} onClick={() => scrollToBottom()} type="button">
                <ChevronDown size={15} /> {newBelow} new
              </button>
            )}

            {/* composer */}
            <div className={styles.composer}>
              {isBlocked ? (
                <div className={styles.blockedBanner}>
                  You blocked this user. <button onClick={handleToggleBlock} type="button">Unblock</button>
                </div>
              ) : hasBlockedMe ? (
                <div className={styles.blockedBanner}>You can't reply to this conversation.</div>
              ) : (
                <>
                  {replyTo && (
                    <div className={styles.replyBar}>
                      <ReplyIcon size={13} />
                      <span><b>{replyTo.name}</b> {replyTo.text || (replyTo.hasMedia ? 'Photo' : '')}</span>
                      <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" type="button"><X size={13} /></button>
                    </div>
                  )}
                  {attachment && (
                    <div className={styles.attachBar}>
                      {attachment.type === 'video' ? <video src={attachment.url} className={styles.attachMedia} /> : <img src={attachment.url} alt="" className={styles.attachMedia} />}
                      <button onClick={() => setAttachment(null)} aria-label="Remove attachment" type="button"><X size={13} /></button>
                    </div>
                  )}

                  <div className={styles.composerRow}>
                    <input type="file" accept="image/*,video/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAttachmentChange} />

                    <div className={styles.composerBox}>
                      <button type="button" className={styles.composerIcon} onClick={() => setShowEmojiPicker((v) => !v)} title="Emoji" disabled={sending}>
                        <Smile size={18} />
                      </button>
                      <input
                        id="dm-input"
                        type="text"
                        placeholder="Message…"
                        value={inputText}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onBlur={clearTypingSignal}
                        disabled={sending}
                        className={styles.composerInput}
                        autoComplete="off"
                      />
                      <button type="button" className={styles.composerIcon} onClick={() => fileInputRef.current?.click()} title="Attach" disabled={sending}>
                        <Paperclip size={17} />
                      </button>
                    </div>

                    <button className={styles.sendBtn} onClick={handleSend} disabled={(!inputText.trim() && !attachment) || sending} aria-label="Send" type="button">
                      {sending ? <span className={styles.sendSpinner} /> : <Send size={16} />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        className={styles.emojiSheet}
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                      >
                        {ANIMATED_EMOJIS.map((emoji) => (
                          <button key={emoji} type="button" className={styles.emojiBtn} onClick={() => handleSendEmoji(emoji)}>
                            <img src={emoji} alt="emoji" width={36} height={36} />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>

            {/* edit inline popover */}
            <AnimatePresence>
              {editingMsgId && (
                <motion.div
                  className={styles.editPopover}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                >
                  <span className={styles.editLabel}><PencilLine size={13} /> Edit message</span>
                  <div className={styles.editRow}>
                    <input
                      ref={editInputRef}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(); if (e.key === 'Escape') { setEditingMsgId(null); setEditText(''); } }}
                      className={styles.editInput}
                      maxLength={1000}
                    />
                    <button className={styles.editSave} onClick={submitEdit} type="button"><Check size={15} /></button>
                    <button className={styles.editCancel} onClick={() => { setEditingMsgId(null); setEditText(''); }} type="button"><X size={15} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </section>

      {/* ── new chat modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewChat(false)}>
            <motion.div
              className={styles.newChatModal}
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.newChatHead}>
                <h3>New message</h3>
                <button onClick={() => setShowNewChat(false)} aria-label="Close" type="button"><X size={16} /></button>
              </div>
              <div className={styles.newChatSearch}>
                <Search size={14} />
                <input
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  placeholder="Search people by name or @username"
                  autoFocus
                />
              </div>
              <div className={styles.newChatList}>
                {newChatUsers === null ? (
                  <p className={styles.newChatHint}>Finding people…</p>
                ) : newChatUsers.length === 0 ? (
                  <p className={styles.newChatHint}>No one matches that search.</p>
                ) : newChatUsers.map((u) => (
                  <button key={u.id} className={styles.newChatRow} onClick={() => openNewChatWith(u.id)} type="button">
                    <Avatar src={u.photoURL} activeFrame={u.activeFrame} size={40} />
                    <span className={styles.newChatText}>
                      <b>{u.displayName || 'EcoUser'}</b>
                      {u.username && <i>@{u.username}</i>}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── delete chat confirm ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(false)}>
            <motion.div
              className={styles.confirmModal}
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 size={30} style={{ color: '#f87171' }} />
              <h3>Delete chat?</h3>
              <p>This removes the conversation from your view. {otherProfile?.displayName || 'They'} will still have their copy.</p>
              <div className={styles.confirmBtns}>
                <button className={styles.confirmCancel} onClick={() => setShowDeleteConfirm(false)} type="button">Cancel</button>
                <button className={styles.confirmDanger} onClick={handleDeleteChat} type="button">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** hasBlockedMe helper — live profile carries blockedUsers. */
function otherUserBlockedFlag(otherProfile, myId) {
  return otherProfile?.blockedUsers?.includes(myId) || false;
}
