"""
Expense Routes
CRUD API endpoints for managing expenses with receipt upload and CSV bulk import
"""

import os
import csv
import uuid
from io import StringIO
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Expense, ExpenseReceipt, Property, ExpenseCategory, ExpenseCustomFieldValue, CustomField, CustomFieldOption, CustomFieldType
from app.schemas import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseWithProperty,
    ExpenseReceiptResponse, BulkExpenseResult
)
from app.auth import get_current_active_user, User

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

# Upload directory for receipts
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "receipts")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.get("", response_model=List[ExpenseWithProperty])
async def list_expenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    property_id: Optional[int] = Query(None, description="Filter by property"),
    category: Optional[ExpenseCategory] = Query(None, description="Filter by category"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all expenses with optional filtering and pagination"""
    query = db.query(Expense)
    
    if property_id:
        query = query.filter(Expense.property_id == property_id)
    if category:
        query = query.filter(Expense.category == category)
    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)
    
    return query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit).all()


@router.get("/{expense_id}", response_model=ExpenseWithProperty)
async def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific expense by ID"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with id {expense_id} not found"
        )
    return expense


@router.post("", response_model=ExpenseWithProperty, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new expense"""
    # Verify property exists
    property = db.query(Property).filter(Property.id == expense_data.property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Property with id {expense_data.property_id} not found"
        )

    # Create expense without custom_fields
    expense_dict = expense_data.model_dump(exclude={'custom_fields'})
    expense = Expense(**expense_dict)
    db.add(expense)
    db.flush()  # Get the expense ID

    # Add custom field values if provided
    if expense_data.custom_fields:
        for field_id, value in expense_data.custom_fields.items():
            custom_value = ExpenseCustomFieldValue(
                expense_id=expense.id,
                field_id=field_id,
                value=value
            )
            db.add(custom_value)

    db.commit()
    db.refresh(expense)
    return expense


@router.put("/{expense_id}", response_model=ExpenseWithProperty)
async def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing expense"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with id {expense_id} not found"
        )
    
    # If property_id is being updated, verify the new property exists
    if expense_data.property_id:
        property = db.query(Property).filter(Property.id == expense_data.property_id).first()
        if not property:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Property with id {expense_data.property_id} not found"
            )

    # Update custom fields if provided
    if expense_data.custom_fields is not None:
        # Delete existing custom field values for this expense
        db.query(ExpenseCustomFieldValue).filter(
            ExpenseCustomFieldValue.expense_id == expense_id
        ).delete()

        # Add new custom field values
        for field_id, value in expense_data.custom_fields.items():
            custom_value = ExpenseCustomFieldValue(
                expense_id=expense_id,
                field_id=field_id,
                value=value
            )
            db.add(custom_value)

    # Update other fields
    update_data = expense_data.model_dump(exclude_unset=True, exclude={'custom_fields'})
    for field, value in update_data.items():
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an expense"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with id {expense_id} not found"
        )

    # Delete receipt files
    for receipt in expense.receipts:
        if os.path.exists(receipt.file_path):
            os.remove(receipt.file_path)

    db.delete(expense)
    db.commit()
    return None


# ============================================================================
# Receipt Upload Endpoints
# ============================================================================

@router.post("/{expense_id}/receipts", response_model=ExpenseReceiptResponse, status_code=status.HTTP_201_CREATED)
async def upload_receipt(
    expense_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a receipt image for an expense"""
    # Verify expense exists
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with id {expense_id} not found"
        )

    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not allowed. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )

    # Read file and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file
    with open(file_path, "wb") as f:
        f.write(content)

    # Create receipt record
    receipt = ExpenseReceipt(
        filename=unique_filename,
        original_filename=file.filename or "receipt",
        file_path=file_path,
        content_type=file.content_type,
        file_size=len(content),
        expense_id=expense_id
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    return receipt


@router.get("/{expense_id}/receipts/{receipt_id}/download")
async def download_receipt(
    expense_id: int,
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Download a receipt file"""
    receipt = db.query(ExpenseReceipt).filter(
        ExpenseReceipt.id == receipt_id,
        ExpenseReceipt.expense_id == expense_id
    ).first()
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )

    if not os.path.exists(receipt.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt file not found on server"
        )

    return FileResponse(
        receipt.file_path,
        filename=receipt.original_filename,
        media_type=receipt.content_type
    )


@router.delete("/{expense_id}/receipts/{receipt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_receipt(
    expense_id: int,
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a receipt"""
    receipt = db.query(ExpenseReceipt).filter(
        ExpenseReceipt.id == receipt_id,
        ExpenseReceipt.expense_id == expense_id
    ).first()
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )

    # Delete file from disk
    if os.path.exists(receipt.file_path):
        os.remove(receipt.file_path)

    db.delete(receipt)
    db.commit()
    return None


# ============================================================================
# CSV Bulk Import Endpoint
# ============================================================================

@router.post("/bulk/csv", response_model=BulkExpenseResult)
async def bulk_import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Bulk import expenses from a CSV file.

    Expected CSV columns:
    - description (required): Expense description
    - amount (required): Expense amount (numeric)
    - category (required): One of: maintenance, repairs, utilities, insurance, taxes, mortgage, hoa, landscaping, cleaning, supplies, legal, accounting, advertising, travel, other
    - expense_date (required): Date in YYYY-MM-DD format
    - property_id (required): Property ID to tie the expense to
    - vendor (optional): Vendor name
    - notes (optional): Additional notes
    """
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV file"
        )

    content = await file.read()
    try:
        csv_text = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be UTF-8 encoded"
        )

    success_count = 0
    error_count = 0
    errors = []

    reader = csv.DictReader(StringIO(csv_text))
    required_fields = {'description', 'amount', 'category', 'expense_date', 'property_id'}

    if not reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file is empty or has no headers"
        )

    missing_fields = required_fields - set(reader.fieldnames)
    if missing_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required columns: {', '.join(missing_fields)}"
        )

    valid_categories = {cat.value for cat in ExpenseCategory}

    for row_num, row in enumerate(reader, start=2):
        try:
            # Validate and parse fields
            description = row.get('description', '').strip()
            if not description:
                raise ValueError("Description is required")

            try:
                amount = Decimal(row.get('amount', '0').strip())
                if amount <= 0:
                    raise ValueError("Amount must be greater than 0")
            except InvalidOperation:
                raise ValueError(f"Invalid amount: {row.get('amount')}")

            category_str = row.get('category', '').strip().lower()
            if category_str not in valid_categories:
                raise ValueError(f"Invalid category: {category_str}. Valid: {', '.join(valid_categories)}")
            category = ExpenseCategory(category_str)

            try:
                expense_date = date.fromisoformat(row.get('expense_date', '').strip())
            except ValueError:
                raise ValueError(f"Invalid date format: {row.get('expense_date')}. Use YYYY-MM-DD")

            try:
                property_id = int(row.get('property_id', '0').strip())
            except ValueError:
                raise ValueError(f"Invalid property_id: {row.get('property_id')}")

            # Verify property exists
            property = db.query(Property).filter(Property.id == property_id).first()
            if not property:
                raise ValueError(f"Property with id {property_id} not found")

            vendor = row.get('vendor', '').strip() or None
            notes = row.get('notes', '').strip() or None

            # Create expense
            expense = Expense(
                description=description,
                amount=amount,
                category=category,
                expense_date=expense_date,
                property_id=property_id,
                vendor=vendor,
                notes=notes
            )
            db.add(expense)
            success_count += 1

        except Exception as e:
            error_count += 1
            errors.append(f"Row {row_num}: {str(e)}")

    if success_count > 0:
        db.commit()

    return BulkExpenseResult(
        success_count=success_count,
        error_count=error_count,
        errors=errors[:50]  # Limit errors returned
    )


@router.get("/categories/list")
async def list_categories(
    current_user: User = Depends(get_current_active_user),
):
    """Get list of available expense categories"""
    return [{"value": cat.value, "label": cat.value.replace("_", " ").title()} for cat in ExpenseCategory]


# ============================================================================
# CSV Export Endpoint
# ============================================================================

@router.get("/export/csv")
async def export_expenses_csv(
    property_id: Optional[int] = Query(None, description="Filter by property"),
    category: Optional[ExpenseCategory] = Query(None, description="Filter by category"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Export expenses to CSV file with optional filtering.

    Returns a CSV file with all expense data including custom fields.
    """
    # Build query with filters
    query = db.query(Expense)

    if property_id:
        query = query.filter(Expense.property_id == property_id)
    if category:
        query = query.filter(Expense.category == category)
    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)

    expenses = query.order_by(Expense.expense_date.desc()).all()

    # Get all custom fields for expenses
    custom_field_values = db.query(ExpenseCustomFieldValue).filter(
        ExpenseCustomFieldValue.expense_id.in_([e.id for e in expenses])
    ).all() if expenses else []

    # Get all custom field definitions to check field types
    custom_field_ids = set(cfv.field_id for cfv in custom_field_values)
    custom_field_defs = db.query(CustomField).filter(
        CustomField.id.in_(custom_field_ids)
    ).all() if custom_field_ids else []

    # Create a mapping of field_id -> field definition
    field_def_map = {field.id: field for field in custom_field_defs}

    # Get all dropdown options for dropdown fields
    dropdown_field_ids = [f.id for f in custom_field_defs if f.field_type == CustomFieldType.DROPDOWN]
    dropdown_options = db.query(CustomFieldOption).filter(
        CustomFieldOption.field_id.in_(dropdown_field_ids)
    ).all() if dropdown_field_ids else []

    # Create a mapping of option_id -> label
    option_label_map = {str(opt.id): opt.label for opt in dropdown_options}

    # Create a mapping of expense_id -> {field_name: display_value}
    custom_field_map = {}
    for cf_value in custom_field_values:
        if cf_value.expense_id not in custom_field_map:
            custom_field_map[cf_value.expense_id] = {}

        # Get the field definition
        field_def = field_def_map.get(cf_value.field_id)
        display_value = cf_value.value

        # Convert dropdown values (option IDs) to labels
        if field_def and field_def.field_type == CustomFieldType.DROPDOWN and cf_value.value:
            display_value = option_label_map.get(cf_value.value, cf_value.value)

        custom_field_map[cf_value.expense_id][cf_value.field.name] = display_value

    # Get unique custom field names
    all_custom_field_names = set()
    for cf_values in custom_field_map.values():
        all_custom_field_names.update(cf_values.keys())
    all_custom_field_names = sorted(all_custom_field_names)

    # Create CSV in memory
    output = StringIO()

    # Define CSV columns
    base_columns = [
        'id', 'description', 'amount', 'category', 'expense_date',
        'vendor', 'notes', 'property_id', 'property_address', 'created_at'
    ]
    columns = base_columns + all_custom_field_names

    writer = csv.DictWriter(output, fieldnames=columns)
    writer.writeheader()

    # Write expense data
    for expense in expenses:
        # Convert category value to human-readable label
        category_label = expense.category.value.replace('_', ' ').title()

        row = {
            'id': expense.id,
            'description': expense.description,
            'amount': float(expense.amount),
            'category': category_label,
            'expense_date': expense.expense_date.isoformat(),
            'vendor': expense.vendor or '',
            'notes': expense.notes or '',
            'property_id': expense.property_id,
            'property_address': expense.property.full_address if expense.property else '',
            'created_at': expense.created_at.isoformat(),
        }

        # Add custom field values
        custom_values = custom_field_map.get(expense.id, {})
        for field_name in all_custom_field_names:
            row[field_name] = custom_values.get(field_name, '')

        writer.writerow(row)

    # Prepare response
    output.seek(0)
    filename = f"expenses_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

