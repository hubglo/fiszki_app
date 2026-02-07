# --- Etap 1: Builder ---
# Używamy pełnej wersji obrazu ("fat"), która zawiera kompilatory i biblioteki potrzebne do budowy paczek
FROM python:3.11.9-bookworm AS builder

# Blokada tworzenia plików .pyc i wymuszenie logowania w czasie rzeczywistym
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Tworzymy wirtualne środowisko, aby łatwo przenieść je do końcowego obrazu
RUN python -m venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Kopiujemy listę zależności i instalujemy je
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# --- Etap 2: Runtime ---
# Używamy wersji "slim" – jest znacznie mniejsza i bezpieczniejsza (mniejsza powierzchnia ataku)
FROM python:3.11.9-slim-bookworm

WORKDIR /app

# Kopiujemy tylko zainstalowane środowisko wirtualne z etapu builder
COPY --from=builder /app/.venv /app/.venv

# Kopiujemy kod źródłowy aplikacji
COPY . .

# Ustawiamy ścieżkę, aby system widział paczki z wirtualnego środowiska
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

# Port, na którym zazwyczaj działa Flask (Fly.io domyślnie oczekuje 8080 lub 5000)
EXPOSE 5000

# Uruchomienie aplikacji za pomocą Gunicorn (zalecane na produkcji zamiast flask run)
# Załóżmy, że Twój główny plik to app.py, a obiekt Flask nazywa się 'app'
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]