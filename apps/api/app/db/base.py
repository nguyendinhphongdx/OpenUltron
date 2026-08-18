from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base declarative chung cho mọi model (ADR-0002)."""
