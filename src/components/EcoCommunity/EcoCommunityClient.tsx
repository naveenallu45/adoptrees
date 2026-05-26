'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  UserGroupIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

type RelationshipStatus = 'none' | 'friends';
type MobileTab = 'profiles' | 'friends';

type EcoUser = {
  id: string;
  name: string;
  image: string | null;
  publicId: string | null;
  joinedAt: string | null;
};

type EcoProfile = EcoUser & {
  relationshipStatus: RelationshipStatus;
  requestId: string | null;
};

type EcoFriend = {
  friendshipId: string;
  conversationId: string | null;
  user: EcoUser;
  since: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type EcoMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type ApiResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  const result = (await response.json()) as ApiResult<T>;

  if (!response.ok || !result.success) {
    throw new Error(result.error || result.message || 'Request failed');
  }

  return result.data as T;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return 'Recently';
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function Avatar({ user, size = 'md' }: { user: EcoUser; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'h-10 w-10',
    md: 'h-14 w-14',
    lg: 'h-20 w-20',
  }[size];

  if (user.image) {
    return (
      <div className={`relative ${sizeClass} overflow-hidden rounded-full border-2 border-white/70 shadow-lg`}>
        <Image src={user.image} alt={user.name} fill className="object-cover" sizes="80px" />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-emerald-400 to-green-700 text-white shadow-lg ring-2 ring-white/50 flex items-center justify-center font-black`}>
      {getInitials(user.name)}
    </div>
  );
}

export default function EcoCommunityClient() {
  const { data: session } = useSession();
  const [profiles, setProfiles] = useState<EcoProfile[]>([]);
  const [friends, setFriends] = useState<EcoFriend[]>([]);
  const [messages, setMessages] = useState<EcoMessage[]>([]);
  const [activeFriend, setActiveFriend] = useState<EcoFriend | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('profiles');
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'checking' | 'unsupported' | 'disabled' | 'enabled'>('checking');
  const friendsSectionRef = useRef<HTMLElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const visibleProfiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return profiles;
    return profiles.filter((profile) => profile.name.toLowerCase().includes(term));
  }, [profiles, search]);

  const appendMessage = useCallback((message: EcoMessage) => {
    setMessages((currentMessages) => {
      if (currentMessages.some((currentMessage) => currentMessage.id === message.id)) {
        return currentMessages;
      }

      return [...currentMessages, message];
    });
  }, []);

  const openChat = (friend: EcoFriend) => {
    setActiveFriend(friend);
    setMobileTab('friends');
    setFriends((currentFriends) =>
      currentFriends.map((currentFriend) =>
        currentFriend.conversationId === friend.conversationId
          ? { ...currentFriend, unreadCount: 0 }
          : currentFriend
      )
    );
    window.setTimeout(() => {
      scrollToFriendsSection();
    }, 50);
  };

  const scrollToFriendsSection = () => {
    const friendsSection = friendsSectionRef.current;
    if (!friendsSection) return;

    const top = friendsSection.getBoundingClientRect().top + window.scrollY - 112;
    window.scrollTo({ top, behavior: 'auto' });
  };

  const loadCommunity = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesData, friendsData] = await Promise.all([
        fetchJson<EcoProfile[]>('/api/eco-community/profiles'),
        fetchJson<EcoFriend[]>('/api/eco-community/friends'),
      ]);

      setProfiles(profilesData);
      setFriends(friendsData);

      const conversationFromUrl =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('conversation')
          : null;
      const selectedFriend =
        friendsData.find((friend) => friend.conversationId === conversationFromUrl) || null;

      setActiveFriend((currentFriend) => {
        if (!currentFriend) return selectedFriend;
        return (
          friendsData.find((friend) => friend.conversationId === currentFriend.conversationId) ||
          selectedFriend
        );
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load Eco Community');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string, options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setMessagesLoading(true);
    }

    try {
      const data = await fetchJson<EcoMessage[]>(
        `/api/eco-community/conversations/${conversationId}/messages`
      );
      setMessages(data);
    } catch (error) {
      if (!options?.silent) {
        toast.error(error instanceof Error ? error.message : 'Failed to load messages');
      }
    } finally {
      if (!options?.silent) {
        setMessagesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  useEffect(() => {
    if (!activeFriend?.conversationId) {
      setMessages([]);
      return;
    }

    loadMessages(activeFriend.conversationId);
  }, [activeFriend?.conversationId, loadMessages]);

  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    messagesContainer.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: 'auto',
    });
  }, [messages]);

  useEffect(() => {
    const conversationId = activeFriend?.conversationId;
    if (!conversationId) return;

    const intervalId = window.setInterval(() => {
      loadMessages(conversationId, { silent: true });
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeFriend?.conversationId, loadMessages]);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotificationStatus('unsupported');
      return;
    }

    if (Notification.permission === 'granted') {
      setNotificationStatus('enabled');
    } else {
      setNotificationStatus('disabled');
    }
  }, []);

  const addEcoFriend = async (profile: EcoProfile) => {
    setBusyId(profile.id);
    try {
      const friend = await fetchJson<EcoFriend>(
        '/api/eco-community/friends',
        {
          method: 'POST',
          body: JSON.stringify({ friendId: profile.id }),
        }
      );

      setProfiles((currentProfiles) =>
        currentProfiles.filter((currentProfile) => currentProfile.id !== profile.id)
      );
      setFriends((currentFriends) => [
        friend,
        ...currentFriends.filter((currentFriend) => currentFriend.friendshipId !== friend.friendshipId),
      ]);
      setActiveFriend(null);
      setMobileTab('friends');
      window.setTimeout(() => {
        scrollToFriendsSection();
      }, 100);
      toast.success(`${profile.name} added as an Eco Friend`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add Eco Friend');
    } finally {
      setBusyId(null);
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || !activeFriend?.conversationId) return;

    setSending(true);
    try {
      const message = await fetchJson<EcoMessage>(
        `/api/eco-community/conversations/${activeFriend.conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ body: trimmedMessage }),
        }
      );
      appendMessage(message);
      setMessageText('');
      setFriends((currentFriends) =>
        currentFriends.map((friend) =>
          friend.conversationId === activeFriend.conversationId
            ? {
                ...friend,
                lastMessage: message.body,
                lastMessageAt: message.createdAt,
                unreadCount: 0,
              }
            : friend
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const enableNotifications = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotificationStatus('unsupported');
      toast.error('Push notifications are not supported by this browser');
      return;
    }

    try {
      const config = await fetchJson<{ publicKey: string | null; enabled: boolean }>(
        '/api/eco-community/push-subscriptions'
      );

      if (!config.enabled || !config.publicKey) {
        toast.error('Chat push notifications are not configured yet');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotificationStatus('disabled');
        toast.error('Notification permission was not granted');
        return;
      }

      const registration =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register('/sw.js'));
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        }));

      await fetchJson('/api/eco-community/push-subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      setNotificationStatus('enabled');
      toast.success('Chat notifications enabled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enable notifications');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-emerald-900 to-green-800 pt-24 pb-16">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-96 w-96 rounded-full bg-lime-300/10 blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-md sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-white/10 px-4 py-2 text-sm font-bold text-emerald-100">
                <SparklesIcon className="h-5 w-5" />
                Individual Eco Community
              </div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Meet Eco Friends. Grow greener together.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-emerald-50 sm:text-lg">
                Discover other Adoptrees individual users, add them directly as Eco Friends,
                and start chatting about trees, forests, and climate action.
              </p>
            </div>

            <button
              type="button"
              onClick={enableNotifications}
              disabled={notificationStatus === 'enabled' || notificationStatus === 'unsupported'}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-green-900 shadow-xl transition hover:-translate-y-0.5 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <BellIcon className="h-5 w-5" />
              {notificationStatus === 'enabled'
                ? 'Notifications Enabled'
                : notificationStatus === 'unsupported'
                  ? 'Notifications Unsupported'
                  : 'Enable Chat Notifications'}
            </button>
          </div>
        </section>

        <div className="mb-6 grid grid-cols-2 rounded-2xl bg-white/10 p-1 shadow-xl backdrop-blur-md xl:hidden">
          <button
            type="button"
            onClick={() => setMobileTab('profiles')}
            className={`rounded-xl px-4 py-3 text-sm font-black transition ${
              mobileTab === 'profiles'
                ? 'bg-white text-green-900 shadow-lg'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Eco Profiles
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileTab('friends');
              setActiveFriend(null);
            }}
            className={`rounded-xl px-4 py-3 text-sm font-black transition ${
              mobileTab === 'friends'
                ? 'bg-white text-green-900 shadow-lg'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Friends
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={`space-y-6 ${mobileTab === 'profiles' ? 'block' : 'hidden'} xl:block`}>
            <section className="rounded-3xl border border-white/20 bg-white p-5 shadow-2xl sm:p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-2xl font-black text-gray-900">
                    <UserGroupIcon className="h-7 w-7 text-green-600" />
                    Explore Profiles
                  </h2>
                  <p className="text-sm text-gray-500">Find individual users and add them as Eco Friends.</p>
                </div>
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search members"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100 sm:w-72"
                  />
                </div>
              </div>

              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
                  ))}
                </div>
              ) : visibleProfiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-green-200 bg-green-50 p-8 text-center text-green-900">
                  No Eco Community profiles found.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {visibleProfiles.map((profile) => (
                    <article
                      key={profile.id}
                      className="rounded-2xl border border-green-100 bg-gradient-to-br from-white to-emerald-50 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="flex items-start gap-4">
                        <Avatar user={profile} size="md" />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-lg font-black text-gray-900">{profile.name}</h3>
                          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                            Joined {formatDate(profile.joinedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        {profile.relationshipStatus === 'none' && (
                          <button
                            type="button"
                            onClick={() => addEcoFriend(profile)}
                            disabled={busyId === profile.id}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:bg-green-700 disabled:opacity-60"
                          >
                            <UserPlusIcon className="h-5 w-5" />
                            Add Eco Friend
                          </button>
                        )}
                        {profile.relationshipStatus === 'friends' && (
                          <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-800">
                            <CheckIcon className="h-5 w-5" />
                            Eco Friends
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

          </div>

          <aside className={`space-y-6 ${mobileTab === 'friends' ? 'block' : 'hidden'} xl:block`}>
            <section ref={friendsSectionRef} className="rounded-3xl border border-white/20 bg-white p-5 shadow-2xl sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-black text-gray-900">
                <ChatBubbleLeftRightIcon className="h-7 w-7 text-green-600" />
                {activeFriend ? 'Eco Friends Chat' : 'Eco Friends'}
              </h2>

              {friends.length === 0 ? (
                <div className="rounded-2xl bg-green-50 p-6 text-center">
                  <UserGroupIcon className="mx-auto mb-3 h-12 w-12 text-green-600" />
                  <p className="font-black text-green-900">No Eco Friends yet</p>
                  <p className="mt-1 text-sm text-green-700">Open Eco Profiles and add someone to start chatting.</p>
                </div>
              ) : !activeFriend ? (
                <div className="mb-5 space-y-3">
                  {friends.map((friend) => (
                    <div
                      key={friend.friendshipId}
                      className="rounded-2xl border border-gray-100 bg-white p-3 transition hover:border-green-200 hover:bg-green-50/60"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar user={friend.user} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-black text-gray-900">{friend.user.name}</p>
                          <p className="truncate text-xs text-gray-500">
                            {friend.lastMessage || `Friends since ${formatDate(friend.since)}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openChat(friend)}
                          className="relative inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white shadow transition hover:bg-green-700"
                        >
                          <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          Chat
                          {friend.unreadCount > 0 && (
                            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white ring-2 ring-white">
                              {friend.unreadCount > 9 ? '9+' : friend.unreadCount}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50">
                {activeFriend ? (
                  <>
                    <div className="flex items-center gap-3 border-b border-gray-100 bg-white p-4">
                      <button
                        type="button"
                        onClick={() => setActiveFriend(null)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700 transition hover:bg-green-100"
                        aria-label="Back to friends list"
                      >
                        <ArrowLeftIcon className="h-5 w-5" />
                      </button>
                      <Avatar user={activeFriend.user} size="sm" />
                      <div>
                        <p className="font-black text-gray-900">{activeFriend.user.name}</p>
                        <p className="text-xs font-semibold text-green-700">
                          Eco Friends since {formatDate(activeFriend.since)}
                        </p>
                      </div>
                    </div>

                    <div ref={messagesContainerRef} className="h-[420px] space-y-3 overflow-y-auto p-4">
                      {messagesLoading ? (
                        <div className="space-y-3">
                          {[0, 1, 2].map((item) => (
                            <div key={item} className="h-14 animate-pulse rounded-2xl bg-white" />
                          ))}
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-center">
                          <div>
                            <ChatBubbleLeftRightIcon className="mx-auto mb-3 h-12 w-12 text-green-600" />
                            <p className="font-black text-gray-900">Start the conversation</p>
                            <p className="mt-1 text-sm text-gray-500">Say hello to your Eco Friend.</p>
                          </div>
                        </div>
                      ) : (
                        messages.map((message) => {
                          const isMine = message.senderId === session?.user?.id;
                          return (
                            <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${
                                  isMine
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white text-gray-900'
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words text-sm font-semibold">{message.body}</p>
                                <p className={`mt-1 text-[11px] ${isMine ? 'text-green-100' : 'text-gray-400'}`}>
                                  {formatTime(message.createdAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form onSubmit={sendMessage} className="flex gap-2 border-t border-gray-100 bg-white p-3">
                      <input
                        value={messageText}
                        onChange={(event) => setMessageText(event.target.value)}
                        maxLength={1000}
                        placeholder={`Message ${activeFriend.user.name}`}
                        className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                      />
                      <button
                        type="submit"
                        disabled={sending || !messageText.trim()}
                        className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-4 py-3 text-white shadow-lg transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Send message"
                      >
                        <PaperAirplaneIcon className="h-5 w-5" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="hidden" />
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
