from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from utils.preprocess import FEATURE_NAMES


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = PROJECT_ROOT / "backend" / "models" / "risk_model.pkl"
PROCESSED_DATA_PATH = PROJECT_ROOT / "data" / "processed" / "synthetic_patient_data.csv"


def sigmoid(values):
    return 1 / (1 + np.exp(-values))


def generate_synthetic_patients(row_count=2500, random_state=42):
    rng = np.random.default_rng(random_state)

    age = rng.normal(58, 18, row_count).clip(18, 95)
    heart_rate = rng.normal(88, 22, row_count).clip(40, 180)
    systolic_bp = rng.normal(122, 25, row_count).clip(70, 210)
    diastolic_bp = rng.normal(76, 15, row_count).clip(40, 125)
    oxygen_saturation = rng.normal(95, 4.5, row_count).clip(70, 100)
    temperature = rng.normal(37.1, 0.9, row_count).clip(34.5, 41.5)
    respiratory_rate = rng.normal(18, 5, row_count).clip(8, 40)
    glucose = rng.normal(135, 48, row_count).clip(45, 380)
    creatinine = rng.lognormal(mean=0.05, sigma=0.45, size=row_count).clip(0.4, 6.0)
    has_diabetes = rng.binomial(1, 0.28, row_count)
    has_hypertension = rng.binomial(1, 0.38, row_count)

    linear_risk = (
        -2.2
        + 0.035 * (age - 55)
        + 0.035 * (heart_rate - 90)
        + 0.16 * (94 - oxygen_saturation)
        + 0.12 * (respiratory_rate - 18)
        + 0.025 * (105 - systolic_bp)
        + 0.52 * (temperature - 37.5)
        + 0.35 * (creatinine - 1.1)
        + 0.004 * (glucose - 140)
        + 0.35 * has_diabetes
        + 0.22 * has_hypertension
    )
    probabilities = sigmoid(linear_risk)
    noisy_probability = probabilities + rng.normal(0, 0.06, row_count)
    risk_event = (noisy_probability >= 0.48).astype(int)

    frame = pd.DataFrame(
        {
            "age": age.round(0),
            "heart_rate": heart_rate.round(0),
            "systolic_bp": systolic_bp.round(0),
            "diastolic_bp": diastolic_bp.round(0),
            "oxygen_saturation": oxygen_saturation.round(1),
            "temperature": temperature.round(1),
            "respiratory_rate": respiratory_rate.round(0),
            "glucose": glucose.round(0),
            "creatinine": creatinine.round(2),
            "has_diabetes": has_diabetes,
            "has_hypertension": has_hypertension,
            "risk_event": risk_event,
        }
    )
    return frame


def train():
    data = generate_synthetic_patients()
    x_train, x_test, y_train, y_test = train_test_split(
        data[FEATURE_NAMES],
        data["risk_event"],
        test_size=0.2,
        random_state=42,
        stratify=data["risk_event"],
    )

    model = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=220,
                    max_depth=8,
                    min_samples_leaf=8,
                    random_state=42,
                    class_weight="balanced",
                ),
            ),
        ]
    )
    model.fit(x_train, y_train)

    predictions = model.predict(x_test)
    probabilities = model.predict_proba(x_test)[:, 1]
    metrics = {
        "accuracy": round(accuracy_score(y_test, predictions), 3),
        "precision": round(precision_score(y_test, predictions), 3),
        "recall": round(recall_score(y_test, predictions), 3),
        "roc_auc": round(roc_auc_score(y_test, probabilities), 3),
    }

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    PROCESSED_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(PROCESSED_DATA_PATH, index=False)
    joblib.dump(
        {
            "model": model,
            "feature_names": FEATURE_NAMES,
            "metrics": metrics,
            "source": "synthetic_random_forest",
        },
        MODEL_PATH,
    )

    return metrics


if __name__ == "__main__":
    result = train()
    print("Model trained and saved to backend/models/risk_model.pkl")
    print(result)
