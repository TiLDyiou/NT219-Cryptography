import asyncio
import json
from httpx import AsyncClient

async def main():
    async with AsyncClient(base_url="http://localhost:8002") as client:
        # Assuming order-service runs on 8002, or I can just import the code
        pass

if __name__ == "__main__":
    asyncio.run(main())
