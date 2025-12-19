"""
Celery Tasks
This is a sample/starter file to demonstrate the Docker setup.
Add your background tasks here.
"""

from app.celery_app import celery_app
import time


@celery_app.task(name="app.tasks.example_task")
def example_task(param: str):
    """
    Example Celery task
    
    Args:
        param: Example parameter
        
    Returns:
        dict: Task result
    """
    print(f"Processing task with param: {param}")
    time.sleep(2)  # Simulate work
    return {"status": "completed", "param": param}


@celery_app.task(name="app.tasks.process_receipt")
def process_receipt(receipt_id: int):
    """
    Process a receipt (OCR, extraction, etc.)
    
    Args:
        receipt_id: ID of the receipt to process
        
    Returns:
        dict: Processing result
    """
    # TODO: Implement receipt processing logic
    # - Download from S3
    # - Run OCR
    # - Extract data
    # - Save to database
    print(f"Processing receipt {receipt_id}")
    return {"receipt_id": receipt_id, "status": "processed"}


@celery_app.task(name="app.tasks.send_email")
def send_email(to: str, subject: str, body: str):
    """
    Send an email
    
    Args:
        to: Recipient email address
        subject: Email subject
        body: Email body
        
    Returns:
        dict: Send result
    """
    # TODO: Implement email sending logic
    print(f"Sending email to {to}: {subject}")
    return {"to": to, "status": "sent"}


@celery_app.task(name="app.tasks.sync_transactions")
def sync_transactions(account_id: int):
    """
    Sync transactions from Plaid
    
    Args:
        account_id: ID of the account to sync
        
    Returns:
        dict: Sync result
    """
    # TODO: Implement Plaid transaction sync
    print(f"Syncing transactions for account {account_id}")
    return {"account_id": account_id, "transactions_synced": 0}


# Add more tasks as needed for your application:
# - Receipt processing
# - Email notifications
# - Report generation
# - Data synchronization
# - Scheduled maintenance tasks

