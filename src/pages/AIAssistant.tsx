import { useState, useRef, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Bot, User, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: any;
  responseType?: string;
  timestamp: Date;
}

export default function AIAssistant() {
  const { company } = useCompany();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI business assistant. I can help you with:\n\n• Finding vacant media assets\n• Checking pending invoices\n• Client summaries and analytics\n• Campaign performance metrics\n• Power bill tracking\n\nWhat would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !company) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('business-ai-assistant', {
        body: {
          message: input,
          companyId: company.id
        }
      });

      if (error) {
        if (error.message.includes('429') || error.message.includes('Rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (error.message.includes('402') || error.message.includes('Payment')) {
          throw new Error('AI credits exhausted. Please contact support to add credits.');
        }
        throw error;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.data.summary || data.data.text || 'Here are your results:',
        data: data.data,
        responseType: data.responseType,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error querying AI:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get response. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (message: Message) => {
    if (message.role === 'user') {
      return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
    }

    if (message.responseType === 'table' && message.data) {
      return (
        <div className="space-y-3">
          <p className="text-sm">{message.content}</p>
          {message.data.data.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {message.data.columns.map((col: string, idx: number) => (
                      <TableHead key={idx}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {message.data.data.map((row: any[], rowIdx: number) => (
                    <TableRow key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <TableCell key={cellIdx}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      );
    }

    if (message.responseType === 'cards' && message.data) {
      return (
        <div className="space-y-3">
          <p className="text-sm">{message.content}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {message.data.cards?.map((card: any, idx: number) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs">{card.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{card.value}</p>
                    {card.variant === 'success' && <TrendingUp className="h-5 w-5 text-green-600" />}
                    {card.variant === 'warning' && <AlertCircle className="h-5 w-5 text-amber-600" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {message.data.table && message.data.table.data.length > 0 && (
            <div className="border rounded-lg overflow-hidden mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    {message.data.table.columns.map((col: string, idx: number) => (
                      <TableHead key={idx}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {message.data.table.data.map((row: any[], rowIdx: number) => (
                    <TableRow key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <TableCell key={cellIdx}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      );
    }

    return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
  };

  const quickQuestions = [
    "Show me vacant media in Hyderabad",
    "What are my pending invoices?",
    "Give me client summary",
    "Show campaign analytics",
    "Check unpaid power bills"
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">AI Business Assistant</h1>
            <p className="text-sm text-primary-foreground/80">
              Ask me anything about your media business
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
            )}
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : 'bg-muted'
              }`}
            >
              {renderMessageContent(message)}
              <p className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-secondary" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="bg-muted rounded-lg p-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-background p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((question, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => setInput(question)}
              disabled={isLoading}
            >
              {question}
            </Button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your business data..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
