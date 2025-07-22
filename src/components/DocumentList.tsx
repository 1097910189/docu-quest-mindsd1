import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FileText, Search, Trash2, RefreshCw, Database } from "lucide-react";

interface Document {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  chunks: number;
}

interface DocumentListProps {
  documents: Document[];
  config: {
    llmEndpoint: string;
    milvusHost: string;
    embeddingModel: string;
  };
  onDocumentsChange: (documents: Document[]) => void;
}

export const DocumentList = ({ documents, config, onDocumentsChange }: DocumentListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteDocument = async (documentId: string) => {
    setIsLoading(true);
    try {
      // Aquí iría la llamada real al backend FastAPI
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const updatedDocuments = documents.filter(doc => doc.id !== documentId);
        onDocumentsChange(updatedDocuments);
        
        toast({
          title: "Documento eliminado",
          description: "El documento ha sido eliminado de la base vectorial",
        });
      } else {
        throw new Error("Error al eliminar el documento");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar el documento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDocuments = async () => {
    setIsLoading(true);
    try {
      // Aquí iría la llamada real al backend FastAPI
      const response = await fetch("/api/documents");
      
      if (response.ok) {
        const result = await response.json();
        onDocumentsChange(result.documents);
        
        toast({
          title: "Lista actualizada",
          description: "La lista de documentos ha sido actualizada",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar la lista de documentos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-primary">
          <Database className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-foreground">Biblioteca de Documentos</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona los documentos indexados en Milvus
          </p>
        </div>
        <Button onClick={refreshDocuments} disabled={isLoading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar documentos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{documents.length}</div>
            <div className="text-sm text-muted-foreground">Documentos Totales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {documents.reduce((sum, doc) => sum + doc.chunks, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Chunks Indexados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {formatFileSize(documents.reduce((sum, doc) => sum + doc.size, 0))}
            </div>
            <div className="text-sm text-muted-foreground">Espacio Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-foreground mb-2">
                {documents.length === 0 ? "No hay documentos" : "No se encontraron documentos"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {documents.length === 0 
                  ? "Sube algunos documentos para comenzar a usar el sistema RAG"
                  : "Prueba con un término de búsqueda diferente"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map((document) => (
            <Card key={document.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <FileText className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{document.name}</CardTitle>
                      <CardDescription className="mt-1">
                        Subido el {formatDate(document.uploadedAt)}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteDocument(document.id)}
                    disabled={isLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>Tamaño:</span>
                    <Badge variant="secondary">{formatFileSize(document.size)}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Chunks:</span>
                    <Badge variant="secondary">{document.chunks}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Info about Milvus */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información de la Base Vectorial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado de Milvus:</span>
              <Badge variant={config.milvusHost ? "default" : "destructive"}>
                {config.milvusHost ? "Configurado" : "No configurado"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modelo de Embeddings:</span>
              <Badge variant="outline">{config.embeddingModel}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Host de Milvus:</span>
              <span className="font-mono text-xs">
                {config.milvusHost || "No configurado"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};