CLINICAL_SIGNALS = [
    {
        "feature": "oxygen_saturation",
        "label": "Oxygen saturation",
        "direction": "low",
        "threshold": 94,
        "unit": "%",
        "message": "low oxygen saturation",
    },
    {
        "feature": "heart_rate",
        "label": "Heart rate",
        "direction": "high",
        "threshold": 100,
        "unit": "bpm",
        "message": "elevated heart rate",
    },
    {
        "feature": "systolic_bp",
        "label": "Systolic blood pressure",
        "direction": "low",
        "threshold": 100,
        "unit": "mmHg",
        "message": "low systolic blood pressure",
    },
    {
        "feature": "temperature",
        "label": "Temperature",
        "direction": "high",
        "threshold": 38.0,
        "unit": "C",
        "message": "fever-range temperature",
    },
    {
        "feature": "respiratory_rate",
        "label": "Respiratory rate",
        "direction": "high",
        "threshold": 22,
        "unit": "breaths/min",
        "message": "elevated respiratory rate",
    },
    {
        "feature": "creatinine",
        "label": "Creatinine",
        "direction": "high",
        "threshold": 1.3,
        "unit": "mg/dL",
        "message": "elevated creatinine",
    },
    {
        "feature": "age",
        "label": "Age",
        "direction": "high",
        "threshold": 65,
        "unit": "years",
        "message": "older age",
    },
    {
        "feature": "glucose",
        "label": "Glucose",
        "direction": "high",
        "threshold": 180,
        "unit": "mg/dL",
        "message": "elevated glucose",
    },
]


def _severity(value, signal):
    threshold = signal["threshold"]
    if signal["direction"] == "high":
        return max(value - threshold, 0) / max(threshold, 1)
    return max(threshold - value, 0) / max(threshold, 1)


def explain_prediction(patient, probability, bundle):
    explanations = []

    for signal in CLINICAL_SIGNALS:
        value = float(patient[signal["feature"]])
        severity = _severity(value, signal)
        if severity <= 0:
            continue

        explanations.append(
            {
                "feature": signal["feature"],
                "label": signal["label"],
                "value": round(value, 2),
                "unit": signal["unit"],
                "impact": "increased risk",
                "reason": signal["message"],
                "relative_weight": round(min(severity * 100, 100), 1),
            }
        )

    if patient.get("has_diabetes", 0) == 1:
        explanations.append(
            {
                "feature": "has_diabetes",
                "label": "Diabetes history",
                "value": 1,
                "unit": "flag",
                "impact": "increased risk",
                "reason": "documented diabetes history",
                "relative_weight": 14.0,
            }
        )

    if patient.get("has_hypertension", 0) == 1:
        explanations.append(
            {
                "feature": "has_hypertension",
                "label": "Hypertension history",
                "value": 1,
                "unit": "flag",
                "impact": "increased risk",
                "reason": "documented hypertension history",
                "relative_weight": 10.0,
            }
        )

    explanations.sort(key=lambda item: item["relative_weight"], reverse=True)

    if not explanations:
        return [
            {
                "feature": "overall_profile",
                "label": "Overall profile",
                "value": round(probability * 100, 1),
                "unit": "%",
                "impact": "lower risk",
                "reason": "no major abnormal vital or lab signals in the submitted data",
                "relative_weight": 0,
            }
        ]

    return explanations[:5]
