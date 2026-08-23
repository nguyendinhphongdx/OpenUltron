from typing import Annotated

from fastapi import Depends

from app.modules.ollama.service import OllamaService


def get_ollama_service() -> OllamaService:
    return OllamaService()


OllamaServiceDep = Annotated[OllamaService, Depends(get_ollama_service)]
