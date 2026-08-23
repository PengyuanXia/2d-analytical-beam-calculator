# 2D Analytical Beam Calculator

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A high-precision, interactive web application for solving 2D beams using exact closed-form **analytical Euler-Bernoulli beam theory**.

Computes and visualizes:
- **Support Reactions** ($R_z, M_R$)
- **Shear Force Diagrams** ($T(x)$)
- **Bending Moment Diagrams** ($M(x)$ drawn on the **tension side** / *włókna rozciągane*)
- **Displacement & Deflection** ($w(x)$ in mm)
- **Support Settlement / Movement** ($w_{\text{support}}$)
- **Step-by-Step Analytical Report** with KaTeX LaTeX formulas, equilibrium checks ($\sum F_z = 0, \sum M = 0$), and segment cut equations.

---

## 🌟 Key Features

1. **Exact Analytical Solver**:
   - Closed-form piecewise boundary value problem (BVP) solver using exact linear systems.
   - Solves statically determinate and indeterminate beams with any number of supports, prescribed support settlements, and internal moment hinges.
   - Computes exact roots for zero shear ($T=0$) and local moment extrema ($M_{\max}, M_{\min}$).

2. **Polish / European Structural Mechanics Conventions**:
   - **Bending Moment $M(x)$ on Tension Side**: Positive moments ($M > 0$, sagging) are plotted **downwards**; negative moments ($M < 0$, hogging) are plotted **upwards**.
   - **Shear Force $T(x)$**: Positive shear plotted downwards according to standard civil engineering convention.
   - **Deflection $w(x)$**: Downward deflection plotted in millimeters ($\text{mm}$).

3. **Intuitive & Responsive UI**:
   - Fast tabular inputs for Supports, Internal Hinges, Point Loads/Moments, and Distributed Loads (uniform and trapezoidal).
   - Clean, uncluttered distributed load diagrams with high-visibility directional arrows and no background obstruction.
   - **Launch Page Presets Showcase**: 8 classic benchmark presets and a Blank Beam designer ready in 1 click.
   - Live cursor tracking crosshair with dynamic coordinate readouts in status bar.
   - 1-click PNG image export and print-ready analytical calculation sheets.

---

## 🐙 How to Push to GitHub Using Git

Follow these simple steps in your terminal or Command Prompt / PowerShell:

### Step 1: Initialize Git Repository (if not already initialized)
```bash
git init
```

### Step 2: Add all project files
```bash
git add .
```

### Step 3: Create your commit
```bash
git commit -m "feat: 2D Analytical Beam Calculator with Presets and Exact Euler-Bernoulli Solver"
```

### Step 4: Link your GitHub repository
Create a new empty repository on [GitHub](https://github.com/new), then run:
```bash
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPOSITORY-NAME>.git
```
*(Replace `<YOUR-USERNAME>` and `<YOUR-REPOSITORY-NAME>` with your actual GitHub username and repository name)*

### Step 5: Push to GitHub
```bash
git branch -M main
git push -u origin main
```

---

## 🚀 Deployment to Vercel

This repository is preconfigured for **zero-config deployment on Vercel**:

1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Import your GitHub repository.
3. Click **Deploy** — Vercel will automatically detect the static project and deploy it instantly!

---

## 💻 Local Usage

### Method 1: Python Server
```bash
python server.py
```
This starts the local web server and automatically opens `http://localhost:8000`.

### Method 2: Windows Batch File
Double-click `start.bat`.

---

## 📄 License
MIT License
