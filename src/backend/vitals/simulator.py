"""Non-blocking per-patient vital simulator."""

import asyncio
import math
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend.services.vital_service import store_reading
from backend.vitals.reference_ranges import SexProfile, SimulationState, screening_ranges
from backend.vitals.schemas import VitalReadingCreate, VitalSource


@dataclass
class SimulatorSession:
    patient_id: int
    profile: SexProfile
    state: SimulationState
    interval_seconds: float
    task: asyncio.Task | None = None
    paused: bool = False
    step: int = 0


class VitalSimulator:
    """Manage independent asyncio tasks; no request handler blocks or sleeps."""

    def __init__(self) -> None:
        self._sessions: dict[int, SimulatorSession] = {}

    def status(self, patient_id: int) -> SimulatorSession | None:
        return self._sessions.get(patient_id)

    async def start(self, patient_id: int, profile: SexProfile, state: SimulationState, interval_seconds: float, session_factory) -> SimulatorSession:
        await self.stop(patient_id)
        session = SimulatorSession(patient_id, profile, state, interval_seconds)
        self._sessions[patient_id] = session
        session.task = asyncio.create_task(self._run(session, session_factory))
        return session

    async def stop(self, patient_id: int) -> None:
        session = self._sessions.pop(patient_id, None)
        if session and session.task:
            session.task.cancel()
            try:
                await session.task
            except asyncio.CancelledError:
                pass

    def pause(self, patient_id: int) -> SimulatorSession:
        session = self._sessions[patient_id]
        session.paused = True
        return session

    def resume(self, patient_id: int) -> SimulatorSession:
        session = self._sessions[patient_id]
        session.paused = False
        return session

    def set_state(self, patient_id: int, state: SimulationState) -> SimulatorSession:
        session = self._sessions[patient_id]
        session.state = state
        return session

    async def _run(self, session: SimulatorSession, session_factory) -> None:
        while True:
            if not session.paused:
                db: Session = session_factory()
                try:
                    payload = generate_demo_reading(session.profile, session.state, session.step)
                    reading = store_reading(db, session.patient_id, payload)
                    from backend.services.alert_service import process_reading
                    process_reading(db, reading)
                    session.step += 1
                finally:
                    db.close()
            await asyncio.sleep(session.interval_seconds)


def generate_demo_reading(profile: SexProfile, state: SimulationState, step: int = 0) -> VitalReadingCreate:
    """Generate a smooth deterministic sample around a configured state band."""
    bands = screening_ranges(profile, state)
    phase = step % 6
    values: dict[str, float] = {}
    for index, (name, (low, high)) in enumerate(bands.items()):
        progress = (phase + 1) / 6
        wave = (math.sin((step + index) / 2) + 1) / 2
        values[name] = round(low + (high - low) * (progress * 0.65 + wave * 0.35), 2)
    return VitalReadingCreate(
        timestamp=datetime.now(timezone.utc), source=VitalSource.simulator,
        simulator_state=state, simulator_profile=profile, **values
    )


simulator = VitalSimulator()
