from typing import Annotated
import logging
from fastapi import Depends, APIRouter, HTTPException, Query
from sqlalchemy.orm import Session

from src.database.db import get_db
from src.database import models
from src.backend.services.schemas import ReportRead, ReportStatusUpdate
from src.backend.services.user_service import get_current_user

router = APIRouter()

ALLOWED_STATUSES = {"pending", "open", "closed"}

logging.basicConfig(level=logging.INFO)


@router.get("", response_model=list[ReportRead])
def get_all_reports(
    target_type: Annotated[str | None, Query()] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all reports, optionally filtered by target type. Only moderators can access."""
    if current_user.role != models.UserRole.MODERATOR:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = db.query(models.Report)
    if target_type:
        
        target_type_upper = target_type.upper()
        query = query.filter(models.Report.target_type == target_type_upper)
        logging.info(f"Filtering reports by target_type: {target_type_upper}")
    
    reports = query.order_by(models.Report.created_at.desc()).all()
    logging.info(f"Found {len(reports)} reports for moderator {current_user.username}")
    if reports:
        logging.info(f"Sample report: ID={reports[0].id}, status={reports[0].status}, target_type={reports[0].target_type}, target_id={reports[0].target_id}")
    return reports


@router.patch("/{report_id}/status", response_model=ReportRead)
def update_report_status(
    report_id: int,
    payload: ReportStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update report status. Only moderators can change report status."""
    if current_user.role != models.UserRole.MODERATOR:
        raise HTTPException(status_code=403, detail="Access denied")

    new_status = payload.status.strip().lower()
    if new_status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {sorted(ALLOWED_STATUSES)}",
        )

    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    
    if new_status == "open":
        report.status = models.ReportStatus.OPEN
    elif new_status == "pending":
        report.status = models.ReportStatus.PENDING
    elif new_status == "closed":
        report.status = models.ReportStatus.CLOSED
    db.commit()
    db.refresh(report)
    return report

