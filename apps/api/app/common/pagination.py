import math
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class Paginated(BaseModel, Generic[T]):
    data: list[T]
    meta: PaginationMeta


def paginate(data: list[T], total: int, page: int, page_size: int) -> Paginated[T]:
    return Paginated(
        data=data,
        meta=PaginationMeta(
            page=page, page_size=page_size, total=total, total_pages=math.ceil(total / page_size)
        ),
    )
