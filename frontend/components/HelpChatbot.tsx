'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, ChevronDown } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

const KNOWLEDGE_BASE = [
  {
    keywords: ['price', 'cost', 'fee', 'pay', 'reward'],
    answer: "Pricing is negotiated between the Sender and the Carrier. When creating a package, the Sender sets a 'Reward Amount'. The Carrier can accept this or they can discuss a different price directly."
  },
  {
    keywords: ['safe', 'trust', 'verify', 'scam', 'stolen', 'security'],
    answer: "Safety is our top priority! All users must verify their ID. We use a Trust Score system (0-100), AI Risk Analysis for packages, and a secure payment escrow system that only releases funds when the package is delivered."
  },
  {
    keywords: ['match', 'ai', 'find carrier', 'how to find'],
    answer: "Our AI matches packages to trips based on the route, date, weight capacity, and Carrier trust score. Just go to your Package and click the 'Find Matches' button with the Zap icon!"
  },
  {
    keywords: ['prohibited', 'banned', 'illegal', 'drugs', 'weapons', 'allow'],
    answer: "Prohibited items include: Illegal drugs, weapons, hazardous materials, live animals, perishable foods, and anything illegal in the source or destination country. All packages are subject to inspection by the Carrier."
  },
  {
    keywords: ['carrier', 'travel', 'trip', 'driver'],
    answer: "To become a Carrier, go to the Dashboard and click 'Create Trip'. Enter your travel route, date, and vehicle capacity. Package senders will then be able to match with your trip!"
  },
  {
    keywords: ['hello', 'hi', 'hey', 'help'],
    answer: "Hello! I am the Crowd Carry Support Bot. How can I help you today? You can ask me about pricing, safety, finding matches, or how to become a carrier!"
  }
];

export default function HelpChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "Hi there! 👋 I'm the Crowd Carry Assistant. How can I help you today?",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const findBestAnswer = (query: string) => {
    const lowerQuery = query.toLowerCase();
    for (const item of KNOWLEDGE_BASE) {
      if (item.keywords.some(kw => lowerQuery.includes(kw))) {
        return item.answer;
      }
    }
    return "I'm not quite sure about that. You can email our human support team at support@crowdcarry.com for more detailed help!";
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate network delay and bot "thinking"
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: findBestAnswer(userMessage.text),
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="glass-card mb-4 w-[350px] sm:w-[400px] h-[500px] max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 shadow-2xl border-indigo-500/20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
          
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white font-syne">Support Bot</h3>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Online
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`flex gap-2 max-w-[85%] ${msg.isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-auto ${
                    msg.isBot ? 'bg-indigo-500/20 text-indigo-400' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {msg.isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  
                  {/* Bubble */}
                  <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                    msg.isBot 
                      ? 'bg-white/5 border border-white/10 text-gray-200 rounded-bl-sm' 
                      : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-2 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-auto">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 rounded-bl-sm flex items-center gap-1.5 h-11">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md relative z-10">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="w-full bg-white/5 border border-white/10 rounded-full pl-4 pr-12 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={!inputText.trim() || isTyping}
                className="absolute right-2 p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-110 hover:shadow-indigo-500/50 transition-all duration-300 z-50 ${isOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100 absolute'}`}
      >
        <MessageCircle className="w-7 h-7" />
      </button>
      
      {/* Invisible placeholder to maintain layout flow if needed, though position is fixed */}
      <div className={`w-14 h-14 ${!isOpen && 'hidden'}`} />
    </div>
  );
}
