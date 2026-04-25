import math

import pandas as pd


FEATURE_NAMES = [
    "age",
    "heart_rate",
    "systolic_bp",
    "diastolic_bp",
    "oxygen_saturation",
    "temperature",
    "respiratory_rate",
    "glucose",
    "creatinine",
    "has_diabetes",
    "has_hypertension",
]

DEFAULTS = {
    "has_diabetes": 0,
    "has_hypertension": 0,
}

RANGES = {
    "age": (0, 120),
    "heart_rate": (25, 240),
    "systolic_bp": (50, 260),
    "diastolic_bp": (30, 160),
    "oxygen_saturation": (50, 100),
    "temperature": (32, 43),
    "respiratory_rate": (5, 70),
    "glucose": (35, 600),
    "creatinine": (0.1, 15),
    "has_diabetes": (0, 1),
    "has_hypertension": (0, 1),
}


def _to_float(value, feature):
    if value is None or value == "":
        if feature in DEFAULTS:
            return float(DEFAULTS[feature])
        raise ValueError(f"Missing required field: {feature}")

    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{feature} must be numeric.") from exc

    if not math.isfinite(number):
        raise ValueError(f"{feature} must be a finite number.")

    low, high = RANGES[feature]
    if number < low or number > high:
        raise ValueError(f"{feature} must be between {low} and {high}.")

    return number


def preprocess_patient(patient):
    if not isinstance(patient, dict):
        raise ValueError("Patient input must be a JSON object.")

    cleaned = {feature: _to_float(patient.get(feature), feature) for feature in FEATURE_NAMES}
    return pd.DataFrame([cleaned], columns=FEATURE_NAMES)


def preprocess_patients(patients):
    if not isinstance(patients, list):
        raise ValueError("Patients input must be a list.")
    frames = [preprocess_patient(patient) for patient in patients]
    return pd.concat(frames, ignore_index=True)


def classify_risk(probability):
    if probability >= 0.7:
        return "high"
    if probability >= 0.35:
        return "medium"
    return "low"
