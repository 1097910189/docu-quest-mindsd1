"""
Backend FastAPI para sistema NotebookLM con RAG
Integra Milvus, HuggingFace Embeddings y LLM remoto
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
import logging
from datetime import datetime
import json

# Importaciones para RAG
from sentence_transformers import SentenceTransformer
from pymilvus import connections, Collection, FieldSchema, CollectionSchema, DataType, utility
import openai
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import PyPDFLoader, TextLoader
from langchain.docstore.document import Document
import PyPDF2
from docx import Document as DocxDocument
import tempfile

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="NotebookLM RAG API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica dominios exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic
class AskRequest(BaseModel):
    question: str
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    top_k: int = 5
    
class MilvusTestRequest(BaseModel):
    milvus_host: str

class ConfigModel(BaseModel):
    llm_endpoint: str
    milvus_host: str
    embedding_model: str

# Variables globales
embedding_models = {}
milvus_collection = None
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
)

# Configuración
MILVUS_HOST = "localhost"
MILVUS_PORT = "19530"
COLLECTION_NAME = "documents"
LLM_ENDPOINT = "http://localhost:8000/v1"  # Endpoint por defecto

def get_embedding_model(model_name: str):
    """Obtiene el modelo de embeddings, cacheándolo si es necesario"""
    if model_name not in embedding_models:
        logger.info(f"Cargando modelo de embeddings: {model_name}")
        embedding_models[model_name] = SentenceTransformer(model_name)
    return embedding_models[model_name]

def connect_milvus(host: str = MILVUS_HOST, port: str = MILVUS_PORT):
    """Conecta a Milvus y crea la colección si no existe"""
    try:
        connections.connect("default", host=host, port=port)
        logger.info(f"Conectado a Milvus en {host}:{port}")
        
        # Definir schema de la colección
        fields = [
            FieldSchema(name="id", dtype=DataType.VARCHAR, max_length=100, is_primary=True),
            FieldSchema(name="document_id", dtype=DataType.VARCHAR, max_length=100),
            FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=65535),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=384),  # Ajustar según el modelo
            FieldSchema(name="metadata", dtype=DataType.VARCHAR, max_length=1000),
        ]
        
        schema = CollectionSchema(fields, "Colección de documentos para RAG")
        
        if not utility.has_collection(COLLECTION_NAME):
            collection = Collection(COLLECTION_NAME, schema)
            logger.info(f"Colección {COLLECTION_NAME} creada")
        else:
            collection = Collection(COLLECTION_NAME)
            logger.info(f"Colección {COLLECTION_NAME} ya existe")
            
        # Crear índice
        index_params = {
            "metric_type": "COSINE",
            "index_type": "IVF_FLAT",
            "params": {"nlist": 128}
        }
        
        if not collection.has_index():
            collection.create_index("embedding", index_params)
            logger.info("Índice creado")
            
        collection.load()
        return collection
        
    except Exception as e:
        logger.error(f"Error conectando a Milvus: {e}")
        raise HTTPException(status_code=500, detail=f"Error conectando a Milvus: {e}")

def extract_text_from_file(file_path: str, file_type: str) -> str:
    """Extrae texto de diferentes tipos de archivo"""
    try:
        if file_type == "pdf":
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text()
                return text
                
        elif file_type == "txt":
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
                
        elif file_type == "docx":
            doc = DocxDocument(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
            
        else:
            raise ValueError(f"Tipo de archivo no soportado: {file_type}")
            
    except Exception as e:
        logger.error(f"Error extrayendo texto: {e}")
        raise HTTPException(status_code=400, detail=f"Error extrayendo texto: {e}")

@app.post("/api/test-milvus")
async def test_milvus_connection(request: MilvusTestRequest):
    """Prueba la conexión a Milvus"""
    try:
        host, port = request.milvus_host.split(":")
        connections.connect("test", host=host, port=port)
        connections.disconnect("test")
        return {"status": "success", "message": "Conexión a Milvus exitosa"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error conectando a Milvus: {e}")

@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
):
    """Sube y procesa un documento, indexándolo en Milvus"""
    
    # Validar tipo de archivo
    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in ["pdf", "txt", "docx", "md"]:
        raise HTTPException(status_code=400, detail="Tipo de archivo no soportado")
    
    try:
        # Guardar archivo temporalmente
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Extraer texto
        if file_extension == "md":
            file_extension = "txt"  # Tratar markdown como texto
            
        text = extract_text_from_file(temp_file_path, file_extension)
        
        # Dividir en chunks
        documents = text_splitter.split_text(text)
        
        # Obtener modelo de embeddings
        model = get_embedding_model(embedding_model)
        
        # Generar embeddings
        embeddings = model.encode(documents)
        
        # Conectar a Milvus
        collection = connect_milvus()
        
        # Preparar datos para insertar
        document_id = str(uuid.uuid4())
        chunk_ids = []
        chunk_contents = []
        chunk_embeddings = []
        chunk_metadata = []
        
        for i, (chunk, embedding) in enumerate(zip(documents, embeddings)):
            chunk_id = f"{document_id}_chunk_{i}"
            chunk_ids.append(chunk_id)
            chunk_contents.append(chunk)
            chunk_embeddings.append(embedding.tolist())
            
            metadata = {
                "document_name": file.filename,
                "chunk_index": i,
                "upload_date": datetime.now().isoformat()
            }
            chunk_metadata.append(json.dumps(metadata))
        
        # Insertar en Milvus
        entities = [
            chunk_ids,
            [document_id] * len(chunk_ids),
            chunk_contents,
            chunk_embeddings,
            chunk_metadata
        ]
        
        collection.insert(entities)
        collection.flush()
        
        # Limpiar archivo temporal
        os.unlink(temp_file_path)
        
        logger.info(f"Documento {file.filename} procesado: {len(documents)} chunks")
        
        return {
            "status": "success",
            "document_id": document_id,
            "filename": file.filename,
            "chunks_count": len(documents),
            "message": f"Documento procesado e indexado con {len(documents)} chunks"
        }
        
    except Exception as e:
        logger.error(f"Error procesando documento: {e}")
        # Limpiar archivo temporal si existe
        if 'temp_file_path' in locals():
            try:
                os.unlink(temp_file_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Error procesando documento: {e}")

@app.post("/api/ask")
async def ask_question(request: AskRequest):
    """Procesa una pregunta usando RAG"""
    
    try:
        # Obtener modelo de embeddings
        model = get_embedding_model(request.embedding_model)
        
        # Generar embedding de la pregunta
        question_embedding = model.encode([request.question])
        
        # Conectar a Milvus y buscar
        collection = connect_milvus()
        
        search_params = {"metric_type": "COSINE", "params": {"nprobe": 10}}
        
        results = collection.search(
            data=question_embedding.tolist(),
            anns_field="embedding",
            param=search_params,
            limit=request.top_k,
            output_fields=["content", "metadata", "document_id"]
        )
        
        if not results or not results[0]:
            raise HTTPException(status_code=404, detail="No se encontraron documentos relevantes")
        
        # Extraer contexto relevante
        relevant_chunks = []
        sources = set()
        
        for hit in results[0]:
            relevant_chunks.append(hit.entity.get("content"))
            metadata = json.loads(hit.entity.get("metadata", "{}"))
            if "document_name" in metadata:
                sources.add(metadata["document_name"])
        
        # Construir prompt para el LLM
        context = "\n\n".join(relevant_chunks)
        
        prompt = f"""Basándote en el siguiente contexto, responde la pregunta de manera precisa y completa.

Contexto:
{context}

Pregunta: {request.question}

Respuesta:"""

        # Llamar al LLM remoto
        try:
            # Configurar cliente OpenAI para endpoint personalizado
            client = openai.OpenAI(
                base_url=LLM_ENDPOINT,
                api_key="dummy"  # Muchos endpoints locales no requieren API key real
            )
            
            response = client.chat.completions.create(
                model="gemma",  # Ajustar según tu configuración
                messages=[
                    {"role": "system", "content": "Eres un asistente útil que responde preguntas basándose en el contexto proporcionado."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            answer = response.choices[0].message.content
            
        except Exception as llm_error:
            logger.error(f"Error llamando al LLM: {llm_error}")
            # Respuesta de fallback
            answer = f"Error conectando al LLM. Contexto encontrado:\n\n{context[:500]}..."
        
        return {
            "answer": answer,
            "sources": list(sources),
            "context_chunks": len(relevant_chunks),
            "question": request.question
        }
        
    except Exception as e:
        logger.error(f"Error procesando pregunta: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando pregunta: {e}")

@app.get("/api/documents")
async def list_documents():
    """Lista todos los documentos indexados"""
    try:
        collection = connect_milvus()
        
        # Obtener información básica de documentos
        # Nota: En una implementación real, podrías mantener metadatos en una base de datos separada
        results = collection.query(
            expr="document_id != ''",
            output_fields=["document_id", "metadata"],
            limit=1000
        )
        
        # Agrupar por documento
        documents = {}
        for result in results:
            doc_id = result["document_id"]
            if doc_id not in documents:
                metadata = json.loads(result.get("metadata", "{}"))
                documents[doc_id] = {
                    "id": doc_id,
                    "name": metadata.get("document_name", "Documento desconocido"),
                    "upload_date": metadata.get("upload_date", ""),
                    "chunks": 0
                }
            documents[doc_id]["chunks"] += 1
        
        return {"documents": list(documents.values())}
        
    except Exception as e:
        logger.error(f"Error listando documentos: {e}")
        raise HTTPException(status_code=500, detail=f"Error listando documentos: {e}")

@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str):
    """Elimina un documento y todos sus chunks de Milvus"""
    try:
        collection = connect_milvus()
        
        # Eliminar todos los chunks del documento
        expr = f'document_id == "{document_id}"'
        collection.delete(expr)
        
        logger.info(f"Documento {document_id} eliminado")
        
        return {"status": "success", "message": f"Documento {document_id} eliminado"}
        
    except Exception as e:
        logger.error(f"Error eliminando documento: {e}")
        raise HTTPException(status_code=500, detail=f"Error eliminando documento: {e}")

@app.get("/")
async def root():
    """Endpoint de salud"""
    return {"message": "NotebookLM RAG API is running", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    """Verifica el estado del sistema"""
    try:
        # Verificar Milvus
        milvus_status = "disconnected"
        try:
            collection = connect_milvus()
            milvus_status = "connected"
        except:
            pass
        
        return {
            "status": "healthy",
            "milvus": milvus_status,
            "embedding_models_loaded": list(embedding_models.keys())
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)