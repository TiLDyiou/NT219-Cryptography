from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData
import uuid


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    metadata = MetaData()
