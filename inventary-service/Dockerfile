FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY ./src ./src



ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1  

EXPOSE 8000
EXPOSE 50051

CMD ["sh", "-c", "python /app/src/grpc_server.py & uvicorn src.main:app --host 0.0.0.0 --port 8000"]