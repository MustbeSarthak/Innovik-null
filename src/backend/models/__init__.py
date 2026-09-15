"""ORM models.

Importing this package registers every table on ``Base.metadata``; other
modules must import it (directly or through ``backend.core.database.init_db``)
before running ``create_all``.
"""

from backend.models.enums import (
    AssessmentStatus,
    Gender,
    MedicalConditionType,
    SymptomSeverity,
)
from backend.models.health_assessment import (
    Allergy,
    CurrentSymptoms,
    HealthAssessment,
    Medication,
    MedicalCondition,
)
from backend.models.patient import Patient

__all__ = [
    "Allergy",
    "AssessmentStatus",
    "CurrentSymptoms",
    "Gender",
    "HealthAssessment",
    "MedicalCondition",
    "MedicalConditionType",
    "Medication",
    "Patient",
    "SymptomSeverity",
]
