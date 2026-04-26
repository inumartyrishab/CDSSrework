const API_BASE_URL = "";

const form = document.querySelector("#patientForm");
const apiStatus = document.querySelector("#apiStatus");
const riskSummary = document.querySelector("#riskSummary");
const riskMeterFill = document.querySelector("#riskMeterFill");
const featureList = document.querySelector("#featureList");
const resultsBody = document.querySelector("#resultsBody");
const csvFile = document.querySelector("#csvFile");
const uploadButton = document.querySelector("#uploadButton");
const loadDemoButton = document.querySelector("#loadDemoButton");
const clearButton = document.querySelector("#clearButton");

let results = [];

const demoPatient = {
  patient_id: "P-1042",
  age: 72,
  heart_rate: 118,
  systolic_bp: 91,
  diastolic_bp: 58,
  oxygen_saturation: 89,
  temperature: 38.7,
  respiratory_rate: 24,
  glucose: 166,
  creatinine: 1.8,
  has_diabetes: 1,
  has_hypertension: 1,
};

function setApiStatus(text, state) {
  if (!apiStatus) return;
  apiStatus.textContent = text;
  apiStatus.className = `status-pill ${state}`;
}

async function checkApi() {
  if (!API_BASE_URL) {
    setApiStatus("Demo mode", "online");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error("API unavailable");
    setApiStatus("API online", "online");
  } catch {
    setApiStatus("Demo mode", "offline");
  }
}

function formToPatient() {
  const data = new FormData(form);
  const patient = {};
  for (const [key, value] of data.entries()) {
    patient[key] = value;
  }

  patient.has_diabetes = form.elements.has_diabetes.checked ? 1 : 0;
  patient.has_hypertension = form.elements.has_hypertension.checked ? 1 : 0;

  [
    "age",
    "heart_rate",
    "systolic_bp",
    "diastolic_bp",
    "oxygen_saturation",
    "temperature",
    "respiratory_rate",
    "glucose",
    "creatinine",
  ].forEach((key) => {
    patient[key] = Number(patient[key]);
  });

  return patient;
}

function loadPatientIntoForm(patient) {
  Object.entries(patient).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field) return;
    if (field.type === "checkbox") {
      field.checked = Number(value) === 1;
    } else {
      field.value = value;
    }
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function classifyRisk(probability) {
  if (probability >= 0.7) return "high";
  if (probability >= 0.35) return "medium";
  return "low";
}

function explainPatient(patient, probability) {
  const signals = [
    ["oxygen_saturation", "Oxygen saturation", "low oxygen saturation", patient.oxygen_saturation < 94, 94 - patient.oxygen_saturation, "%"],
    ["heart_rate", "Heart rate", "elevated heart rate", patient.heart_rate > 100, patient.heart_rate - 100, "bpm"],
    ["systolic_bp", "Systolic blood pressure", "low systolic blood pressure", patient.systolic_bp < 100, 100 - patient.systolic_bp, "mmHg"],
    ["temperature", "Temperature", "fever-range temperature", patient.temperature > 38, (patient.temperature - 38) * 20, "C"],
    ["respiratory_rate", "Respiratory rate", "elevated respiratory rate", patient.respiratory_rate > 22, patient.respiratory_rate - 22, "breaths/min"],
    ["creatinine", "Creatinine", "elevated creatinine", patient.creatinine > 1.3, (patient.creatinine - 1.3) * 25, "mg/dL"],
    ["age", "Age", "older age", patient.age > 65, patient.age - 65, "years"],
    ["glucose", "Glucose", "elevated glucose", patient.glucose > 180, (patient.glucose - 180) / 2, "mg/dL"],
  ];

  const explanations = signals
    .filter((signal) => signal[3])
    .map(([feature, label, reason, , weight, unit]) => ({
      feature,
      label,
      value: patient[feature],
      unit,
      impact: "increased risk",
      reason,
      relative_weight: Math.round(clamp(weight, 1, 100) * 10) / 10,
    }));

  if (patient.has_diabetes) {
    explanations.push({
      feature: "has_diabetes",
      label: "Diabetes history",
      value: 1,
      unit: "flag",
      impact: "increased risk",
      reason: "documented diabetes history",
      relative_weight: 14,
    });
  }

  if (patient.has_hypertension) {
    explanations.push({
      feature: "has_hypertension",
      label: "Hypertension history",
      value: 1,
      unit: "flag",
      impact: "increased risk",
      reason: "documented hypertension history",
      relative_weight: 10,
    });
  }

  explanations.sort((a, b) => b.relative_weight - a.relative_weight);

  if (!explanations.length) {
    return [
      {
        feature: "overall_profile",
        label: "Overall profile",
        value: Math.round(probability * 1000) / 10,
        unit: "%",
        impact: "lower risk",
        reason: "no major abnormal vital or lab signals in the submitted data",
        relative_weight: 0,
      },
    ];
  }

  return explanations.slice(0, 5);
}

function predictPatientDemo(patient) {
  let score = 0.08;
  score += Math.max(patient.age - 50, 0) * 0.006;
  score += Math.max(patient.heart_rate - 95, 0) * 0.012;
  score += Math.max(94 - patient.oxygen_saturation, 0) * 0.055;
  score += Math.max(patient.temperature - 37.8, 0) * 0.13;
  score += Math.max(patient.respiratory_rate - 20, 0) * 0.035;
  score += Math.max(105 - patient.systolic_bp, 0) * 0.012;
  score += Math.max(patient.creatinine - 1.2, 0) * 0.12;
  score += Math.max(patient.glucose - 160, 0) * 0.0015;
  score += patient.has_diabetes ? 0.05 : 0;
  score += patient.has_hypertension ? 0.035 : 0;

  const probability = clamp(score, 0.02, 0.97);
  return {
    patient_id: patient.patient_id || "manual-entry",
    risk_probability: Math.round(probability * 10000) / 10000,
    risk_percent: Math.round(probability * 1000) / 10,
    risk_level: classifyRisk(probability),
    top_features: explainPatient(patient, probability),
    model_source: "static demo predictor",
  };
}

async function predictPatient(patient) {
  if (!API_BASE_URL) {
    return predictPatientDemo(patient);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patient),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Prediction failed");
    return payload;
  } catch {
    return predictPatientDemo(patient);
  }
}

function riskClass(level) {
  if (level === "high") return "high";
  if (level === "medium") return "medium";
  return "low";
}

function renderSummary(result) {
  const level = riskClass(result.risk_level);
  riskSummary.innerHTML = `
    <div class="risk-score ${level}">${result.risk_percent}%</div>
    <div>
      <h2>${result.risk_level.toUpperCase()} risk</h2>
      <p>${result.patient_id} assessed with ${result.model_source}.</p>
    </div>
  `;
  riskMeterFill.style.width = `${Math.min(result.risk_percent, 100)}%`;
  riskMeterFill.className = level;

  featureList.innerHTML = result.top_features
    .map(
      (feature) => `
        <li>
          <strong>${feature.label}</strong>
          <span>${feature.reason} (${feature.value} ${feature.unit})</span>
        </li>
      `
    )
    .join("");
}

function renderTable() {
  if (!results.length) {
    resultsBody.innerHTML = '<tr><td colspan="4">No predictions yet.</td></tr>';
    return;
  }

  resultsBody.innerHTML = results
    .map((result) => {
      const primarySignal = result.top_features?.[0]?.label || "Overall profile";
      return `
        <tr>
          <td>${result.patient_id}</td>
          <td><span class="risk-tag ${riskClass(result.risk_level)}">${result.risk_level}</span></td>
          <td>${result.risk_percent}%</td>
          <td>${primarySignal}</td>
        </tr>
      `;
    })
    .join("");
}

function addResults(newResults) {
  results = [...newResults, ...results].slice(0, 25);
  renderSummary(newResults[0]);
  renderTable();
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line, index) => {
    const values = line.split(",").map((value) => value.trim());
    const row = {};
    headers.forEach((header, columnIndex) => {
      row[header] = values[columnIndex];
    });
    if (!row.patient_id) row.patient_id = `CSV-${index + 1}`;

    [
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
    ].forEach((key) => {
      row[key] = Number(row[key]);
    });

    return row;
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await predictPatient(formToPatient());
    addResults([result]);
  } catch (error) {
    alert(error.message);
  }
});

uploadButton.addEventListener("click", async () => {
  if (!csvFile.files.length) {
    alert("Choose a CSV file first.");
    return;
  }

  try {
    const text = await csvFile.files[0].text();
    const patients = parseCsv(text);
    const predictions = [];
    for (const patient of patients) {
      predictions.push(await predictPatient(patient));
    }
    addResults(predictions);
  } catch (error) {
    alert(error.message);
  }
});

loadDemoButton.addEventListener("click", () => loadPatientIntoForm(demoPatient));

clearButton.addEventListener("click", () => {
  results = [];
  renderTable();
  riskSummary.innerHTML = `
    <div class="risk-score low">--</div>
    <div>
      <h2>No prediction yet</h2>
      <p>Submit patient data to calculate risk.</p>
    </div>
  `;
  riskMeterFill.style.width = "0%";
  featureList.innerHTML = "<li>Waiting for prediction data.</li>";
});

loadPatientIntoForm(demoPatient);
checkApi();
