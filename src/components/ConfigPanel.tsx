import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings, Database, Brain, TestTube, CheckCircle, XCircle } from "lucide-react";

interface ConfigPanelProps {
  config: {
    llmEndpoint: string;
    milvusHost: string;
    embeddingModel: string;
  };
  onConfigChange: (config: any) => void;
}

export const ConfigPanel = ({ config, onConfigChange }: ConfigPanelProps) => {
  const [localConfig, setLocalConfig] = useState({
    llmEndpoint: "https://lmstudiomacmini.gse.com.co:2443/v1",
    milvusHost: "n8nmacmini.gse.com.co:19531",
    embeddingModel: "sentence-transformers/all-MiniLM-L6-v2",
    ...config
  });
  const [isTestingLLM, setIsTestingLLM] = useState(false);
  const [isTestingMilvus, setIsTestingMilvus] = useState(false);
  const [llmStatus, setLlmStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [milvusStatus, setMilvusStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const embeddingModels = [
    "sentence-transformers/all-MiniLM-L6-v2",
    "sentence-transformers/all-mpnet-base-v2",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    "intfloat/e5-small-v2",
    "BAAI/bge-small-en-v1.5",
  ];

  const handleSave = () => {
    onConfigChange(localConfig);
    toast({
      title: "Configuración guardada",
      description: "Los cambios han sido aplicados correctamente",
    });
  };

  const testLLMConnection = async () => {
    setIsTestingLLM(true);
    setLlmStatus('idle');
    
    try {
      // Aquí iría la llamada real al endpoint del LLM
      const response = await fetch(`${localConfig.llmEndpoint}/v1/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setLlmStatus('success');
        toast({
          title: "Conexión LLM exitosa",
          description: "El endpoint del modelo está funcionando correctamente",
        });
      } else {
        throw new Error("Error en la conexión");
      }
    } catch (error) {
      setLlmStatus('error');
      toast({
        title: "Error de conexión LLM",
        description: "No se pudo conectar al endpoint del modelo. Verifica la URL.",
        variant: "destructive",
      });
    } finally {
      setIsTestingLLM(false);
    }
  };

  const testMilvusConnection = async () => {
    setIsTestingMilvus(true);
    setMilvusStatus('idle');
    
    try {
      // Aquí iría la llamada real a Milvus a través del backend
      const response = await fetch("/api/test-milvus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          milvus_host: localConfig.milvusHost,
        }),
      });

      if (response.ok) {
        setMilvusStatus('success');
        toast({
          title: "Conexión Milvus exitosa",
          description: "La base vectorial está accesible y funcionando",
        });
      } else {
        throw new Error("Error en la conexión");
      }
    } catch (error) {
      setMilvusStatus('error');
      toast({
        title: "Error de conexión Milvus",
        description: "No se pudo conectar a Milvus. Verifica el host y puerto.",
        variant: "destructive",
      });
    } finally {
      setIsTestingMilvus(false);
    }
  };

  const getStatusIcon = (status: 'idle' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: 'idle' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Sin probar</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-primary">
          <Settings className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Configuración del Sistema</h2>
          <p className="text-sm text-muted-foreground">
            Configura los endpoints y parámetros del sistema RAG
          </p>
        </div>
      </div>

      {/* LLM Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Configuración del LLM
            {getStatusIcon(llmStatus)}
          </CardTitle>
          <CardDescription>
            Configura el endpoint de tu modelo Gemma 3-12B (OpenAI-compatible)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="llm-endpoint">Endpoint del LLM</Label>
            <Input
              id="llm-endpoint"
              placeholder="http://localhost:8000/v1"
              value={localConfig.llmEndpoint}
              onChange={(e) => setLocalConfig({...localConfig, llmEndpoint: e.target.value})}
            />
            <p className="text-xs text-muted-foreground">
              URL base del servidor que ejecuta Gemma 3-12B con API compatible con OpenAI
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={testLLMConnection} 
              disabled={!localConfig.llmEndpoint || isTestingLLM}
              variant="outline"
              size="sm"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isTestingLLM ? "Probando..." : "Probar Conexión"}
            </Button>
            {getStatusBadge(llmStatus)}
          </div>
        </CardContent>
      </Card>

      {/* Milvus Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configuración de Milvus
            {getStatusIcon(milvusStatus)}
          </CardTitle>
          <CardDescription>
            Configura la conexión a tu instancia local de Milvus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="milvus-host">Host de Milvus</Label>
            <Input
              id="milvus-host"
              placeholder="localhost:19530"
              value={localConfig.milvusHost}
              onChange={(e) => setLocalConfig({...localConfig, milvusHost: e.target.value})}
            />
            <p className="text-xs text-muted-foreground">
              Host y puerto de tu instancia de Milvus (formato: host:puerto)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={testMilvusConnection} 
              disabled={!localConfig.milvusHost || isTestingMilvus}
              variant="outline"
              size="sm"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isTestingMilvus ? "Probando..." : "Probar Conexión"}
            </Button>
            {getStatusBadge(milvusStatus)}
          </div>
        </CardContent>
      </Card>

      {/* Embedding Model Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Modelo de Embeddings</CardTitle>
          <CardDescription>
            Selecciona el modelo de HuggingFace para generar embeddings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="embedding-model">Modelo</Label>
            <Select 
              value={localConfig.embeddingModel} 
              onValueChange={(value) => setLocalConfig({...localConfig, embeddingModel: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un modelo" />
              </SelectTrigger>
              <SelectContent>
                {embeddingModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Modelo recomendado: all-MiniLM-L6-v2 (balance entre velocidad y calidad)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Backend Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Backend FastAPI</CardTitle>
          <CardDescription>
            Información sobre el servidor backend que debes configurar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Endpoints requeridos:</h4>
              <div className="space-y-2 text-sm font-mono">
                <div><Badge variant="outline">POST</Badge> /api/upload - Subir y procesar documentos</div>
                <div><Badge variant="outline">POST</Badge> /api/ask - Hacer preguntas RAG</div>
                <div><Badge variant="outline">GET</Badge> /api/documents - Listar documentos</div>
                <div><Badge variant="outline">DELETE</Badge> /api/documents/:id - Eliminar documento</div>
                <div><Badge variant="outline">POST</Badge> /api/test-milvus - Probar conexión Milvus</div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium mb-2 text-blue-900">Dependencias de Python necesarias:</h4>
              <Textarea 
                readOnly
                value={`fastapi==0.104.1
uvicorn==0.24.0
python-multipart==0.0.6
pymilvus==2.3.4
sentence-transformers==2.2.2
langchain==0.0.350
PyPDF2==3.0.1
python-docx==1.1.0
openai==1.3.8`}
                className="text-xs font-mono h-32"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* n8n Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Integración con n8n</CardTitle>
          <CardDescription>
            Configuración para conectar con workflows de n8n
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Nodos HTTP recomendados:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">HTTP Request</Badge>
                  <span>Para llamar al endpoint /api/upload</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">HTTP Request</Badge>
                  <span>Para llamar al endpoint /api/ask</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Webhook</Badge>
                  <span>Para recibir notificaciones del sistema</span>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p><strong>Ejemplo de configuración n8n:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>URL: http://localhost:8000/api/ask</li>
                <li>Método: POST</li>
                <li>Headers: Content-Type: application/json</li>
                <li>Body: {"{ \"question\": \"tu pregunta aquí\" }"}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Configuration */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="min-w-[120px]">
          <Settings className="h-4 w-4 mr-2" />
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
};