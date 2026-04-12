import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAI, type ChatMessage } from '@/hooks/useAI';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const { chatbot, loading } = useAI();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: userData } = useQuery({
    queryKey: ['chatbot-user-data', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('level, vip_tier, total_points, current_streak')
        .eq('id', user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id && isOpen,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    const result = await chatbot(newMessages, userData ? {
      level: userData.level,
      vipTier: userData.vip_tier,
      totalPoints: userData.total_points,
      streak: userData.current_streak,
    } : undefined);

    if (result?.reply) {
      setMessages(prev => [...prev, { role: 'assistant', content: result.reply }]);
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an issue. Please try again!' }]);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 bg-primary text-primary-foreground rounded-full p-3.5 shadow-lg hover:shadow-xl transition-all hover:scale-105 animate-in fade-in"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 fade-in" style={{ height: '460px' }}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border bg-primary/5 rounded-t-2xl">
        <div className="bg-primary/10 p-1.5 rounded-lg">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Boycott AI</p>
          <p className="text-[10px] text-muted-foreground">Live app + general assistant</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6 space-y-2">
            <Bot className="w-10 h-10 mx-auto text-primary/40" />
            <p className="text-sm text-muted-foreground">Hi! I'm Boycott AI 👋</p>
            <p className="text-xs text-muted-foreground">Ask me about the app, work, learning, tech, or general questions too.</p>
            <div className="flex flex-wrap gap-1.5 justify-center pt-2">
              {['How do I earn?', 'Best side hustles?', 'Withdrawal help'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-primary/10' : 'bg-primary/10'
            }`}>
              {msg.role === 'user' ? <User className="w-3 h-3 text-primary" /> : <Bot className="w-3 h-3 text-primary" />}
            </div>
            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-muted text-foreground rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-3 h-3 text-primary" />
            </div>
            <div className="bg-muted px-3 py-2 rounded-xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Boycott AI anything..."
            className="text-xs h-9 rounded-xl"
            disabled={loading}
          />
          <Button type="submit" size="icon" className="h-9 w-9 rounded-xl shrink-0" disabled={!input.trim() || loading}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
