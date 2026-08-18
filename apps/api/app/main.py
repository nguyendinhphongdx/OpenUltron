from fastapi import FastAPI

from app.core.errors import register_exception_handlers
from app.modules.agent.router import router as agent_router
from app.modules.conversation.message.router import router as message_router
from app.modules.conversation.router import router as conversation_router
from app.modules.conversation.tool_call.router import router as tool_call_router
from app.modules.health.router import router as health_router

app = FastAPI(title="Ultron API", version="0.0.1")

register_exception_handlers(app)

app.include_router(health_router)
app.include_router(conversation_router)
app.include_router(message_router)
app.include_router(tool_call_router)
app.include_router(agent_router)
