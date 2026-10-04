"use strict";

const LB_TO_KG = 0.45359237;
const CM_PER_INCH = 2.54;
const GAUGE_MIN = 10;
const GAUGE_MAX = 40;

const $ = (id) => document.getElementById(id);
const units = { height: "cm", weight: "kg" };
let animationFrame = null;
let lastResult = null;

/* ---------- Conversions and calculations ---------- */

function convertHeightToMeters(h) {
  const cm = h.unit === "cm" ? h.cm : (h.ft * 12 + h.inch) * CM_PER_INCH;
  return cm / 100;
}

function convertWeightToKg(value, unit) {
  return unit === "lb" ? value * LB_TO_KG : value;
}

function calculateBMI(weightKg, heightM) {
  return weightKg / (heightM * heightM);
}

function getBMICategory(bmi) {
  if (bmi < 18.5) return { key: "u", name: "Underweight", cls: "t-u" };
  if (bmi < 25) return { key: "h", name: "Healthy weight", cls: "t-h" };
  if (bmi < 30) return { key: "o", name: "Overweight", cls: "t-o" };
  let obesityClass = "Class I";
  if (bmi >= 40) obesityClass = "Class III";
  else if (bmi >= 35) obesityClass = "Class II";
  return { key: "b", name: "Obesity", detail: obesityClass, cls: "t-b" };
}

function calculateHealthyWeightRange(heightM) {
  const sq = heightM * heightM;
  return { minKg: 18.5 * sq, maxKg: 24.9 * sq };
}

function getAgeGroup(age) {
  if (age < 30) return "18-29";
  if (age < 45) return "30-44";
  if (age < 60) return "45-59";
  return "60+";
}

/* ---------- Recommendations ---------- */

const AGE_FOCUS = {
  "18-29": "Focus on building sustainable exercise, nutrition and sleep habits that you can keep for years.",
  "30-44": "Focus on long-term consistency in activity and nutrition, along with preventive health checks.",
  "45-59": "Emphasise sustainable activity, strength, mobility and nutrition, plus routine health checks.",
  "60+": "Emphasise mobility, strength, balance and adequate nutrition, with guidance from a professional. Older adults should not assume weight loss is automatically the goal."
};

const ADVICE = {
  u: {
    dos: ["Keep regular, balanced meals", "Include protein-rich and nutrient-dense foods", "Maintain regular sleep", "Consider discussing unintended weight loss with a healthcare professional"],
    avoid: ["Skipping meals", "Relying on low-nutrient junk food to gain weight", "Unsupervised extreme diets"]
  },
  h: {
    dos: ["Maintain balanced nutrition", "Stay physically active", "Keep a consistent sleep routine", "Monitor long-term health habits"],
    avoid: ["Extreme dieting", "Excessive calorie restriction", "Treating BMI as the only measure of health"]
  },
  o: {
    dos: ["Build consistent physical activity", "Focus on balanced meals with vegetables, fruit, whole grains and suitable protein", "Track habits rather than daily weight changes", "Consider professional guidance if weight management feels difficult"],
    avoid: ["Crash diets", "Extreme fasting without professional guidance", "Unverified weight-loss supplements", "Shame-based dieting"]
  },
  b: {
    dos: ["Consider discussing weight and health goals with a qualified healthcare professional", "Build sustainable nutrition and activity habits", "Monitor relevant health indicators with professional guidance", "Focus on gradual, sustainable changes"],
    avoid: ["Extreme crash diets", "Unsafe rapid weight-loss methods", "Unverified weight-loss medications or supplements", "Self-diagnosing health conditions from BMI alone"]
  },
  minor: {
    dos: ["Talk with a parent or guardian about growth and health", "Ask a doctor or school nurse to check growth percentiles", "Enjoy regular physical activity and balanced meals", "Get enough sleep"],
    avoid: ["Dieting without medical guidance", "Comparing yourself to others based on a number", "Using adult BMI categories to judge your weight"]
  }
};

function generateRecommendations(category, age) {
  if (age < 18) return { ...ADVICE.minor, focus: "" };
  return { ...ADVICE[category.key], focus: AGE_FOCUS[getAgeGroup(age)] };
}

function buildSummary(category, age) {
  if (age < 18) {
    return {
      title: "Adult categories do not apply",
      text: "Adult BMI categories are not appropriate for people under 18. BMI for children and teenagers is interpreted using age- and sex-specific growth charts and percentiles. This is a general educational result only. Consider discussing it with a parent or guardian and a qualified healthcare professional."
    };
  }
  const base = {
    u: ["Your BMI is below the standard adult healthy-weight range.", "Based on BMI alone, your result falls in the underweight range. This does not diagnose anything, and individual health can vary. If your weight changed without intention, consider talking with a healthcare professional."],
    h: ["Your BMI falls within the standard healthy-weight range for adults.", "Based on BMI alone, your result is within the standard range. BMI is a screening measure and does not directly measure body fat or overall health."],
    o: ["Your BMI is above the standard adult healthy-weight range.", "Based on BMI alone, your result falls in the overweight range. Many factors affect health, including muscle mass, activity and where body fat is carried."],
    b: ["Your BMI is substantially above the standard adult healthy-weight range.", "Based on BMI alone, your result falls in the obesity range" + (category.detail ? " (" + category.detail + ")" : "") + ". This is a screening result, not a diagnosis. Consider discussing it with a healthcare professional who can look at your wider health."]
  }[category.key];
  return { title: base[0], text: base[1] };
}

/* ---------- Validation ---------- */

function parseNumber(raw) {
  const text = String(raw).trim();
  if (text === "") return { empty: true };
  const n = Number(text);
  return Number.isFinite(n) ? { value: n } : { invalid: true };
}

function setError(id, message) {
  const el = $("err-" + id);
  el.textContent = message || "";
  const fields = { age: ["age"], height: ["heightCm", "heightFt", "heightIn"], weight: ["weight"] }[id];
  fields.forEach((f) => $(f).setAttribute("aria-invalid", message ? "true" : "false"));
}

function validateAge() {
  const p = parseNumber($("age").value);
  let msg = "";
  if (p.empty) msg = "Enter your age.";
  else if (p.invalid) msg = "Age must be a number.";
  else if (!Number.isInteger(p.value)) msg = "Enter age as a whole number.";
  else if (p.value < 2 || p.value > 120) msg = "Enter an age between 2 and 120.";
  setError("age", msg);
  return msg ? null : p.value;
}

function validateHeight() {
  let msg = "";
  let result = null;
  if (units.height === "cm") {
    const p = parseNumber($("heightCm").value);
    if (p.empty) msg = "Enter your height.";
    else if (p.invalid) msg = "Height must be a number.";
    else if (p.value < 50 || p.value > 250) msg = "Enter a height between 50 and 250 cm.";
    else result = { unit: "cm", cm: p.value };
  } else {
    const f = parseNumber($("heightFt").value);
    const i = $("heightIn").value.trim() === "" ? { value: 0 } : parseNumber($("heightIn").value);
    if (f.empty) msg = "Enter feet.";
    else if (f.invalid || i.invalid) msg = "Feet and inches must be numbers.";
    else if (!Number.isInteger(f.value) || f.value < 1 || f.value > 8) msg = "Feet must be a whole number from 1 to 8.";
    else if (i.value < 0 || i.value >= 12) msg = "Inches must be 0 or more and less than 12.";
    else {
      const total = (f.value * 12 + i.value) * CM_PER_INCH;
      if (total < 50 || total > 250) msg = "Height must be between about 1 ft 8 in and 8 ft 2 in.";
      else result = { unit: "ftin", ft: f.value, inch: i.value };
    }
  }
  setError("height", msg);
  return msg ? null : result;
}

function validateWeight() {
  const p = parseNumber($("weight").value);
  const min = units.weight === "kg" ? 10 : 22;
  const max = units.weight === "kg" ? 400 : 880;
  let msg = "";
  if (p.empty) msg = "Enter your weight.";
  else if (p.invalid) msg = "Weight must be a number.";
  else if (p.value < min || p.value > max) msg = "Enter a weight between " + min + " and " + max + " " + units.weight + ".";
  setError("weight", msg);
  return msg ? null : p.value;
}

function validateForm() {
  const age = validateAge();
  const height = validateHeight();
  const weight = validateWeight();
  if (age === null || height === null || weight === null) return null;
  return { age, height, weight, sex: $("sex").value };
}

/* ---------- Rendering ---------- */

function formatWeight(kg, unit) {
  const v = unit === "lb" ? kg / LB_TO_KG : kg;
  return v.toFixed(1) + " " + unit;
}

function gaugePercent(bmi) {
  const clamped = Math.min(Math.max(bmi, GAUGE_MIN), GAUGE_MAX);
  return ((clamped - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100;
}

function animateBMI(bmi) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const target = Number(bmi.toFixed(1));
  const marker = $("marker");
  cancelAnimationFrame(animationFrame);
  if (reduce) {
    $("bmiValue").textContent = target.toFixed(1);
    marker.style.left = gaugePercent(target) + "%";
    return;
  }
  const duration = 1000;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    $("bmiValue").textContent = (target * eased).toFixed(1);
    marker.style.left = gaugePercent(target * eased) + "%";
    if (t < 1) animationFrame = requestAnimationFrame(step);
  };
  animationFrame = requestAnimationFrame(step);
}

function fillList(id, items) {
  const list = $(id);
  list.innerHTML = "";
  items.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  });
}

function addFact(parent, label, value) {
  const row = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  dd.textContent = value;
  row.append(dt, dd);
  parent.appendChild(row);
}

function renderResults(data) {
  const heightM = convertHeightToMeters(data.height);
  const weightKg = convertWeightToKg(data.weight, units.weight);
  const bmi = calculateBMI(weightKg, heightM);
  if (!Number.isFinite(bmi)) return;

  const isMinor = data.age < 18;
  const category = isMinor ? { key: "minor", name: "Age-specific interpretation needed", cls: "t-n" } : getBMICategory(bmi);
  const summary = buildSummary(category, data.age);
  const advice = generateRecommendations(category, data.age);
  const bmiText = bmi.toFixed(1);

  lastResult = data;
  $("emptyState").hidden = true;
  $("resultPanel").hidden = false;
  $("catBadge").textContent = isMinor ? category.name : category.name + (category.detail ? " (" + category.detail + ")" : "");
  $("catBadge").className = "cat " + category.cls;
  $("summaryTitle").textContent = summary.title;
  $("summaryText").textContent = summary.text;

  $("gaugeBox").hidden = isMinor;
  $("rangeBox").hidden = isMinor;
  $("gaugeTrack").setAttribute("aria-label", "BMI " + bmiText + " on a scale from underweight to obesity");

  if (!isMinor) {
    const range = calculateHealthyWeightRange(heightM);
    $("rangeVal").textContent = formatWeight(range.minKg, units.weight) + " \u2013 " + formatWeight(range.maxKg, units.weight);
  }

  const facts = $("facts");
  facts.innerHTML = "";
  addFact(facts, "BMI value", bmiText);
  addFact(facts, "BMI category", isMinor ? "Not classified (under 18)" : category.name + (category.detail ? ", " + category.detail : ""));
  if (!isMinor) {
    const r = calculateHealthyWeightRange(heightM);
    addFact(facts, "BMI-based weight range", formatWeight(r.minKg, units.weight) + " \u2013 " + formatWeight(r.maxKg, units.weight));
    addFact(facts, "Age group", getAgeGroup(data.age));
  }
  $("ageNote").textContent = advice.focus;

  fillList("doList", advice.dos);
  fillList("avoidList", advice.avoid);
  $("sexNote").textContent = data.sex === "none" ? "" : "Note: the BMI formula and adult categories are the same regardless of sex, although body composition and health interpretation can differ.";

  animateBMI(bmi);
}

/* ---------- Actions ---------- */

function handleSubmit(event) {
  event.preventDefault();
  const data = validateForm();
  if (!data) {
    const firstBad = document.querySelector('[aria-invalid="true"]');
    if (firstBad) firstBad.focus();
    return;
  }
  const btn = $("calcBtn");
  btn.classList.add("loading");
  setTimeout(() => {
    btn.classList.remove("loading");
    renderResults(data);
    $("results").scrollIntoView({ behavior: "smooth" });
  }, 400);
}

function setUnit(kind, unit) {
  const previous = units[kind];
  if (previous === unit) return;
  convertEnteredValue(kind, previous, unit);
  units[kind] = unit;
  document.querySelectorAll('.seg button[data-kind="' + kind + '"]').forEach((b) => {
    const on = b.dataset.unit === unit;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  });
  if (kind === "height") {
    $("heightCmWrap").hidden = unit !== "cm";
    $("heightFtWrap").hidden = unit !== "ftin";
    setError("height", "");
  } else {
    $("weightSuffix").textContent = unit;
    setError("weight", "");
  }
}

// Carry already-entered values across when the unit changes
function convertEnteredValue(kind, from, to) {
  if (kind === "weight") {
    const p = parseNumber($("weight").value);
    if (p.value === undefined) return;
    $("weight").value = (to === "lb" ? p.value / LB_TO_KG : p.value * LB_TO_KG).toFixed(1);
  } else if (from === "cm") {
    const p = parseNumber($("heightCm").value);
    if (p.value === undefined) return;
    const totalIn = p.value / CM_PER_INCH;
    let ft = Math.floor(totalIn / 12);
    let inch = Math.round((totalIn - ft * 12) * 10) / 10;
    if (inch >= 12) { ft += 1; inch = 0; }
    $("heightFt").value = ft;
    $("heightIn").value = inch;
  } else {
    const f = parseNumber($("heightFt").value);
    const i = $("heightIn").value.trim() === "" ? { value: 0 } : parseNumber($("heightIn").value);
    if (f.value === undefined || i.value === undefined) return;
    $("heightCm").value = ((f.value * 12 + i.value) * CM_PER_INCH).toFixed(1);
  }
}

function resetAssessment() {
  cancelAnimationFrame(animationFrame);
  $("bmiForm").reset();
  setUnit("height", "cm");
  setUnit("weight", "kg");
  ["age", "height", "weight"].forEach((id) => setError(id, ""));
  $("resultPanel").hidden = true;
  $("emptyState").hidden = false;
  $("bmiValue").textContent = "0.0";
  $("marker").style.left = "0%";
  lastResult = null;
  $("assessment").scrollIntoView({ behavior: "smooth" });
  $("age").focus({ preventScroll: true });
}

/* ---------- Theme, menu, reveal ---------- */

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem("vm-theme", next); } catch (e) { /* storage unavailable */ }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("themeToggle").setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
}

function loadTheme() {
  let saved = null;
  try { saved = localStorage.getItem("vm-theme"); } catch (e) { /* ignore */ }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

function toggleMenu(force) {
  const open = typeof force === "boolean" ? force : !$("nav").classList.contains("open");
  $("nav").classList.toggle("open", open);
  $("menuToggle").setAttribute("aria-expanded", String(open));
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  items.forEach((el) => io.observe(el));
}

function initializeApp() {
  loadTheme();
  initReveal();
  $("bmiForm").addEventListener("submit", handleSubmit);
  $("resetBtn").addEventListener("click", resetAssessment);
  $("resetBtn2").addEventListener("click", resetAssessment);
  $("printBtn").addEventListener("click", () => window.print());
  $("themeToggle").addEventListener("click", toggleTheme);
  $("menuToggle").addEventListener("click", () => toggleMenu());
  $("nav").addEventListener("click", (e) => { if (e.target.tagName === "A") toggleMenu(false); });
  document.querySelectorAll(".seg button").forEach((b) =>
    b.addEventListener("click", () => setUnit(b.dataset.kind, b.dataset.unit)));

  // Live validation once a field has been touched
  [["age", validateAge], ["heightCm", validateHeight], ["heightFt", validateHeight], ["heightIn", validateHeight], ["weight", validateWeight]]
    .forEach(([id, fn]) => $(id).addEventListener("blur", fn));
  ["age", "heightCm", "heightFt", "heightIn", "weight"].forEach((id) =>
    $(id).addEventListener("input", () => {
      if ($(id).getAttribute("aria-invalid") === "true") {
        ({ age: validateAge, weight: validateWeight }[id] || validateHeight)();
      }
    }));
}

document.addEventListener("DOMContentLoaded", initializeApp);
