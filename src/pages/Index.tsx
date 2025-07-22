import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ChatInterface } from "@/components/ChatInterface";
import { DocumentList } from "@/components/DocumentList";
import { ConfigPanel } from "@/components/ConfigPanel";
import { Brain, FileText, MessageSquare, Settings } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [documents, setDocuments] = useState<any[]>([]);
  const [config, setConfig] = useState({
    llmEndpoint: "",
    milvusHost: "",
    embeddingModel: "sentence-transformers/all-MiniLM-L6-v2"
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-ai">
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">NotebookLM</h1>
              <p className="text-sm text-muted-foreground">Sistema RAG con Milvus y LLM</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-md mx-auto">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-6">
            <Card className="p-6 shadow-ai">
              <ChatInterface config={config} />
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <Card className="p-6 shadow-ai">
              <DocumentUpload 
                config={config} 
                onDocumentUploaded={(doc) => setDocuments(prev => [...prev, doc])}
              />
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card className="p-6 shadow-ai">
              <DocumentList 
                documents={documents} 
                config={config}
                onDocumentsChange={setDocuments}
              />
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <Card className="p-6 shadow-ai">
              <ConfigPanel 
                config={config} 
                onConfigChange={setConfig}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;