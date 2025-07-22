# NotebookLM RAG Backend

Sistema backend para NotebookLM con integración de Milvus, HuggingFace Embeddings y LLM remoto.

## Características

- 🧠 **RAG (Retrieval-Augmented Generation)** con Milvus como base vectorial
- 📄 **Procesamiento de documentos** (PDF, TXT, DOCX, MD)
- 🔍 **Búsqueda semántica** con embeddings de HuggingFace
- 🤖 **Integración con LLM remoto** (compatible con OpenAI API)
- 🔗 **APIs REST** para integración con n8n y frontend
- 🐳 **Dockerizado** para fácil despliegue

## Instalación y Configuración

### 1. Configuración Local

```bash
# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno (opcional)
export MILVUS_HOST=localhost
export MILVUS_PORT=19530
export LLM_ENDPOINT=http://localhost:8001/v1
```

### 2. Usando Docker Compose (Recomendado)

```bash
# Levantar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f notebook-lm-api

# Detener servicios
docker-compose down
```

### 3. Solo Milvus con Docker

```bash
# Levantar solo Milvus
docker-compose up -d etcd minio milvus

# Ejecutar API localmente
python main.py
```

## Configuración del LLM

### Gemma 3-12B con Ollama

```bash
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Descargar Gemma
ollama pull gemma:12b

# Ejecutar con API compatible OpenAI
ollama serve --port 8001
```

### Gemma 3-12B con vLLM

```bash
# Instalar vLLM
pip install vllm

# Ejecutar servidor
python -m vllm.entrypoints.openai.api_server \
  --model google/gemma-2-12b-it \
  --port 8001 \
  --served-model-name gemma
```

### Configuración Manual LLM

Si tienes tu propio servidor, asegúrate de que sea compatible con la API de OpenAI y actualiza la variable `LLM_ENDPOINT` en el código.

## API Endpoints

### POST /api/upload
Sube y procesa documentos.

```bash
curl -X POST "http://localhost:8000/api/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@documento.pdf" \
  -F "embedding_model=sentence-transformers/all-MiniLM-L6-v2"
```

### POST /api/ask
Hace preguntas sobre los documentos.

```bash
curl -X POST "http://localhost:8000/api/ask" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "¿Cuáles son los puntos principales del documento?",
    "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
    "top_k": 5
  }'
```

### GET /api/documents
Lista documentos indexados.

```bash
curl "http://localhost:8000/api/documents"
```

### DELETE /api/documents/{document_id}
Elimina un documento.

```bash
curl -X DELETE "http://localhost:8000/api/documents/{document_id}"
```

### POST /api/test-milvus
Prueba conexión a Milvus.

```bash
curl -X POST "http://localhost:8000/api/test-milvus" \
  -H "Content-Type: application/json" \
  -d '{"milvus_host": "localhost:19530"}'
```

## Integración con n8n

### Configuración Básica

1. **Instalar n8n:**
```bash
npm install -g n8n
n8n start
```

2. **Crear workflow de ejemplo:**
   - Importa los workflows desde `n8n_examples.json`
   - Configura las URLs de los endpoints
   - Ajusta los parámetros según tus necesidades

### Workflows Incluidos

1. **Upload Document**: Subida automática de documentos
2. **Ask Question**: Servicio de preguntas y respuestas
3. **Batch Processing**: Procesamiento en lote de documentos
4. **Question Answering Service**: Servicio completo de Q&A

### Ejemplo de Nodo HTTP en n8n

**Para subir documentos:**
- URL: `http://localhost:8000/api/upload`
- Método: POST
- Body Type: Form-Data
- Parámetros:
  - `file`: [archivo]
  - `embedding_model`: `sentence-transformers/all-MiniLM-L6-v2`

**Para hacer preguntas:**
- URL: `http://localhost:8000/api/ask`
- Método: POST
- Body Type: JSON
- Body:
```json
{
  "question": "{{ $json.question }}",
  "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
  "top_k": 5
}
```

## Modelos de Embeddings Recomendados

- **all-MiniLM-L6-v2**: Rápido y eficiente (384 dimensiones)
- **all-mpnet-base-v2**: Mayor calidad (768 dimensiones)
- **paraphrase-multilingual-MiniLM-L12-v2**: Soporte multilingüe
- **e5-small-v2**: Optimizado para búsqueda

## Troubleshooting

### Error de conexión a Milvus
```bash
# Verificar que Milvus esté corriendo
docker ps | grep milvus

# Revisar logs
docker-compose logs milvus
```

### Error de memoria con embeddings
```bash
# Usar modelo más pequeño
# Cambiar a: sentence-transformers/all-MiniLM-L6-v2
```

### Error de conexión al LLM
```bash
# Verificar endpoint
curl http://localhost:8001/v1/models

# Revisar logs del LLM
```

## Arquitectura

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │───▶│  FastAPI    │───▶│   Milvus    │
│   React     │    │   Backend   │    │  Vector DB  │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐    ┌─────────────┐
                   │ HuggingFace │    │  Gemma 3    │
                   │ Embeddings  │    │  LLM Remote │
                   └─────────────┘    └─────────────┘
```

## Contribución

1. Fork el repositorio
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## Licencia

MIT License