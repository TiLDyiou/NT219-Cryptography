import uuid

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    metadata = MetaData()

