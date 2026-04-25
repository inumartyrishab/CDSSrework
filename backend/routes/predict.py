from pathlib import Path

import joblib
from flask import Blueprint, jsonify, request

from utils.explain import explain_prediction
from utils.preprocess import (
    FEATURE_NAMES,
    classify_risk,
    preprocess_patient,
    preprocess_patients,
)


predict_bp = Blueprint("predict", __name__)

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "risk_model.pkl"


class RuleBasedRiskModel:
    """Fallback predictor used until a trained sklearn model is generated."""

    def predict_proba(self, frame):
        probabilities = []
        for _, row in frame.iterrows():
            score = 0.08
            score += max(row["age"] - 50, 0) * 0.006
            score += max(row["heart_rate"] - 95, 0) * 0.012
            score += max(94 - row["oxygen_saturation"], 0) * 0.055
            score += max(row["temperature"] - 37.8, 0) * 0.13
            score += max(row["respiratory_rate"] - 20, 0) * 0.035
            score += max(105 - row["systolic_bp"], 0) * 0.012
            score += max(row["creatinine"] - 1.2, 0) * 0.12
            score += max(row["glucose"] - 160, 0) * 0.0015
            score += row["has_diabetes"] * 0.05
            score += row["has_hypertension"] * 0.035
            probability = min(max(score, 0.02), 0.97)
            probabilities.append([1 - probability, probability])
        return probabilities


def load_model_bundle():
    if not MODEL_PATH.exists() or MODEL_PATH.stat().st_size == 0:
        return {
            "model": RuleBasedRiskModel(),
            "feature_names": FEATURE_NAMES,
            "metrics": None,
            "source": "rule_based_fallback",
        }

    bundle = joblib.load(MODEL_PATH)
    if isinstance(bundle, dict) and "model" in bundle:
        return bundle
    return {
        "model": bundle,
        "feature_names": FEATURE_NAMES,
        "metrics": None,
        "source": "legacy_model_file",
    }


def predict_one(patient):
    bundle = load_model_bundle()
    frame = preprocess_patient(patient)
    probability = float(bundle["model"].predict_proba(frame)[0][1])
    risk_level = classify_risk(probability)
    explanation = explain_prediction(frame.iloc[0].to_dict(), probability, bundle)

    return {
        "patient_id": patient.get("patient_id", "manual-entry"),
        "risk_probability": round(probability, 4),
        "risk_percent": round(probability * 100, 1),
        "risk_level": risk_level,
        "top_features": explanation,
        "model_source": bundle.get("source", "trained_model"),
    }


@predict_bp.post("/predict")
def predict():
    payload = request.get_json(silent=True) or {}
    try:
        result = predict_one(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(result)


@predict_bp.post("/predict/batch")
def predict_batch():
    payload = request.get_json(silent=True) or {}
    patients = payload.get("patients", [])
    if not isinstance(patients, list) or not patients:
        return jsonify({"error": "Request body must include a non-empty patients list."}), 400

    try:
        preprocess_patients(patients)
        results = [predict_one(patient) for patient in patients]
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"count": len(results), "predictions": results})
