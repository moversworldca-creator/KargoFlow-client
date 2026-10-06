# Production Dockerfile for Movers CRM Backend
FROM python:3.13-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq-dev \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r /tmp/requirements.txt

RUN python -m playwright install --with-deps chromium && \
    chmod -R a+rX /opt/playwright

# Copy application code
COPY backend/ /app/

# Create necessary directories
RUN mkdir -p /app/staticfiles /app/media && \
    chown -R nobody:nogroup /app/staticfiles /app/media

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Run with gunicorn in production
CMD ["sh", "-c", "\
python manage.py migrate --noinput && \
python manage.py collectstatic --noinput && \
gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers ${GUNICORN_WORKERS:-5} \
    --worker-class gthread \
    --threads 4 \
    --max-requests 5000 \
    --max-requests-jitter 500 \
    --timeout 60 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile - \
"]
