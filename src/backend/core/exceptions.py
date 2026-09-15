"""Domain-level exceptions.

They are translated into HTTP responses by the handlers registered in
``backend.main``.  Keeping them framework-free means services (and the MCP
tools) can be reused outside of a request context.
"""


class HealthcareAssistantError(Exception):
    """Base class for every domain error."""


class PatientAlreadyExistsError(HealthcareAssistantError):
    """A patient with the same e-mail address is already registered."""


class PatientNotFoundError(HealthcareAssistantError):
    """The requested patient does not exist."""


class AssessmentNotFoundError(HealthcareAssistantError):
    """The patient has not submitted a health assessment yet."""


class AssessmentAlreadyExistsError(HealthcareAssistantError):
    """The patient already submitted an assessment.

    ``patient_id`` is kept so the API can point the caller at the update
    endpoint.
    """

    def __init__(self, patient_id: int) -> None:
        super().__init__(f"patient {patient_id} already has a health assessment")
        self.patient_id = patient_id
