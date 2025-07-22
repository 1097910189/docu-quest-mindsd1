import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, FileText, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: Date;
}

interface ChatInterfaceProps {
  config: {
    llmEndpoint: string;
    milvusHost: string;
    embeddingModel: string;
  };
}

export const ChatInterface = ({ config }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!config.llmEndpoint || !config.milvusHost) {
      toast({
        title: "Error",
        description: "Configura los endpoints de LLM y Milvus primero",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Aquí iría la llamada real al backend FastAPI
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userMessage.content,
          embedding_model: config.embeddingModel,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.answer,
          sources: result.sources || [],
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error("Error al procesar la pregunta");
      }
    } catch (error) {
      // Respuesta de ejemplo para demostración
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Lo siento, no puedo procesar tu pregunta en este momento. Asegúrate de que el backend FastAPI esté funcionando y configurado correctamente.\n\nPara probar el sistema:\n1. Configura los endpoints en la pestaña Config\n2. Sube algunos documentos\n3. Haz preguntas sobre el contenido",
        sources: [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      toast({
        title: "Error",
        description: "Error al conectar con el backend. Verifica la configuración.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-ai">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Chat RAG</h2>
          <p className="text-sm text-muted-foreground">
            Haz preguntas sobre tus documentos indexados
          </p>
        </div>
      </div>

      {/* Chat Messages */}
      <Card className="h-[500px] flex flex-col">
        <CardContent className="flex-1 p-0">
          <ScrollArea ref={scrollAreaRef} className="h-full p-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div className="space-y-3">
                  <Bot className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="font-medium text-foreground">¡Listo para ayudarte!</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Haz preguntas sobre los documentos que has subido. 
                      El sistema buscará información relevante y generará respuestas contextuales.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex gap-3 max-w-[80%] ${
                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div
                          className={`rounded-lg px-3 py-2 text-sm ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                        {message.sources && message.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {message.sources.map((source, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                {source}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Pensando...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu pregunta aquí..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-3 text-foreground">Preguntas de ejemplo:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "Resúmeme los puntos principales de los documentos",
              "¿Qué información específica contiene sobre...?",
              "Compara las ideas entre diferentes documentos",
              "Extrae las conclusiones más importantes"
            ].map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInput(example)}
                disabled={isLoading}
                className="text-left justify-start h-auto py-2 px-3"
              >
                <span className="text-xs text-muted-foreground truncate">
                  {example}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};