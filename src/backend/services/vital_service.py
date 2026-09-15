"""Persistence and risk-processing services for patient vital readings."""

from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.models.vital_reading import VitalReading
from backend.vitals.schemas import VitalHistoryRead, VitalReadingCreate, VitalReadingRead


def store_reading(db: Session, patient_id: int, payload: VitalReadingCreate) -> VitalReading:
    """Persist one complete patient-owned reading."""
    reading = VitalReading(
        patient_id=patient_id,
        timestamp=payload.timestamp or datetime.now(timezone.utc),
        heart_rate=payload.heart_rate,
        systolic_bp=payload.systolic_bp,
        diastolic_bp=payload.diastolic_bp,
        spo2=payload.spo2,
        temperature=payload.temperature,
        glucose=payload.glucose,
        source=payload.source.value,
        simulator_state=payload.simulator_state.value if payload.simulator_state else None,
        simulator_profile=payload.simulator_profile.value if payload.simulator_profile else None,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


def latest_reading(db: Session, patient_id: int) -> VitalReading | None:
    """Return only the authenticated patient's newest reading."""
    return db.scalar(
        select(VitalReading)
        .where(VitalReading.patient_id == patient_id)
        .order_by(desc(VitalReading.timestamp), desc(VitalReading.id))
        .limit(1)
    )


def history_readings(db: Session, patient_id: int, limit: int = 50, offset: int = 0) -> VitalHistoryRead:
    """Return bounded, newest-first history for one patient."""
    limit = min(max(limit, 1), 200)
    offset = max(offset, 0)
    base = select(VitalReading).where(VitalReading.patient_id == patient_id)
    total = len(db.scalars(base).all())
    rows = list(db.scalars(base.order_by(desc(VitalReading.timestamp), desc(VitalReading.id)).offset(offset).limit(limit)))
    return VitalHistoryRead(
        items=[VitalReadingRead.model_validate(item) for item in rows],
        total=total,
        limit=limit,
        offset=offset,
    )
