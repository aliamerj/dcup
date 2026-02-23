from pathlib import Path as FilePath
from fastembed import SparseTextEmbedding, TextEmbedding
from fastembed.common.model_description import ModelSource, PoolingType
from fastembed.rerank.cross_encoder import TextCrossEncoder


CACHE_DIR = FilePath("./models_cache")
CACHE_DIR.mkdir(exist_ok=True)
VECTOR_SIZE = 384
COLLECTION_NAME = "dcup_documents"

TextEmbedding.add_custom_model(
    model="intfloat/multilingual-e5-small",
    pooling=PoolingType.MEAN,
    normalization=True,
    sources=ModelSource(hf="intfloat/multilingual-e5-small"),
    dim=VECTOR_SIZE,
    model_file="onnx/model.onnx",
)

dense_embedding = TextEmbedding(
    model_name="intfloat/multilingual-e5-small",
    cache_dir=str(CACHE_DIR),
)

sparse_embedding = SparseTextEmbedding(
    model_name="prithivida/Splade_PP_en_v1",
    cache_dir=str(CACHE_DIR),
)
reranker = TextCrossEncoder(
    model_name="Xenova/ms-marco-MiniLM-L-12-v2",
    cache_dir=str(CACHE_DIR),
)
