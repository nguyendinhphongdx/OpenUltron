"""Danh sách tĩnh model Ollama phổ biến để browse trước khi pull (ADR-0011).

Ollama không có API JSON chính thức để tra động toàn bộ model library — đây là danh sách tự
duy trì trong code, không phải bịa. Chỉ ghi field chắc chắn (tên họ model, tag phổ biến công khai
rộng rãi trên ollama.com/library) — KHÔNG ghi kích thước file/byte cụ thể (đổi theo quantization,
không có 1 số cố định đáng tin để hardcode).
"""

from pydantic import BaseModel


class OllamaCatalogEntry(BaseModel):
    name: str
    description: str
    suggested_tags: list[str]


CATALOG: list[OllamaCatalogEntry] = [
    OllamaCatalogEntry(
        name="llama3.2",
        description=(
            "Meta Llama 3.2 — model chat đa dụng, có bản nhẹ (1b/3b) chạy tốt trên máy cá nhân."
        ),
        suggested_tags=["1b", "3b"],
    ),
    OllamaCatalogEntry(
        name="llama3.1",
        description="Meta Llama 3.1 — bản lớn hơn 3.2, chất lượng cao hơn, cần máy mạnh hơn.",
        suggested_tags=["8b", "70b"],
    ),
    OllamaCatalogEntry(
        name="qwen2.5",
        description=(
            "Alibaba Qwen 2.5 — đa ngôn ngữ tốt (gồm tiếng Việt), nhiều size để chọn theo máy."
        ),
        suggested_tags=["0.5b", "3b", "7b", "14b"],
    ),
    OllamaCatalogEntry(
        name="mistral",
        description="Mistral 7B — model chat gọn, phổ biến cho máy cá nhân.",
        suggested_tags=["7b"],
    ),
    OllamaCatalogEntry(
        name="gemma2",
        description="Google Gemma 2 — model mở của Google, nhiều size.",
        suggested_tags=["2b", "9b", "27b"],
    ),
    OllamaCatalogEntry(
        name="phi3",
        description="Microsoft Phi-3 — model nhỏ, tối ưu cho máy yếu.",
        suggested_tags=["mini", "medium"],
    ),
    OllamaCatalogEntry(
        name="deepseek-r1",
        description="DeepSeek R1 — model reasoning/thinking mở, có bản distill nhỏ.",
        suggested_tags=["1.5b", "7b", "8b"],
    ),
    OllamaCatalogEntry(
        name="codellama",
        description="Meta Code Llama — chuyên code, dùng cho tool/agent viết code.",
        suggested_tags=["7b", "13b"],
    ),
    OllamaCatalogEntry(
        name="nomic-embed-text",
        description="Embedding model — đã dùng thật trong Ultron cho Knowledge Base (roadmap).",
        suggested_tags=["latest"],
    ),
]
