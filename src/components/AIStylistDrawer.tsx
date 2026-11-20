import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, ArrowRight, Lightbulb, Shirt } from 'lucide-react';
import { Product, CurrencyCode } from '../types';
import { askStylistAdvisor, StylistMessage } from '../services/geminiService';
import { formatPrice } from '../data/products';
import { playClickSound } from '../services/soundEffects';

interface AIStylistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentProduct: Product;
  allProducts: Product[];
  currency: CurrencyCode;
  onSelectProduct: (productId: string) => void;
}

export const AIStylistDrawer: React.FC<AIStylistDrawerProps> = ({
  isOpen,
  onClose,
  currentProduct,
  allProducts,
  currency,
  onSelectProduct,
}) => {
  const [messages, setMessages] = useState<StylistMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello, I'm your **JH Studio Stylist**. I can advise on how to style the **${currentProduct.name}**, pair complementary garments from our archive, or recommend ideal fits for any occasion.`,
      recommendedProductIds: currentProduct.pairWithIds || [],
      stylingTips: [
        `Ask: "What pants pair best with this ${currentProduct.name}?"`,
        `Ask: "Should I go true to size or size up for an oversized drape?"`,
      ],
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isTyping) return;

    playClickSound();
    const userMsg: StylistMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await askStylistAdvisor(query, currentProduct, allProducts, messages);
      const assistantMsg: StylistMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.text,
        recommendedProductIds: response.recommendedProductIds,
        stylingTips: response.tips,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    `How should I style the ${currentProduct.name}?`,
    `What shoes and trousers pair with ${currentProduct.color}?`,
    `Is the fit boxy or tailored?`,
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-stone-900 border-l border-stone-800 z-50 flex flex-col text-stone-100 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-200 flex items-center justify-center text-stone-950 shadow-md shadow-amber-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif tracking-wide text-stone-100 font-medium text-sm">
                    JH Studio AI Stylist
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Consulting on <span className="text-amber-300 font-medium">{currentProduct.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-amber-400 text-stone-950 font-medium rounded-br-sm'
                        : 'bg-stone-800/90 text-stone-200 border border-stone-700/60 rounded-bl-sm shadow-md'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Styling Tips */}
                    {msg.stylingTips && msg.stylingTips.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-stone-700/60 space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-300 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" /> Key Styling Notes
                        </p>
                        {msg.stylingTips.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px] text-stone-300">
                            <span className="text-amber-400 font-bold">·</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Complementary Garments Cards */}
                  {msg.recommendedProductIds && msg.recommendedProductIds.length > 0 && (
                    <div className="mt-2.5 w-full pl-1 space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold flex items-center gap-1">
                        <Shirt className="w-3 h-3 text-amber-400" /> Recommended Ensemble Pieces
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {msg.recommendedProductIds.map((pid) => {
                          const item = allProducts.find((p) => p.id === pid);
                          if (!item) return null;
                          return (
                            <button
                              key={pid}
                              onClick={() => {
                                playClickSound();
                                onSelectProduct(item.id);
                              }}
                              className="flex items-center gap-2 p-2 rounded-lg bg-stone-950/70 border border-stone-800 hover:border-amber-400/60 transition-all text-left group"
                            >
                              <img
                                src={item.productImage}
                                alt={item.name}
                                className="w-10 h-10 object-cover rounded bg-stone-900 border border-stone-800"
                              />
                              <div className="overflow-hidden">
                                <p className="text-xs font-medium text-stone-200 truncate group-hover:text-amber-300 transition-colors">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-stone-400">
                                  {formatPrice(item.priceUsd, currency)}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-stone-400 text-xs pl-2">
                  <Bot className="w-4 h-4 text-amber-400 animate-spin" />
                  <span className="italic font-light">Stylist is formulating thoughts...</span>
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            <div className="px-4 py-2 border-t border-stone-800/80 bg-stone-950/30 flex gap-1.5 overflow-x-auto no-scrollbar">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(qp)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-stone-800/80 hover:bg-stone-700 text-[11px] text-stone-300 border border-stone-700/60 transition-colors flex items-center gap-1"
                >
                  <span>{qp}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-stone-500" />
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-stone-800 bg-stone-950/70 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Ask about styling, pairings, or fit...`}
                className="flex-1 bg-stone-900 border border-stone-700/80 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400/80"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="p-2 rounded-xl bg-amber-400 text-stone-950 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
