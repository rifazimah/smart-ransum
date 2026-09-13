FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for psycopg2 and pulp
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    coinor-cbc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
