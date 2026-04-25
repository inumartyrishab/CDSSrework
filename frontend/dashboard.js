const API_BASE_URL = "http://127.0.0.1:5001";

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
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error("API unavailable");
    setApiStatus("API online", "online");
  } catch {
    setApiStatus("Start backend", "offline");
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

async function predictPatient(patient) {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patient),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Prediction failed");
  return payload;
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
      <p>${result.patient_id} assessed with ${result.model_source.replaceAll("_", " ")}.</p>
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
    const response = await fetch(`${API_BASE_URL}/predict/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patients }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Batch prediction failed");
    addResults(payload.predictions);
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
