"use client";

import { useState, useEffect } from "react";
import { Search, Send, FileImage, MoreVertical, CheckCheck, Clock, Check, MessageSquare } from "lucide-react";
import { supabase } from "@floservice/shared";

type ChatUser = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
};

const MOCK_CHATS: ChatUser[] = [
  { id: "1", name: "Marc Dubois (Plombier)", avatar: "https://ui-avatars.com/api/?name=Marc+Dubois", lastMessage: "Je peux passer demain vers 14h.", time: "10:42", unread: 2, online: true },
  { id: "2", name: "Sophie Martin", avatar: "https://ui-avatars.com/api/?name=Sophie+Martin&background=fce7f3&color=db2777", lastMessage: "Merci pour le devis !", time: "Hier", unread: 0, online: false },
  { id: "3", name: "Artisans Express", avatar: "https://ui-avatars.com/api/?name=Artisans+Express&background=e0e7ff&color=4f46e5", lastMessage: "Avez-vous des photos du tuyau ?", time: "Lun", unread: 0, online: true },
];

export default function MessagesPage() {
  const [activeChat, setActiveChat] = useState<ChatUser>(MOCK_CHATS[0]);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    if (!document.getElementById("kkiapay-script")) {
      const script = document.createElement("script");
      script.id = "kkiapay-script";
      script.src = "https://cdn.kkiapay.me/js/v1/kkiapay.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    // Mocking send behavior
    setMessageText("");
  };

  return (
    <div className="h-screen bg-white flex flex-col hidden sm:flex-row">
      {/* MOBILE APP BAR - Hidden on Desktop */}
      <div className="sm:hidden h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-white">
        <h1 className="font-bold text-lg text-slate-900">Messagerie</h1>
        <a href="/dashboard" className="text-sm font-semibold text-indigo-600">Fermer</a>
      </div>

      {/* LEFT SIDEBAR - INBOX LIST */}
      <div className="w-full sm:w-80 md:w-96 border-r border-slate-100 bg-slate-50/50 flex flex-col h-full flex-shrink-0">
        <div className="h-16 hidden sm:flex items-center px-6 border-b border-slate-100 bg-white justify-between">
          <a href="/dashboard" className="font-bold text-xl text-indigo-600 tracking-tight">FloService.</a>
        </div>
        
        <div className="p-4 border-b border-slate-100 bg-white">
          <h2 className="font-bold text-2xl text-slate-900 mb-4 px-2">Messages</h2>
          <div className="bg-slate-100 rounded-xl px-4 py-2 flex items-center gap-2 border border-slate-200 focus-within:bg-white focus-within:border-indigo-300 transition-colors">
            <Search className="w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Rechercher une conversation" className="bg-transparent border-none outline-none w-full text-sm font-medium text-slate-700" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {MOCK_CHATS.map((chat) => (
            <button 
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className={`w-full text-left p-4 flex items-start gap-4 transition-colors border-b border-slate-100/50 ${activeChat?.id === chat.id ? 'bg-indigo-50/50 relative' : 'hover:bg-white'}`}
            >
              {activeChat?.id === chat.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-md"></div>}
              
              <div className="relative">
                <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full border border-slate-200" />
                {chat.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-900 truncate pr-2 text-sm">{chat.name}</span>
                  <span className={`text-xs font-semibold ${chat.unread > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{chat.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-sm truncate pr-2 ${chat.unread > 0 ? 'font-bold text-slate-800' : 'text-slate-500 font-medium'}`}>{chat.lastMessage}</p>
                  {chat.unread > 0 && (
                    <span className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeChat ? (
        <div className="flex-1 flex flex-col bg-white h-full relative">
          <header className="h-16 px-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
            <div className="flex items-center gap-3">
              <img src={activeChat.avatar} alt="" className="w-10 h-10 rounded-full border border-slate-200" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm leading-none">{activeChat.name}</h3>
                <span className="text-xs font-medium text-green-600">En ligne</span>
              </div>
            </div>
            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 space-y-6">
            <div className="flex justify-center mb-8"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100/50 px-3 py-1 rounded-full">Aujourd'hui</span></div>
            
            <div className="flex gap-4">
              <img src={activeChat.avatar} alt="" className="w-8 h-8 rounded-full" />
              <div className="flex flex-col gap-1 max-w-[70%]">
                <div className="bg-white border border-slate-100 p-3 sm:p-4 rounded-2xl rounded-tl-sm shadow-sm">
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">Bonjour, j'ai vu votre annonce pour le remplacement de robinet. Êtes-vous disponible cette semaine ?</p>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 ml-1">10:30</span>
              </div>
            </div>

            <div className="flex gap-4 flex-row-reverse">
              <div className="flex flex-col items-end gap-1 max-w-[70%]">
                <div className="bg-indigo-600 p-3 sm:p-4 rounded-2xl rounded-tr-sm shadow-sm shadow-indigo-200">
                  <p className="text-sm font-medium text-white leading-relaxed">Bonjour ! Oui tout à fait. Je peux vous faire un devis direct ici.</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 mr-1">
                  10:35 <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              </div>
            </div>

            {/* KKIAPAY OFFER BUBBLE */}
            <div className="flex gap-4 flex-row-reverse">
              <div className="flex flex-col items-end gap-1 max-w-[80%] sm:max-w-[60%]">
                <div className="bg-white border-2 border-indigo-100 p-5 rounded-2xl rounded-tr-sm shadow-lg shadow-indigo-100/50 w-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase">Devis (Séquestre)</div>
                    <span className="text-lg font-extrabold text-slate-900">45 000 FCFA</span>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-1">Remplacement complet Robinetterie</h4>
                  <p className="text-sm text-slate-500 mb-5 leading-relaxed">Le prestataire a envoyé un devis. L'argent sera consigné en sécurité (Séquestre) jusqu'à validation de la prestation.</p>
                  
                  <button 
                    onClick={() => {
                      if (!(window as any).openKkiapayWidget) {
                        alert("Kkiapay charge...");
                        return;
                      }
                      (window as any).openKkiapayWidget({
                        amount: 45000,
                        position: "center",
                        callback: "",
                        data: "",
                        theme: "#4f46e5",
                        sandbox: true,
                        key: "4990916032a111b0a27d549d50958fcf0" // Clé Publique Legacy FloService
                      });
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-colors shadow-md flex justify-center items-center gap-2"
                  >
                    Payer & Sécuriser
                  </button>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 mr-1">
                  10:42 <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              </div>
            </div>

          </div>

          <div className="p-4 sm:p-6 border-t border-slate-100 bg-white">
            <form onSubmit={handleSend} className="flex gap-3">
              <button type="button" className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl border border-slate-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm" title="Créer un Devis">
                <span className="font-extrabold pb-0.5">€</span>
              </button>
              <button type="button" className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors">
                <FileImage className="w-5 h-5" />
              </button>
              <input 
                type="text" 
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Écrivez votre message..." 
                className="flex-1 bg-slate-50/50 border border-slate-200 rounded-xl px-5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
              />
              <button type="submit" className="w-12 h-12 flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30 text-center p-6">
          <div className="w-24 h-24 bg-white border border-slate-100 rounded-full flex items-center justify-center text-indigo-300 shadow-sm mb-6">
            <MessageSquare className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Vos messages</h2>
          <p className="text-slate-500 font-medium max-w-sm">Sélectionnez une conversation pour échanger et valider des devis avec vos prestataires.</p>
        </div>
      )}
    </div>
  );
}
