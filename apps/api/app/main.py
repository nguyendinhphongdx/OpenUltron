from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.checkpointer import close_checkpointer, init_checkpointer
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.modules.agent.router import router as agent_router
from app.modules.chat.router import router as chat_router
from app.modules.conversation.message.router import router as message_router
from app.modules.conversation.router import router as conversation_router
from app.modules.conversation.tool_call.router import router as tool_call_router
from app.modules.credential.router import router as credential_router
from app.modules.health.router import router as health_router
from app.modules.knowledge_base.agent_kb_router import router as agent_kb_router
from app.modules.knowledge_base.router import router as kb_router
from app.modules.model.router import router as model_router
from app.modules.ollama.router import router as ollama_router
from app.modules.settings.router import router as settings_router
from app.modules.tool.agent_tool_router import router as agent_tool_router
from app.modules.tool.router import router as tool_router
from app.modules.voice.router import router as voice_router

configure_logging(settings.log_level)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Checkpointer cho approval gate (ADR-0014) — 1 connection sống suốt đời app, tách biệt
    # SQLAlchemy async engine (khác driver, khác schema — xem app/core/checkpointer.py).
    await init_checkpointer()
    try:
        yield
    finally:
        await close_checkpointer()


app = FastAPI(title="Ultron API", version="0.0.1", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health_router)
app.include_router(conversation_router)
app.include_router(message_router)
app.include_router(tool_call_router)
app.include_router(credential_router)
app.include_router(agent_router)
app.include_router(chat_router)
app.include_router(model_router)
app.include_router(settings_router)
app.include_router(tool_router)
app.include_router(agent_tool_router)
app.include_router(kb_router)
app.include_router(agent_kb_router)
app.include_router(voice_router)
app.include_router(ollama_router)
