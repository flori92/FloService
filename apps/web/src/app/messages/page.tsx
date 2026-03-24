"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, Send, MoreVertical, CheckCheck,
  MessageSquare, ArrowLeft, Phone, Video, Smile, Paperclip,
  X, ChevronLeft, ShieldCheck, Star, MapPin, Clock,
  FileText, Mic, Reply, Pin, Archive,
} from "lucide-react";

type ChatUser = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  specialization: string;
  rating: number;
  pinned?: boolean;
};

const MOCK_CHATS: ChatUser[] = [
  {
    id: "1",
    name: "Marc Dubois",
    avatar: "https://ui-avatars.com/api/?name=Marc+Dubois&background=e0e7ff&color=4f46e5&bold=true",
    lastMessage: "Je peux passer demain vers 14h.",
    time: "10:42",
    unread: 2,
    online: true,
    specialization: "Plombier",
    rating: 4.9,
    pinned: true,
  },
  {
    id: "2",
    name: "Sophie Martin",
    avatar: "https://ui-avatars.com/api/?name=Sophie+Martin&background=fce7f3&color=db2777&bold=true",
    lastMessage: "Merci pour le devis !",
    time: "Hier",
    unread: 0,
    online: false,
    specialization: "Electricienne",
    rating: 4.7,
  },
  {
    id: "3",
    name: "Artisans Express",
    avatar: "https://ui-avatars.com/api/?name=Artisans+Express&background=ecfdf5&color=059669&bold=true",
    lastMessage: "Avez-vous des photos du tuyau ?",
    time: "Lun",
    unread: 0,
    online: true,
    specialization: "Multi-services",
    rating: 4.5,
  },
  {
    id: "4",
    name: "Fatou Diallo",
    avatar: "https://ui-avatars.com/api/?name=Fatou+Diallo&background=fff7ed&color=ea580c&bold=true",
    lastMessage: "La prestation est terminee. Merci !",
    time: "Dim",
    unread: 0,
    online: false,
    specialization: "Menage",
    rating: 4.8,
  },
  {
    id: "5",
    name: "Ibrahim T.",
    avatar: "https://ui-avatars.com/api/?name=Ibrahim+T&background=f0fdf4&color=16a34a&bold=true",
    lastMessage: "Je vous envoie le devis ce soir.",
    time: "Sam",
    unread: 1,
    online: false,
    specialization: "Menuisier",
    rating: 4.6,
  },
];

type Message = {
  id: string;
  text: string;
  sender: "me" | "them";
  time: string;
  read: boolean;
  type?: "text" | "offer" | "system" | "image";
  offerData?: { title: string; amount: number; description: string; status: "pending" | "accepted" | "paid" };
};

const MOCK_MESSAGES: Record<string, Message[]> = {
  "1": [
    { id: "s1", text: "", sender: "them", time: "", read: true, type: "system" },
    {
      id: "m1",
      text: "Bonjour, j'ai vu votre annonce pour le remplacement de robinet. Etes-vous disponible cette semaine ?",
      sender: "them",
      time: "10:30",
      read: true,
    },
    {
      id: "m2",
      text: "Bonjour ! Oui tout a fait. Je peux vous faire un devis direct ici.",
      sender: "me",
      time: "10:35",
      read: true,
    },
    {
      id: "m3",
      text: "",
      sender: "me",
      time: "10:38",
      read: true,
      type: "offer",
      offerData: {
        title: "Remplacement complet Robinetterie",
        amount: 45000,
        description: "Fourniture + pose robinetterie cuisine. Garantie 1 an sur la main d'oeuvre.",
        status: "pending",
      },
    },
    {
      id: "m4",
      text: "Je peux passer demain vers 14h.",
      sender: "them",
      time: "10:42",
      read: true,
    },
  ],
  "2": [
    { id: "s1", text: "", sender: "them", time: "", read: true, type: "system" },
    { id: "m1", text: "Bonjour Sophie, voici le devis pour l'installation electrique.", sender: "me", time: "14:20", read: true },
    {
      id: "m2",
      text: "",
      sender: "me",
      time: "14:21",
      read: true,
      type: "offer",
      offerData: { title: "Installation 3 prises + 2 interrupteurs", amount: 75000, description: "Travaux aux normes NFC. Materiel inclus.", status: "accepted" },
    },
    { id: "m3", text: "Merci pour le devis !", sender: "them", time: "15:10", read: true },
  ],
};

const FILTER_TABS = [
  { key: "all", label: "Tous" },
  { key: "unread", label: "Non lus" },
  { key: "pinned", label: "Epingles" },
];

export default function MessagesPage() {
  const [activeChat, setActiveChat] = useState<ChatUser | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [filterTab, setFilterTab] = useState("all");
  const [showProfile, setShowProfile] = useState(false);

  const filteredChats = MOCK_CHATS.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.specialization.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterTab === "unread") return matchesSearch && c.unread > 0;
    if (filterTab === "pinned") return matchesSearch && c.pinned;
    return matchesSearch;
  });

  const currentMessages = activeChat ? MOCK_MESSAGES[activeChat.id] || [] : [];

  const openChat = (chat: ChatUser) => {
    setActiveChat(chat);
    setShowMobileChat(true);
    setShowProfile(false);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setMessageText("");
  };

  const offerStatusMap: Record<string, { label: string; color: string; action: string }> = {
    pending: { label: "En attente", color: "bg-amber-50 text-amber-700 border-amber-200", action: "Payer & Securiser" },
    accepted: { label: "Accepte", color: "bg-emerald-50 text-emerald-700 border-emerald-200", action: "Payer maintenant" },
    paid: { label: "Paye", color: "bg-brand-50 text-brand-700 border-brand-200", action: "" },
  };

  return (
    <div className="h-dvh bg-surface-50 flex flex-col">
      {/* Top bar */}
      <header className="h-[72px] bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl hover:bg-slate-100 transition-colors lg:hidden">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <Link href="/dashboard" className="hidden lg:flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              Flo<span className="text-brand-600">Service</span>
            </span>
          </Link>
          <div className="hidden lg:block h-8 w-px bg-slate-200 mx-2" />
          <h1 className="font-semibold text-slate-900">Messages</h1>
          <span className="hidden sm:flex w-6 h-6 bg-brand-600 text-white text-[10px] font-bold rounded-full items-center justify-center">
            {MOCK_CHATS.reduce((sum, c) => sum + c.unread, 0)}
          </span>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
          Tableau de bord
        </Link>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Inbox sidebar */}
        <div
          className={`w-full md:w-[380px] lg:w-[420px] border-r border-slate-100 bg-white flex flex-col shrink-0 ${
            showMobileChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search + filters */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center bg-slate-50 rounded-xl px-4 border border-slate-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Rechercher une conversation..."
                className="w-full bg-transparent border-none outline-none text-sm py-3 px-3 text-slate-800 placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterTab === tab.key
                      ? "bg-brand-600 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-500 font-medium">Aucune conversation</p>
                <p className="text-xs text-slate-400 mt-1">
                  {filterTab !== "all" ? "Essayez un autre filtre" : "Vos echanges apparaitront ici"}
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => openChat(chat)}
                  className={`w-full text-left p-4 flex items-start gap-3.5 transition-all border-b border-slate-50 ${
                    activeChat?.id === chat.id
                      ? "bg-brand-50/60 border-l-[3px] border-l-brand-600"
                      : "hover:bg-slate-50 border-l-[3px] border-l-transparent"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-12 h-12 rounded-full border-2 border-white shadow-soft"
                    />
                    {chat.online && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[2.5px] border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 truncate text-sm">{chat.name}</span>
                        {chat.pinned && <Pin className="w-3 h-3 text-brand-400 shrink-0" />}
                      </div>
                      <span className={`text-[11px] font-medium shrink-0 ${chat.unread > 0 ? "text-brand-600" : "text-slate-400"}`}>
                        {chat.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] text-slate-400">{chat.specialization}</span>
                      <span className="text-[11px] text-slate-300">&middot;</span>
                      <span className="flex items-center gap-0.5 text-[11px] text-amber-600">
                        <Star className="w-2.5 h-2.5 fill-current" /> {chat.rating}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm truncate pr-2 ${chat.unread > 0 ? "font-semibold text-slate-800" : "text-slate-500"}`}>
                        {chat.lastMessage}
                      </p>
                      {chat.unread > 0 && (
                        <span className="w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat panel */}
        {activeChat ? (
          <div className={`flex-1 flex min-w-0 ${showMobileChat ? "flex" : "hidden md:flex"}`}>
            <div className="flex-1 flex flex-col bg-white min-w-0">
              {/* Chat header */}
              <header className="h-[72px] px-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-3">
                    <div className="relative">
                      <img src={activeChat.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-soft" />
                      {activeChat.online && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-900 text-sm">{activeChat.name}</h3>
                      <span className={`text-xs font-medium ${activeChat.online ? "text-emerald-600" : "text-slate-400"}`}>
                        {activeChat.online ? "En ligne" : "Hors ligne"}
                      </span>
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hidden sm:flex">
                    <Phone className="w-[18px] h-[18px]" />
                  </button>
                  <button className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hidden sm:flex">
                    <Video className="w-[18px] h-[18px]" />
                  </button>
                  <button
                    onClick={() => setShowProfile(!showProfile)}
                    className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
                  >
                    <MoreVertical className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </header>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-surface-50 space-y-5">
                {currentMessages.map((msg) => {
                  if (msg.type === "system") {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                          Aujourd&apos;hui
                        </span>
                      </div>
                    );
                  }

                  if (msg.type === "offer" && msg.offerData) {
                    const status = offerStatusMap[msg.offerData.status];
                    return (
                      <div key={msg.id} className="flex gap-3 flex-row-reverse">
                        <div className="flex flex-col items-end gap-1.5 max-w-[85%] sm:max-w-[65%]">
                          <div className="card p-5 w-full border-2 border-brand-100">
                            <div className="flex justify-between items-start mb-3">
                              <span className="badge-brand text-[10px]">
                                <ShieldCheck className="w-3 h-3" /> Devis Sequestre
                              </span>
                              <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md border ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-800 mb-0.5 text-sm">{msg.offerData.title}</h4>
                            <p className="text-xs text-slate-500 mb-3 leading-relaxed">{msg.offerData.description}</p>
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                              <span className="text-xl font-extrabold text-slate-900">
                                {msg.offerData.amount.toLocaleString()} <span className="text-sm font-semibold text-slate-500">FCFA</span>
                              </span>
                            </div>
                            {status.action && (
                              <button className="btn-primary w-full py-3 text-sm mt-3">
                                {status.action}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 mr-1">
                            {msg.time} <CheckCheck className="w-3.5 h-3.5 text-brand-500" />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isMe = msg.sender === "me";
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                      {!isMe && (
                        <img src={activeChat.avatar} alt="" className="w-8 h-8 rounded-full shrink-0 mt-1" />
                      )}
                      <div className={`flex flex-col gap-1.5 max-w-[75%] ${isMe ? "items-end" : ""}`}>
                        <div
                          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                            isMe
                              ? "bg-brand-600 text-white rounded-br-md"
                              : "bg-white border border-slate-100 text-slate-700 rounded-bl-md shadow-soft"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] font-medium text-slate-400 ${isMe ? "mr-1" : "ml-1"}`}>
                          {msg.time}
                          {isMe && (
                            <CheckCheck className={`w-3.5 h-3.5 ${msg.read ? "text-brand-500" : "text-slate-300"}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input bar */}
              <div className="p-3 sm:p-4 border-t border-slate-100 bg-white shrink-0">
                <form onSubmit={handleSend} className="flex items-end gap-2">
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Creer un devis"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 flex items-end bg-slate-50 rounded-xl border border-slate-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Ecrivez votre message..."
                      className="flex-1 bg-transparent border-none outline-none text-sm py-3 px-4 text-slate-800 placeholder:text-slate-400"
                    />
                    <button type="button" className="p-2.5 text-slate-400 hover:text-slate-600 transition-colors">
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>

                  {messageText.trim() ? (
                    <button
                      type="submit"
                      className="w-10 h-10 shrink-0 bg-brand-600 hover:bg-brand-700 text-white rounded-xl flex items-center justify-center shadow-soft transition-all"
                    >
                      <Send className="w-[18px] h-[18px] ml-0.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-10 h-10 shrink-0 bg-brand-600 hover:bg-brand-700 text-white rounded-xl flex items-center justify-center shadow-soft transition-all"
                    >
                      <Mic className="w-[18px] h-[18px]" />
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* Right panel - Contact info */}
            {showProfile && (
              <div className="w-[320px] border-l border-slate-100 bg-white hidden lg:flex flex-col overflow-y-auto">
                <div className="p-6 text-center border-b border-slate-100">
                  <img
                    src={activeChat.avatar}
                    alt={activeChat.name}
                    className="w-20 h-20 rounded-2xl mx-auto mb-4 border-4 border-white shadow-medium"
                  />
                  <h3 className="font-bold text-slate-900 mb-0.5">{activeChat.name}</h3>
                  <p className="text-sm text-slate-500">{activeChat.specialization}</p>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-slate-800">{activeChat.rating}</span>
                    <span className="text-xs text-slate-400">/5</span>
                  </div>
                  <div className="flex gap-2 mt-4 justify-center">
                    <button className="btn-primary py-2 px-4 text-sm">
                      <MessageSquare className="w-4 h-4" /> Voir profil
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Informations</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-slate-700">Identite verifiee</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-slate-700">Abidjan, Cocody</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-slate-700">Repond en &lt;1h</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fichiers partages</h4>
                  <div className="text-center py-6">
                    <p className="text-xs text-slate-400">Aucun fichier partage</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-surface-50 text-center p-6">
            <div className="w-24 h-24 bg-white rounded-3xl border border-slate-100 shadow-soft flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-heading text-slate-800 mb-2">Vos messages</h2>
            <p className="text-slate-500 max-w-sm leading-relaxed mb-6">
              Selectionnez une conversation pour echanger et valider des devis avec vos prestataires.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Messages chiffres</span>
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-brand-400" /> Devis integres</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
