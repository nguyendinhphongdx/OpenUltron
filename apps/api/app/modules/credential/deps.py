from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.credential.repository import CredentialRepository
from app.modules.credential.service import CredentialService


def get_credential_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CredentialService:
    return CredentialService(CredentialRepository(session))


CredentialServiceDep = Annotated[CredentialService, Depends(get_credential_service)]
