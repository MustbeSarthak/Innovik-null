"""Vital/monitoring risk specialist with a future-stream interface."""

from backend.agents.risk.common import assessment_evidence, level_for_score
from backend.agents.risk.models import RiskResult
from backend.agents.risk.state import RiskInput


def evaluate_vitals(data: RiskInput) -> RiskResult:
    """Evaluate supplied readings conservatively; never create absent readings."""
    if not data.vitals:
        return RiskResult(
            agent="vital_monitoring_risk", risk_level="low", score=0, findings=[], evidence=[],
            uncertainties=["No vital or monitoring readings were supplied."],
            reason="Continuous monitoring data is not available for this evaluation.",
        )
    evidence = [
        assessment_evidence("vitals", f"{reading.name}={reading.value} {reading.unit}")
        for reading in data.vitals
    ]
    findings = []
    score = 0
    for reading in data.vitals:
        name = reading.name.lower()
        if name == "spo2" and reading.value < 92:
            score = max(score, 80)
        elif name in {"heart_rate", "heart rate"} and (reading.value < 50 or reading.value > 120):
            score = max(score, 60)
        elif name == "temperature" and (reading.value < 35 or reading.value > 39):
            score = max(score, 60)
    if score:
        findings.append({
            "agent": "vital_monitoring_risk", "risk_level": level_for_score(score), "score": score,
            "finding": "A supplied monitoring reading is outside the configured screening range; seek professional advice promptly.",
            "evidence": evidence.copy(), "confidence": 0.85,
            "reason": "A deterministic screening threshold was crossed; this is not a diagnosis.",
        })
    return RiskResult(
        agent="vital_monitoring_risk", risk_level=level_for_score(score), score=score,
        findings=findings, evidence=evidence, uncertainties=[],
        reason="Reviewed only the monitoring readings supplied with this request.",
    )
