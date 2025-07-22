import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2 } from "lucide-react";

interface DocumentUploadProps {
  config: {
    llmEndpoint: string;
    milvusHost: string;
    embeddingModel: string;
  };
  onDocumentUploaded: (document: any) => void;
}

export const DocumentUpload = ({ config, onDocumentUploaded }: DocumentUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo",
        variant: "destructive",
      });
      return;
    }

    if (!config.milvusHost) {
      toast({
        title: "Error",
        description: "Configura la conexión a Milvus primero",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("embedding_model", config.embeddingModel);

      // Simular progreso de carga
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Aquí iría la llamada real al backend FastAPI
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        onDocumentUploaded({
          id: result.document_id,
          name: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          chunks: result.chunks_count,
        });

        toast({
          title: "Éxito",
          description: `Documento "${file.name}" procesado e indexado correctamente`,
        });

        setFile(null);
        if (document.querySelector('input[type="file"]')) {
          (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
        }
      } else {
        throw new Error("Error al subir el documento");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al procesar el documento. Verifica que el backend esté funcionando.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-primary">
          <Upload className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Subir Documentos</h2>
          <p className="text-sm text-muted-foreground">
            Sube PDFs o archivos de texto para indexar en Milvus
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Seleccionar Archivo
          </CardTitle>
          <CardDescription>
            Formatos soportados: PDF, TXT, DOCX, MD
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Archivo</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".pdf,.txt,.docx,.md"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>

          {file && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Procesando documento...
                </span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Subir y Procesar
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Información del proceso */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Proceso de Indexación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span>Extracción de texto del documento</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span>Segmentación en chunks para optimizar la búsqueda</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span>Generación de embeddings con {config.embeddingModel}</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span>Almacenamiento en base vectorial Milvus</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};