# CHANGES

Project: **Smart Healthcare Assistance System** (FastAPI backend + multi-agent AI)
Repository layout: `backend/` holds the FastAPI application (`backend` package under
`backend/src`).  Entries are appended per module; historical module entries are
never rewritten.

---

## Module 1 — Patient Health Assessment / Survey

**Status:** ✅ Complete — backend only.
The multi-step survey UI (frontend wizard) was explicitly dropped from the scope of
this task at the request of the project owner, so no frontend code was added and
this module delivers the API, persistence, MCP tools and tests only.

### Changes

* Added a **patient identity layer** (registration + login + bearer-token auth) so a
  survey always belongs to an existing `patient_id`.  No duplicate patient records
  are created by the survey: the assessment row references `patients.patient_id`
  through a foreign key with a `UNIQUE` constraint (one assessment per patient).
* Added the **six-step health assessment survey** exactly as specified:

  | Step | Section | Key | Required |
  |------|---------|-----|----------|
  | 1 | Basic Information | `basic_information` | ✅ |
  | 2 | Medical History | `medical_history` | ✅ |
  | 3 | Current Symptoms | `current_symptoms` | ❌ |
  | 4 | Medications | `medications` | ❌ |
  | 5 | Allergies | `allergies` | ❌ |
  | 6 | Review & Submit | `additional_information` (optional free text) | ✅ step |

* **Normalised storage**: repeating answers (conditions, symptoms, medications,
  allergies) are stored in dedicated child tables instead of JSON columns so the
  future Memory / Risk / Monitoring / Response agents can query them directly.
* **Validation everywhere** — Pydantic schemas validate every field (ranges,
  vocabularies, string lengths, cross-field rules, `extra="forbid"` for typos) and
  the ORM repeats the numeric bounds as database `CHECK` constraints.
* **MCP integration** — survey data is exposed as MCP tools (`backend/mcp/tools.py`)
  with full docstrings, registered on a FastMCP server (`backend/mcp/server.py`).
  No LLM, agent, RAG, memory or orchestration logic is implemented yet, as required.
* Derived data: BMI + WHO BMI category are computed on write so every consumer sees
  the same value.

### API

All endpoints are versioned under `/api/v1`. Protected endpoints require the bearer
token returned by registration/login.

| Method | Path | Purpose | Success | Errors |
|--------|------|---------|---------|--------|
| `POST` | `/api/v1/auth/register` | Create the patient account | `201` + token | `409` duplicate e-mail, `422` invalid input |
| `POST` | `/api/v1/auth/login` | Log in | `200` + token | `401`, `422` |
| `GET` | `/api/v1/auth/me` | Current patient profile | `200` | `401` |
| `GET` | `/api/v1/assessments/metadata` | Survey steps, options and limits (public) | `200` | – |
| `POST` | `/api/v1/assessments` | **Submit** the survey | `201` | `409` already submitted, `422` validation |
| `GET` | `/api/v1/assessments/me` | **Retrieve** the own survey | `200` | `401`, `404` not submitted |
| `GET` | `/api/v1/assessments/patient/{patient_id}` | Retrieve by existing `patient_id` | `200` | `403` other patient's record, `404` |
| `PUT` | `/api/v1/assessments/me` | **Update** by replacing the whole survey | `200` | `401`, `404`, `422` |
| `PATCH` | `/api/v1/assessments/me` | **Update** selected sections only | `200` | `401`, `404`, `422` |
| `DELETE` | `/api/v1/assessments/me` | Withdraw the assessment (patient account stays) | `204` | `401`, `404` |
| `GET` | `/health` | Liveness probe | `200` | – |

Validation errors use one consistent shape so any client can render them:

```json
{
  "detail": "Validation failed for the submitted health assessment",
  "errors": [
    {"field": "basic_information.age", "message": "Input should be less than or equal to 120", "type": "less_than_equal"}
  ]
}
```

### MCP tools

`python -m backend.mcp.server` starts a FastMCP server (stdio) exposing read-only
tools over the stored survey — the contract for the future agents:

| Tool | Purpose |
|------|---------|
| `get_patient_health_assessment(patient_id)` | Full survey answers of one patient |
| `get_health_assessment_summary(patient_id)` | Compact risk signals (BMI class, conditions, worst severity, counts) |
| `get_health_assessment_status(patient_id)` | Has the patient completed the survey? |
| `list_assessed_patient_ids(limit)` | Patient ids with a completed profile (Monitoring agent) |

Every tool validates its own arguments, takes the existing `patient_id`, never
creates or modifies data, and carries a full docstring (`Args`/`Returns`/`Raises`)
that FastMCP uses as the tool description.

### Testing

```bash
cd backend
uv run pytest                 # or: .venv\Scripts\python.exe -m pytest tests
```

**Result: 90 tests passed, 0 failures, 0 errors** (temporary SQLite database, no
external services required).

| Required scenario | Where it is covered |
|-------------------|---------------------|
| Successful submission | `test_health_assessment_api.py::test_submit_health_assessment_persists_every_section`, `::test_submission_keeps_one_patient_record` |
| Validation errors | `test_health_assessment_validation.py` — 13 range/vocabulary cases, 10 structural rules, unknown fields/sections, list limits and free-text length (32 tests) |
| Update existing assessment | `test_health_assessment_api.py::test_patch_updates_only_the_provided_section`, `::test_patch_basic_information_recalculates_bmi`, `::test_patch_can_clear_optional_free_text`, `::test_patch_without_payload_is_rejected`, `::test_put_replaces_the_whole_assessment`, `::test_update_before_submission_returns_404`; plus the update/replace tests in `test_health_assessment_service.py` |
| Retrieving assessment | `test_health_assessment_api.py::test_retrieve_own_assessment`, `::test_retrieve_assessment_by_patient_id`, `::test_cannot_read_another_patients_assessment`, `::test_retrieval_before_submission_returns_404`, `::test_assessment_endpoints_require_authentication` |
| Optional fields | `::test_optional_sections_may_be_omitted`, `::test_blank_optional_strings_are_normalised_to_null`, `::test_patch_can_clear_optional_free_text`, `::test_additional_information_at_the_limit_is_accepted` |
| Persistence | `test_health_assessment_persistence.py` — normalised child rows, a brand-new client + fresh login read the stored survey, durable PATCH, cascade delete of child rows |
| MCP tools | `test_mcp_tools.py` (payload shape + argument validation), `test_survey_metadata.py` (tool docstrings, FastMCP registration, optional-dependency error) |

The API was additionally exercised against a **live server**
(`uvicorn backend.main:app` on `127.0.0.1:8123`, temporary SQLite file):

```
1. /health        -> ok v0.1.0
2. register       -> patient_id=1
3. metadata       -> steps=6 conditions=8 age_max=120
4. POST survey    -> status=submitted bmi=22.77 category=normal symptoms=1
5. POST again     -> HTTP 409
6. PATCH /me      -> status=updated allergen=Peanuts conditions=2 (untouched sections kept)
7. GET /me        -> patient_id=1 additional='Family history of hypertension.'
8. invalid POST   -> HTTP 422
9. no token       -> HTTP 401
10. sqlite rows   -> patients=1 health_assessments=1 medical_conditions=2
                     current_symptoms=1 medications=1 allergies=1
```

### Files added

Backend application (`backend/src/backend/`):

* `main.py` — FastAPI app factory, CORS, lifespan schema creation, `/health`,
  exception handlers (validation → `422` with `errors[]`, domain errors → `404`/`409`).
* `core/__init__.py`, `core/config.py` (pydantic-settings), `core/database.py`
  (engine/`Base`/`get_db`/`session_scope`/`init_db`), `core/security.py`
  (bcrypt hashing + PyJWT tokens), `core/exceptions.py` (framework-free domain errors).
* `models/__init__.py`, `models/enums.py` (`Gender`, `MedicalConditionType`,
  `SymptomSeverity`, `AssessmentStatus`), `models/patient.py` (`patients` table),
  `models/health_assessment.py` (`health_assessments`, `medical_conditions`,
  `current_symptoms`, `medications`, `allergies`).
* `schemas/__init__.py`, `schemas/fields.py` (shared bounds + validated text types),
  `schemas/patient.py`, `schemas/assessment.py` (per-step section models, create /
  update / read models and the survey-metadata models).
* `services/__init__.py`, `services/patient_service.py`,
  `services/assessment_service.py` (create/read/replace/update + BMI helpers),
  `services/survey_metadata.py` (steps, labels, options, limits).
* `api/__init__.py`, `api/deps.py` (`DbSession`, `CurrentPatient`),
  `api/routes/__init__.py`, `api/routes/auth.py`,
  `api/routes/health_assessment.py`.
* `mcp/__init__.py`, `mcp/tools.py` (four documented tools),
  `mcp/server.py` (FastMCP server, optional dependency handled gracefully).

Tests (`backend/tests/`, all new):

* `conftest.py` — temporary SQLite database, schema reset per test, `TestClient`,
  patient/auth/survey fixtures.
* `test_health_assessment_api.py` — submit, retrieve, update, delete, authorization.
* `test_health_assessment_validation.py` — 30 invalid-answer cases + structural rules.
* `test_health_assessment_service.py` — service layer + BMI helpers.
* `test_health_assessment_persistence.py` — normalised rows, restart/fresh-login reads.
* `test_mcp_tools.py` — tool payloads and argument validation.
* `test_survey_metadata.py` — survey definition contract + MCP wiring.

Documentation:

* `healthcare_assistant/CHANGES.md` — this file.

### Files modified

* `backend/src/backend/__init__.py` — replaced the uv placeholder print with the
  `backend` console entry point that starts uvicorn.
* `backend/pyproject.toml` — declared the dependencies used by Module 1 and added the
  pytest configuration (`testpaths`, `pythonpath = ["src"]`).
* `backend/uv.lock` — regenerated by `uv sync`.
* `backend/main.py` — was an empty placeholder; now a two-line shim so
  `uvicorn main:app` works from the project root (`backend.main` is the real app).

### Implementation notes

* **No duplicate patients.** The survey is stored in `health_assessments` with a
  foreign key to `patients.patient_id` plus a `UNIQUE` constraint on that column,
  so one patient can only ever own one assessment.  Registration/login is the only
  code path that creates a patient row.
* **Step definitions live on the server.** `GET /api/v1/assessments/metadata`
  returns the six steps (key, title, description, required flag), the controlled
  vocabularies (gender, medical conditions, severity) and the exact validation
  limits, so a wizard UI and the API can never drift apart.  The endpoint is public
  because it exposes no patient data.
* **Normalised schema.** `medical_conditions`, `current_symptoms`, `medications`
  and `allergies` are child tables (cascade delete) instead of JSON blobs; every
  future consumer (Memory/Risk/Monitoring) can query them with plain SQL.
* **Derived values are computed once on write.** `bmi` and `bmi_category` are
  recalculated whenever Basic Information is created or updated, so every consumer
  reads the same number.
* **Answer hygiene.** Optional text answers that are blank/whitespace-only are
  normalised to `NULL` (`OptionalText` + `BeforeValidator`), so "not answered" is
  unambiguous.  All request models use `extra="forbid"`.
* **Cross-field rules.** Medical History accepts either exactly `none` or one or
  more conditions (`none` may not be combined, no duplicates, `other` requires
  details).  Symptoms require symptom + duration; medications require name, dosage
  and frequency; allergies require the allergen.
* **Update semantics.** `PATCH /assessments/me` replaces only the sections present
  in the body (a section sent as `[]`/empty clears it, `null` for
  `additional_information` clears the free text) and flips `status` to `updated`;
  `PUT /assessments/me` is a full replace.  Both return `404` when the patient has
  not submitted the survey yet - they never implicitly create one.
* **Auth.** Patients authenticate with a JWT bearer token (PyJWT, HS256) and every
  survey endpoint works from the authenticated `patient_id`; the path-based lookup
  refuses to serve another patient's record (`403`).
* **MCP, not ad-hoc tools.** Anything a future agent needs is exposed as an MCP
  tool in `backend/mcp/tools.py` (framework-free, argument-validated, fully
  docstringed) and registered on the FastMCP server in `backend/mcp/server.py`
  (`python -m backend.mcp.server`).  `fastmcp` is imported lazily so the HTTP API
  and the test-suite work even when it is absent - `create_mcp_server()` then raises
  a clear `RuntimeError`.
* **Out of scope by design.** No LLM call, no agents, no RAG, no memory, no risk
  evaluation and no orchestration were implemented in this module, and the
  multi-step survey UI was dropped from scope at the project owner's request.

### Known issues / follow-ups

* The schema is created with `Base.metadata.create_all` at start-up
  (`AUTO_CREATE_TABLES=true`).  This is convenient for development, but a real
  migration tool (Alembic) should be introduced before the schema changes again.
* Defaults are development defaults: `JWT_SECRET_KEY=dev-only-secret-change-me`
  and `CORS_ALLOW_ORIGINS=["*"]`.  Both must be overridden through environment
  variables for any deployment.
* SQLite stores naive UTC timestamps, so the API returns timestamps without an
  explicit offset until the project moves to PostgreSQL (`DATABASE_URL`).
* `GET /api/v1/assessments/patient/{patient_id}` is intentionally restricted to the
  owning patient; a clinician/admin role would need an authorization layer in a
  later module.
* There is no history/audit table: updating an assessment overwrites the previous
  answers.  If the Memory agent needs a timeline of changes, an
  `assessment_history` table should be added in a later module.
* `include_optional` on the patient-id lookup is accepted and currently ignored - a
  placeholder for future response trimming.
* No frontend wizard was added (explicit scope change); the metadata endpoint
  documents the contract the future UI must follow.
* `assessment_status` only distinguishes `submitted` / `updated`; review states such
  as `draft` are not modelled because the survey is submitted in one request.

---

## Module 4 — Context-Aware Memory / RAG foundation

**Status:** In progress — document ingestion foundation complete.

### Changes

* Added lazy PDF/text/Markdown loaders with clear errors for unsupported,
  encrypted, malformed and empty documents.
* Added deterministic offline hashing embeddings plus lazy
  `sentence-transformers` embeddings.
* Added Chroma ingestion, patient-scoped retrieval, chunk deletion and
  persistent/ephemeral client configuration in `backend/rag/ingest.py`.
* Added relational patient-document metadata and authenticated upload, list,
  metadata and delete endpoints under `/api/v1/documents`.
* Uploads enforce the configured size limit, preserve the original file, and
  record indexed/failed ingestion status.

* Added the typed LangGraph Memory Agent workflow: receive request, retrieve
  patient-scoped records, organize provenance, build grounded structured
  context, and return an explicit available/unavailable result.
* Added separate medical-knowledge indexing and retrieval in the configured
  `medical_knowledge` Chroma collection, including directory indexing. General
  knowledge is never queried as patient history.

### Remaining work

* The Memory Agent/LangGraph orchestration, medical-knowledge indexing and
  clinician-facing workflows remain for a subsequent Module 4 increment.