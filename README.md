# AI Clinical Decision Support System (CDSS)

A full-stack clinical decision support system for early patient risk detection. The project simulates a hospital triage workflow where patient vitals, lab values, demographics, and medical history are analyzed by machine learning models to estimate risk level and surface interpretable clinical signals.

> This project is for educational and portfolio use only. It is not a medical device and should not be used for real clinical diagnosis or treatment decisions.

## Overview

The AI Clinical Decision Support System predicts whether a patient is at low, medium, or high risk for adverse outcomes such as clinical deterioration, readmission, sepsis-like events, or cardiac complications. It combines healthcare data analysis, machine learning, explainable AI, and a web dashboard into one end-to-end system.

The goal is to demonstrate how biomedical engineering, healthcare analytics, and software engineering can work together to support earlier risk recognition in clinical environments.

## Key Features

- Patient risk prediction from vitals, lab values, age, and history indicators
- Probability-based risk scores with low, medium, and high risk labels
- REST API endpoint for real-time prediction requests
- Frontend dashboard for patient review and triage-style visualization
- CSV upload workflow for batch patient analysis
- High-risk patient alerts for simulated clinical monitoring
- Explainable AI output showing which features influenced each prediction
- Modular backend utilities for preprocessing, inference, and explanation

## Tech Stack

**Backend**

- Python
- Flask
- Pandas
- NumPy
- Scikit-learn

**Machine Learning**

- Logistic Regression
- Random Forest
- Optional XGBoost upgrade
- Clinical rule explanations in the current prototype
- Optional SHAP or LIME upgrade for model interpretability
- ROC-AUC, precision, recall, F1 score, and confusion matrix evaluation

**Frontend**

- HTML
- CSS
- JavaScript
- Optional React upgrade for a more advanced dashboard

**Deployment Targets**

- Backend: Render, Railway, or Fly.io
- Frontend: Netlify, Vercel, or GitHub Pages

## Project Structure

```text
cdss-project/
├── backend/
│   ├── app.py
│   ├── train_model.py
│   ├── routes/
│   │   └── predict.py
│   ├── models/
│   │   └── risk_model.pkl
│   └── utils/
│       ├── preprocess.py
│       └── explain.py
├── frontend/
│   ├── index.html
│   ├── dashboard.js
│   └── styles.css
├── data/
│   ├── raw/
│   └── processed/
├── notebooks/
│   └── model_training.ipynb
├── requirements.txt
└── README.md
```

## Dataset Options

Developed with synthetic or public tabular data, will later input ICU data.

The current prototype includes:

- `data/raw/sample_patients.csv` for testing CSV upload
- `backend/train_model.py` to generate synthetic patient data 

## Target Performance

- Accuracy: 85%+
- ROC-AUC: 0.85+
- High recall for high-risk patients
- Clear feature explanations for each prediction

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/cdss-project.git
cd cdss-project
```

### 2. Create a Virtual Environment

```bash
python -m venv .venv
source .venv/bin/activate
```

On Windows:

```bash
.venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Train the Demo Model

```bash
python backend/train_model.py
```

This creates:

- `backend/models/risk_model.pkl`
- `data/processed/synthetic_patient_data.csv`

## Running the Backend

From the project root:

```bash
python backend/app.py
```

The backend should expose a prediction endpoint such as:

```text
POST /predict
```

It also exposes:

```text
GET /health
POST /predict/batch
```

Example request body:

```json
{
  "age": 72,
  "heart_rate": 118,
  "systolic_bp": 91,
  "diastolic_bp": 58,
  "oxygen_saturation": 89,
  "temperature": 38.7,
  "respiratory_rate": 24,
  "glucose": 166,
  "creatinine": 1.8,
  "has_diabetes": 1,
  "has_hypertension": 1
}
```

## Running the Frontend

If the frontend uses plain HTML, CSS, and JavaScript, open:

```text
frontend/index.html
```

For GitHub Pages, use the static website files at the repository root:

```text
index.html
styles.css
dashboard.js
sample_patients.csv
```

In your GitHub repository settings, set Pages to deploy from the `main` branch and the `/root` folder. The public dashboard URL will be:

```text
https://inumartyrishab.github.io/cdss/
```

There is also a duplicate static copy in `docs/` if you prefer using the `/docs` Pages setting.

The dashboard expects the Flask API to run at:

```text
http://127.0.0.1:5001
```

The public website includes a browser-only demo predictor, so it can still calculate sample risk scores even before the Flask backend is deployed.

If the frontend is later upgraded to React, run the frontend development server from the frontend directory using the package manager configured for that version.

## Summary

Developed a full-stack AI Clinical Decision Support System that predicts patient risk levels using healthcare data, machine learning, and explainable AI. Built a backend prediction API, frontend triage dashboard, and model training pipeline to simulate real-time hospital risk assessment workflows.

## License

This project is intended for educational and portfolio purposes. 
