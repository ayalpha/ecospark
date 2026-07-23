import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { subscribeConversations, subscribeMessages, sendMessage, getPublicProfile, markChatAsRead } from '../services/firestoreService';
import { convertFileToBase64 } from '../lib/fileUtils';
import Avatar from '../components/common/Avatar';
import { Send, ArrowLeft, Paperclip, X } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Messages.module.css';

export default function Messages() {
  const { profile } = useAuthStore();
  const { chatId } = useParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [profilesCache, setProfilesCache] = useState({});
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Subscribe to user's conversations
  useEffect(() => {
    if (!profile?.id) return;
    const unsub = subscribeConversations(profile.id, async (chats) => {
      setConversations(chats);
      
      const newCache = { ...profilesCache };
      let updated = false;
      
      for (const chat of chats) {
        const otherId = chat.participants.find(p => p !== profile.id);
        if (otherId && !newCache[otherId]) {
          const pubProf = await getPublicProfile(otherId);
          if (pubProf) {
            newCache[otherId] = pubProf;
            updated = true;
          }
        }
      }
      
      if (updated) {
        setProfilesCache(newCache);
      }
    });
    return () => unsub();
  }, [profile?.id]);

  // Subscribe to active chat messages
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeMessages(chatId, (msgs) => {
      setMessages(msgs);
    });

    // Mark chat as read if unread by me
    const activeChat = conversations.find(c => c.id === chatId);
    if (activeChat && activeChat.unreadBy?.includes(profile?.id)) {
      markChatAsRead(chatId, profile.id);
    }

    return () => unsub();
  }, [chatId, conversations, profile?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, attachment]);

  const handleAttachmentChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await convertFileToBase64(file);
      const isVideo = file.type.startsWith('video/');
      setAttachment({
        url: base64,
        type: isVideo ? 'video' : 'image'
      });
    } catch (err) {
      toast.error(err.message || 'Failed to attach file');
    }
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachment) || !chatId || !profile?.id || sending) return;
    
    setSending(true);
    const text = inputText;
    const currentAttachment = attachment;
    
    setInputText('');
    setAttachment(null);
    
    try {
      await sendMessage(
        chatId, 
        profile.id, 
        text, 
        currentAttachment?.url || null, 
        currentAttachment?.type || null
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message');
      // Restore if failed
      setInputText(text);
      setAttachment(currentAttachment);
    } finally {
      setSending(false);
    }
  };

  const activeChat = conversations.find(c => c.id === chatId);
  const otherUserId = activeChat?.participants.find(p => p !== profile?.id);
  const otherUser = otherUserId ? profilesCache[otherUserId] : null;

  return (
    <div className={styles.container}>
      {/* Sidebar: Conversations List */}
      <div className={`${styles.sidebar} ${chatId ? styles.hiddenOnMobile : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2>Messages</h2>
        </div>
        <div className={styles.convList}>
          {conversations.length === 0 ? (
            <div className={styles.emptyState}>No messages yet</div>
          ) : (
            [...conversations]
              .sort((a, b) => {
                const aUnread = a.unreadBy?.includes(profile?.id) ? 1 : 0;
                const bUnread = b.unreadBy?.includes(profile?.id) ? 1 : 0;
                if (aUnread !== bUnread) return bUnread - aUnread; // unread first
                const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
                const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
                return timeB - timeA;
              })
              .map(chat => {
              const oId = chat.participants.find(p => p !== profile?.id);
              const oProf = profilesCache[oId];
              const isUnread = chat.unreadBy?.includes(profile?.id);
              const isOnline = oProf?.lastActivityDate && (Date.now() - oProf.lastActivityDate.toMillis() < 5 * 60 * 1000);
              return (
                <div 
                  key={chat.id} 
                  className={`${styles.convItem} ${chatId === chat.id ? styles.active : ''} ${isUnread ? styles.unreadChat : ''}`}
                  style={{ position: 'relative', borderLeft: isUnread ? '4px solid var(--color-primary)' : '4px solid transparent' }}
                  onClick={() => navigate(`/messages/${chat.id}`)}
                >
                  <div style={{ position: 'relative' }}>
                    <Avatar src={oProf?.photoURL} activeFrame={oProf?.activeFrame} size={48} />
                    {isOnline && (
                      <div style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 14, height: 14, background: '#10B981', border: '2px solid var(--color-surface)',
                        borderRadius: '50%', zIndex: 2
                      }} title="Online" />
                    )}
                  </div>
                  <div className={styles.convInfo}>
                    <h4 style={{ fontWeight: isUnread ? 'bold' : 'normal', color: isUnread ? 'var(--color-text)' : 'inherit' }}>
                      {oProf?.displayName || 'User'}
                    </h4>
                    <p style={{ fontWeight: isUnread ? '600' : 'normal', color: isUnread ? 'var(--color-primary)' : 'inherit' }}>
                      {chat.lastMessage || 'New Conversation'}
                    </p>
                  </div>
                  {isUnread && (
                    <div style={{
                      width: 10, height: 10, background: 'var(--color-primary)',
                      borderRadius: '50%', flexShrink: 0, alignSelf: 'center', marginLeft: 'auto'
                    }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${styles.chatArea} ${!chatId ? styles.hiddenOnMobile : ''}`}>
        {!chatId ? (
          <div className={styles.noChatSelected}>
            <div className={styles.noChatIcon}>💬</div>
            <h3>Your Messages</h3>
            <p>Select a conversation or start a new one from a user's profile.</p>
          </div>
        ) : (
          <>
            <div className={styles.chatHeader}>
              <button className={styles.backBtn} onClick={() => navigate('/messages')}>
                <ArrowLeft size={24} />
              </button>
              <Avatar src={otherUser?.photoURL} activeFrame={otherUser?.activeFrame} size={40} />
              <h3>{otherUser?.displayName || 'User'}</h3>
            </div>
            
            <div className={styles.messagesList}>
              {messages.map(msg => {
                const isMe = msg.senderId === profile?.id;
                return (
                  <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.sent : styles.received}`}>
                    {!isMe && (
                      <Avatar src={otherUser?.photoURL} activeFrame={otherUser?.activeFrame} size={28} />
                    )}
                    <div className={styles.messageContent}>
                      {msg.mediaUrl && (
                        <div className={styles.mediaContainer}>
                          {msg.mediaType === 'video' ? (
                            <video src={msg.mediaUrl} controls className={styles.chatMedia} />
                          ) : (
                            <img src={msg.mediaUrl} alt="Attached image" className={styles.chatMedia} />
                          )}
                        </div>
                      )}
                      {msg.text && (
                        <div className={styles.messageBubble}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              {attachment && (
                <div className={styles.attachmentPreview}>
                  <button className={styles.removeAttachmentBtn} onClick={() => setAttachment(null)}>
                    <X size={16} />
                  </button>
                  {attachment.type === 'video' ? (
                    <video src={attachment.url} className={styles.previewMedia} />
                  ) : (
                    <img src={attachment.url} alt="Preview" className={styles.previewMedia} />
                  )}
                </div>
              )}
              <form className={styles.messageInputForm} onSubmit={handleSend}>
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleAttachmentChange}
                />
                <button 
                  type="button" 
                  className={styles.attachBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                >
                  <Paperclip size={20} />
                </button>
                <input 
                  type="text" 
                  placeholder="Message..." 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  disabled={sending}
                />
                <button type="submit" disabled={(!inputText.trim() && !attachment) || sending}>
                  {sending ? '...' : <Send size={20} />}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
