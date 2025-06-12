from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Query
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
import os
import asyncio
from datetime import datetime, timezone
import random
import requests
import functools
from concurrent.futures import ThreadPoolExecutor
from starlette.middleware.base import BaseHTTPMiddleware


# --- Thread-safe data structures ---

class ThreadSafeSet:
    def __init__(self, initial=None):
        self._set = set(initial or [])
        self._lock = asyncio.Lock()
        
    async def update(self, items):
        async with self._lock:
            self._set.update(items)
    
    async def add(self, item):
        async with self._lock:
            self._set.add(item)
            
    def __contains__(self, item):
        # Read operations don't need lock for better performance
        return item in self._set
    
    async def to_list(self):
        async with self._lock:
            return list(self._set)

# --- Concurrency Limiter Middleware ---
class ConcurrencyLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_concurrent=100):
        super().__init__(app)
        self.semaphore = asyncio.Semaphore(max_concurrent)
        
    async def dispatch(self, request, call_next):
        async with self.semaphore:
            return await call_next(request)

# --- App COnfiguration ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://react-frontend:5001", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Add concurrency limiter 
app.add_middleware(ConcurrencyLimiterMiddleware, max_concurrent=50)

# --- Folders ---
BASE_DIR = os.getcwd()
ELIMINATE_FILE = os.path.join(BASE_DIR, "data", "eliminate", "domande_eliminate.json")
BLOCKS_DIR = os.path.join(BASE_DIR, "data", "blocks")
HUMAN_VALID_FILE = os.path.join(BASE_DIR, "data", "human_valid", "data.json")
FINAL_VALID_FILE = os.path.join(BASE_DIR, "data", "validated", "validated_final.json")
DOCUMENTS_FILE = os.path.join(BASE_DIR, "data", "valid", "dataset_v2.json")
COMMENTS_FILE = os.path.join(BASE_DIR, "data", "validated", "commenti.json")
CHAT_SAVE_PATH = os.path.join(BASE_DIR, "data", "chat", "chat.json")

BACKEND_HOST = os.getenv("BACKEND_HOST", "129.0.30.45")
BACKEND_PORT = os.getenv("BACKEND_PORT", "8080")
BACKEND_URL = f"http://{BACKEND_HOST}:{BACKEND_PORT}/api/agent/generate"

# --- Cache  ---
eliminated = ThreadSafeSet()
docs = []

batch_cache ={}
# --- Granular locks ---
docs_lock = asyncio.Lock()
batch_cache_lock = asyncio.Lock()
io_executor = ThreadPoolExecutor(max_workers=10) 

# --- Models ---
class EliminateRequest(BaseModel):
    eliminate: List[int]

class ValidateRequest(BaseModel):
    id_domanda: int

class HumanValidation(BaseModel):
    human_question_validation: Dict[str, str]
    human_answer_validation: Dict[str, str]
    document_question_rating: int
    document_answer_rating: int
    add_demo: Optional[bool] = False

class FeedbackComment(BaseModel):
    tag_name: Optional[str] = None
    method: Optional[str] = None
    type: Optional[str] = None
    comment: str

class ModelContentUpdate(BaseModel):
    model_name: str
    model_content: str

class ChatRequest(BaseModel):
    question: str
    session_id: str

class ChatMessage(BaseModel):
    id: int
    role: str  # "user" o "assistant"
    text: str
    rewrite: Optional[str] = None
    context: Optional[List[str]] = None



class AddDemoPayload(BaseModel):
    add_demo: bool


# --- Utility functions ---
async def load_json_async(filepath, default):
    if os.path.exists(filepath):
        try:
            loop = asyncio.get_running_loop()
            content = await loop.run_in_executor(io_executor, 
                lambda: open(filepath, 'r', encoding='utf-8').read())
            return json.loads(content)
        except Exception as e:
            print(f"Error loading {filepath}: {str(e)}", flush=True)
    return default

def load_json(filepath, default):
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return default

async def save_json_async(filepath, data):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(io_executor, _sync_save_json, filepath, data)

def _sync_save_json(filepath, data):
    # Write to temp file first then rename for atomic operation
    temp_file = f"{filepath}.tmp"
    with open(temp_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(temp_file, filepath)

async def load_all_batches():
    global batch_cache
    if not os.path.exists(BLOCKS_DIR):
        return
        
    async with batch_cache_lock:
        batch_cache.clear()
        for filename in os.listdir(BLOCKS_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(BLOCKS_DIR, filename)
                batch_data = await load_json_async(filepath, [])
                batch_cache[filepath] = batch_data

# --- Work Queue for batch processing tasks ---
work_queue = asyncio.Queue()

async def process_work_queue():
    while True:
        job = await work_queue.get()
        try:
            kwargs = job.get('kwargs', {})
            await job['func'](*job['args'], **kwargs)
        except Exception as e:
            print(f"Error processing job: {str(e)}", flush=True)
        finally:
            work_queue.task_done()

# --- Startup ---
@app.on_event("startup")
async def startup_event():
    global docs, eliminated

    os.makedirs(os.path.dirname(ELIMINATE_FILE), exist_ok=True)
    os.makedirs(os.path.dirname(FINAL_VALID_FILE), exist_ok=True)
    os.makedirs(os.path.dirname(HUMAN_VALID_FILE), exist_ok=True)
    os.makedirs(BLOCKS_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(DOCUMENTS_FILE), exist_ok=True)
    os.makedirs(os.path.dirname(CHAT_SAVE_PATH), exist_ok=True)

    # --- validated_final.json  ---
    if not os.path.exists(FINAL_VALID_FILE):
        await save_json_async(FINAL_VALID_FILE, [])  

    eliminated_data = await load_json_async(ELIMINATE_FILE, {"eliminate": []})
    await eliminated.update(int(x) for x in eliminated_data.get("eliminate", []))

    async with docs_lock:
        docs = await load_json_async(HUMAN_VALID_FILE, [])
        if not docs:
            fallback = (await load_json_async(DOCUMENTS_FILE, {})).get('qa_validation', [])
            for d in fallback:
                d.setdefault('status', 'pending')
            docs = fallback
            await save_json_async(HUMAN_VALID_FILE, docs)

    await load_all_batches()
    
    # Start background workers
    asyncio.create_task(process_work_queue())

# --- Endpoints question ---
@app.get("/api/domande")
async def get_blocco_domande():
    now = datetime.now(timezone.utc).timestamp()
    
    async with batch_cache_lock:
        for filepath, batch in batch_cache.items():
            modified = False
            available_block = None

            # First pass: reset expired blocks
            for block in batch:
                if block.get('status') == 'in_progress' and now - block.get('timestamp_in_progress', now) > 1800:
                    block['status'] = 'pending'
                    block.pop('timestamp_in_progress', None)
                    modified = True

            # Second pass: find available block
            for block in batch:
                if block.get('status') == 'pending' and block.get('id_domanda') not in eliminated:
                    
                    #  Domande_correlate eliminate
                    if "domande_correlate" in block:
                        block['domande_correlate'] = [
                            d for d in block['domande_correlate']
                            if d.get("id") not in eliminated
                        ]

                    block['status'] = 'in_progress'
                    block['timestamp_in_progress'] = now
                    available_block = block.copy()
                    modified = True
                    break
            if modified:
                # Schedule save operation but don't wait for it
                await work_queue.put({
                    'func': save_json_async,
                    'args': (filepath, batch),
                    'kwargs': {}
                })
                
            if available_block:
                return available_block

    raise HTTPException(status_code=404, detail="Nessun blocco disponibile")

@app.post("/api/domande/elimina")
async def elimina_domande(data: EliminateRequest):
    await eliminated.update(data.eliminate)
    
    # Schedule save operation in background
    eliminate_list = await eliminated.to_list()
    await work_queue.put({
        'func': save_json_async,
        'args': (ELIMINATE_FILE, {"eliminate": eliminate_list}),
        'kwargs': {}
    })
    
    return {"message": "Eliminazione eseguita", "eliminate": eliminate_list}

@app.post("/api/domande/validate")
async def validate_blocco(data: ValidateRequest):
    # Handle batch update
    async with batch_cache_lock:
        for filepath, batch in batch_cache.items():
            modified = False
            for block in batch:
                if block.get('id_domanda') == data.id_domanda:
                    block['status'] = 'completed'
                    block.pop('timestamp_in_progress', None)
                    modified = True
                    break
                    
            if modified:
                await work_queue.put({
                    'func': save_json_async,
                    'args': (filepath, batch),
                    'kwargs': {},
                })

    # Handle docs update
    async with docs_lock:
        modified = False
        for d in docs:
            if d.get('id') == data.id_domanda and d['status'] == 'pending':
                d['status'] = 'in_queue'
                modified = True
                break
                
        if modified:
            await work_queue.put({
                'func': save_json_async,
                'args': (HUMAN_VALID_FILE, docs),
                'kwargs': {}
            })
                
    return {"message": "Domanda principale validata"}

@app.get("/api/documenti/pending")
async def get_single_doc():
    now = datetime.now(timezone.utc).timestamp()

    async with docs_lock:
        # Reset expired docs
        for d in docs:
            if d.get('status') == 'in_progress' and now - d.get('timestamp_in_progress', now) > 1800:
                d['status'] = 'in_queue'
                d.pop('timestamp_in_progress', None)

        # Find an available doc
        available_docs = [d for d in docs if d['status'] == 'in_queue' and d['id'] not in eliminated]
        if not available_docs:
            raise HTTPException(status_code=404, detail="Nessun documento disponibile")

        doc = available_docs[0]
        doc['status'] = 'in_progress'
        doc['timestamp_in_progress'] = now
        
        # Schedule save for background processing
        await work_queue.put({
            'func': save_json_async,
            'args': (HUMAN_VALID_FILE, docs),
            'kwargs': {},
        })
        
        # Return a copy to avoid race conditions
        return doc.copy()

@app.post("/api/documenti/{doc_id}/validate")
async def validate_single_document(doc_id: int, data: HumanValidation):
    doc = None
    
    async with docs_lock:
        doc = next((x for x in docs if x['id'] == doc_id), None)
        if not doc:
            raise HTTPException(status_code=404, detail="Documento non trovato")
        if doc['status'] != 'in_progress':
            raise HTTPException(status_code=400, detail="Documento non disponibile")

        # update document
        doc.setdefault('metadata', {})
        doc['metadata']['human_question_validation'] = data.human_question_validation
        doc['metadata']['human_answer_validation'] = data.human_answer_validation
        doc['metadata']['document_question_rating'] = data.document_question_rating
        doc['metadata']['document_answer_rating'] = data.document_answer_rating
        doc['metadata']['add_demo'] = data.add_demo
        doc['status'] = 'validated'
        doc.pop('timestamp_in_progress', None)
        
        # Schedule save operations in background
        await work_queue.put({
            'func': save_json_async,
            'args': (HUMAN_VALID_FILE, docs),
            'kwargs': {},
        })
    
    # Load validated docs outside the docs_lock to prevent lock contention
    validated = await load_json_async(FINAL_VALID_FILE, [])
    validated.append(doc)  
    
    # Schedule save for validated docs
    await work_queue.put({
        'func': save_json_async,
        'args': (FINAL_VALID_FILE, validated),
        'kwargs': {}
    })
        
    return {"message": "Documento validato"}


@app.get("/api/documenti/final/{index}")
async def get_final_document_by_index(index: int, demo_only: bool = Query(False)):
    validated_docs = await load_json_async(FINAL_VALID_FILE, [])

    if not validated_docs:
        raise HTTPException(status_code=404, detail="Nessun documento definitivo disponibile")

    if demo_only:
        validated_docs = [
            doc for doc in validated_docs if doc.get("metadata", {}).get("add_demo") is True
        ]

    if index < 0 or index >= len(validated_docs):
        raise HTTPException(status_code=400, detail=f"Indice fuori dal range (0 - {len(validated_docs) - 1})")

    doc = validated_docs[index]

    return {
        "question": doc.get("question", ""),
        "answer": doc.get("answer", ""),
        "answer_label": doc.get("answer_label", {}),
        "answer_nina": doc.get("nina_verbose_data", {}).get("answer", ""),
        "time_nina": doc.get("nina_verbose_data", {}).get("response_time", 0),
        "contest_nina": doc.get("nina_verbose_data", {}).get("context", []),
        "metadata": doc.get("metadata", {}),
        "id": doc.get("id", ""),
        "index": index,
        "total": len(validated_docs)
    }



@app.get("/api/statistiche")
async def get_stats():
    # Load docs stats
    async with docs_lock:
        docs_copy = docs.copy()  
    
    total_docs = len([d for d in docs_copy if d['status'] != 'removed'])
    validated_docs = len([d for d in docs_copy if d['status'] == 'validated'])
    eliminated_list = await eliminated.to_list()
    parzial = validated_docs + len(eliminated_list) + 1
    pct_docs = (parzial / total_docs * 100) if total_docs else 0

    # Get blocks stats
    counts_blocks = {'pending': 0, 'in_progress': 0, 'completed': 0, 'removed': 0}
    
    async with batch_cache_lock:
        
        for batch in batch_cache.values():
            for block in batch:
                status = block.get('status', 'pending')
                if block.get('id_domanda') in eliminated:
                    counts_blocks['removed'] += 1
                elif status in counts_blocks:
                    counts_blocks[status] += 1
                else:
                    counts_blocks['pending'] += 1

    return {
        'docs': {
            'total': total_docs,
            'validated': validated_docs,
            'percent_validated': pct_docs
        },
        'blocks': counts_blocks
    }

@app.post("/api/feedback")
async def receive_feedback(feedback: FeedbackComment):
    existing_comments = await load_json_async(COMMENTS_FILE, [])
    existing_comments.append(feedback.model_dump())
    
    await work_queue.put({
        'func': save_json_async,
        'args': (COMMENTS_FILE, existing_comments),
        'kwargs': {},
    })
    
    return {"message": "Commento salvato"}

@app.post("/api/documenti/{doc_id}/add_model_content")
async def add_model_content(doc_id: int, data: ModelContentUpdate):
    validated_docs = await load_json_async(FINAL_VALID_FILE, [])

    target_doc = next((doc for doc in validated_docs if doc.get('id') == doc_id), None)
    
    if not target_doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")

    if "answer_label" not in target_doc or not isinstance(target_doc["answer_label"], dict):
        target_doc["answer_label"] = {}

    # nwe label es: nome_modello: risposta_modello 
    target_doc["answer_label"][data.model_name] = data.model_content
    
    await work_queue.put({
        'func': save_json_async,
        'args': (FINAL_VALID_FILE, validated_docs),
        'kwargs': {}
    })

    return {"message": "Contenuto aggiunto con successo"}


@app.post("/api/documenti/{doc_id}/add_demo")
async def update_add_demo(doc_id: int, data: AddDemoPayload):
    validated_docs = await load_json_async(FINAL_VALID_FILE, [])

    target_doc = next((doc for doc in validated_docs if doc.get('id') == doc_id), None)
    if not target_doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")

    target_doc.setdefault("metadata", {})
    target_doc["metadata"]["add_demo"] = data.add_demo

    await work_queue.put({
        'func': save_json_async,
        'args': (FINAL_VALID_FILE, validated_docs),
        'kwargs': {}
    })

    return {"message": f"'add_demo' impostato a {data.add_demo}"}


@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        response = requests.post(
            BACKEND_URL,
            json={
                "question": request.question,
                "session_id": request.session_id,
                "verbose": True
            }
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        data = response.json().get("payload", {})
        #print(f"Response from backend: {data}", flush=True)
        return {
            "answer": data.get("answer", "Nessuna risposta."),
            "rewrite": data.get("user_query", " "),
            "context": data.get("context", [])
        }

       
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/save")
async def save_chat(messages: List[ChatMessage]):
    try:
        timestamp = datetime.now().isoformat()
        
        existing_data = await load_json_async(CHAT_SAVE_PATH, [])

        # Aggiunge una nuova sessione salvata con timestamp
        existing_data.append({
            "timestamp": timestamp,
            "chat": [msg.model_dump() for msg in messages]
        })

        await work_queue.put({
            'func': save_json_async,
            'args': (CHAT_SAVE_PATH, existing_data),
            'kwargs': {},
        })

        return {"message": "Chat salvata correttamente", "timestamp": timestamp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))