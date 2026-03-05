"""
Embedding Model Singleton

Lazy-loads the sentence-transformers model to avoid loading it multiple times.
Uses a simple in-memory cache to keep the model loaded across requests.
"""

from sentence_transformers import SentenceTransformer
from typing import Optional

# Global model instance (lazy-loaded)
_model_instance: Optional[SentenceTransformer] = None
MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384


def get_embedding_model() -> SentenceTransformer:
    """
    Get or create the embedding model singleton.
    
    Loads the model on first call, then returns cached instance on subsequent calls.
    In Modal, this keeps the model in memory across function invocations.
    
    Returns:
        SentenceTransformer: The loaded embedding model
    """
    global _model_instance
    if _model_instance is None:
        _model_instance = SentenceTransformer(MODEL_NAME)
    return _model_instance


def embed_text(text: str) -> list[float]:
    """
    Embed a text string into a 384-dimensional vector.
    
    Args:
        text: The text to embed
        
    Returns:
        List of 384 floats representing the embedding
    """
    model = get_embedding_model()
    embedding = model.encode(text, convert_to_numpy=False)
    return embedding.tolist() if hasattr(embedding, 'tolist') else list(embedding)


def embed_batch(texts: list[str]) -> list[list[float]]:
    """
    Embed multiple texts efficiently in batch.
    
    Args:
        texts: List of texts to embed
        
    Returns:
        List of embeddings (each is a list of 384 floats)
    """
    if not texts:
        return []
    
    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=False, show_progress_bar=False)
    
    # Convert numpy arrays to lists if needed
    return [e.tolist() if hasattr(e, 'tolist') else list(e) for e in embeddings]
