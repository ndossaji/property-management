"""
Celery Application Configuration
This is a sample/starter file to demonstrate the Docker setup.
"""

from celery import Celery
import os

# Get Redis URL from environment
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

# Create Celery application
celery_app = Celery(
    "propertymgmt",
    broker=broker_url,
    backend=result_backend,
    include=["app.tasks"],  # Import tasks from app.tasks module
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
)

# Celery Beat schedule (for periodic tasks)
celery_app.conf.beat_schedule = {
    # Example: Run every hour
    # "process-receipts": {
    #     "task": "app.tasks.process_receipts",
    #     "schedule": 3600.0,  # Every hour
    # },
    # Example: Run daily at midnight
    # "daily-report": {
    #     "task": "app.tasks.generate_daily_report",
    #     "schedule": crontab(hour=0, minute=0),
    # },
}


if __name__ == "__main__":
    celery_app.start()

