# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Port, na którym zazwyczaj działa Flask (Fly.io domyślnie oczekuje 8080 lub 5000)
EXPOSE 5000

# Uruchomienie aplikacji za pomocą Gunicorn (zalecane na produkcji zamiast flask run)
# Załóżmy, że Twój główny plik to app.py, a obiekt Flask nazywa się 'app'
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]