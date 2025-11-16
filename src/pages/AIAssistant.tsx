import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  data?: any[];
  summary?: string;
  responseType?: 'table' | 'cards' | 'text';
  timestamp: Date;
}

const QUICK_QUERIES = [
  'Show vacant media assets in Hyderabad',
  'Active campaigns for this month',
  'Pending invoices with overdue amounts',
  'List all clients in major cities',
  'Recent expenses for printing and mounting',
  'Vacant bus shelters under ₹50,000'
];

export default function AIAssistant() {
  const { company } = useCompany();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI-powered business assistant powered by Gemini. I can understand complex queries like:\n\n• "Show vacant bus shelters in Hyderabad under ₹50K"\n• "Active campaigns for Matrix this month"\n• "Pending invoices over ₹1 lakh"\n\nI support filters for location, price range, dates, status, and more. What would you like to know?',
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

  const handleSendMessage = async (queryText?: string) => {
    const query = queryText || input;
    if (!query.trim() || !company) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ask-ai', {
        body: {
          query,
          userId: company.id,
          companyId: company.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (error.message?.includes('402') || error.message?.includes('Payment')) {
          throw new Error('AI credits exhausted. Please contact support to add credits.');
        }
        throw error;
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: data.summary || 'Here are the results:',
        data: data.data,
        summary: data.summary,
        responseType: data.type,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error querying AI:', error);
      toast.error(error.message || 'Failed to process query');
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessageContent = (message: Message) => {
    if (message.type === 'user') {
      return <p className="text-sm">{message.content}</p>;
    }

    if (message.responseType === 'table' && message.data && message.data.length > 0) {
      const columns = Object.keys(message.data[0]);
      
      return (
        <div className="space-y-3">
          <p className="text-sm font-medium">{message.content}</p>
          <div className="rounded-md border max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(col => (
                    <TableHead key={col} className="capitalize whitespace-nowrap">
                      {col.replace(/_/g, ' ')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {message.data.map((row: any, idx: number) => (
                  <TableRow key={idx}>
                    {columns.map(col => (
                      <TableCell key={col}>
                        {typeof row[col] === 'number' && (col.includes('amount') || col.includes('rate'))
                          ? `₹${row[col].toLocaleString()}`
                          : row[col]?.toString() || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    return <p className="text-sm">{message.content}</p>;
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AI Assistant</h1>
        <p className="text-muted-foreground">Ask complex business questions in natural language - powered by Gemini</p>
      </div>

      {messages.length === 1 && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <h3 className="font-semibold">AI-Powered Insights - Try asking:</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              I can understand complex queries with multiple filters like location, price range, dates, and more!
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUERIES.map((query, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage(query)}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {query}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <Card className={`max-w-[80%] ${message.type === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
              <CardContent className="p-4">
                {renderMessageContent(message)}
              </CardContent>
            </Card>
            {message.type === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Try: 'Show vacant bus shelters in Hyderabad under ₹50K' or 'Active campaigns this month'"
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          onClick={() => handleSendMessage()}
          disabled={!input.trim() || isLoading}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
