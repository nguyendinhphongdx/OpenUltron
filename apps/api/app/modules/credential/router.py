from fastapi import APIRouter, status

from app.modules.credential.deps import CredentialServiceDep
from app.modules.credential.schemas import CredentialProvider, CredentialRead, CredentialUpsert

router = APIRouter(prefix="/credentials", tags=["credentials"])


@router.get("", response_model=list[CredentialRead])
async def list_credentials(service: CredentialServiceDep) -> list[CredentialRead]:
    return await service.list()


@router.put("/{provider}", response_model=CredentialRead)
async def upsert_credential(
    provider: CredentialProvider, body: CredentialUpsert, service: CredentialServiceDep
) -> CredentialRead:
    return await service.upsert(provider, body)


@router.delete("/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_credential(provider: CredentialProvider, service: CredentialServiceDep) -> None:
    await service.remove(provider)


@router.post("/{provider}/test-connection", response_model=CredentialRead)
async def test_connection(
    provider: CredentialProvider, service: CredentialServiceDep
) -> CredentialRead:
    return await service.test_connection(provider)
