# Desver – Income Protection for Gig Workers

**Tagline:** *Predict. Protect. Pay.*

Desver is a parametric micro-insurance platform designed to protect gig delivery workers from income loss caused by external disruptions such as extreme weather, pollution, and route blockages.

---

## Team

Developed by a small engineering team. Roles are assigned as follows:

- Shirsh Gupta — Backend Engineering  
- Rudranshi Mittal — Backend Engineering  
- Vishakha — Infrastructure & DevOps Engineering  
- Vikal Dubey — Frontend Engineering  
- Satyarth Ojha — Artificial Intelligence & Machine Learning Engineering

---

# Table of Contents

1. Problem Statement
2. Proposed Solution
3. Key Features
4. System Architecture
5. AI Model Workflow
5A. Adversarial Defense & Anti-Spoofing Strategy
6. Data Sources
7. Example Scenario
8. Business Model
9. Unit Economics
10. Tech Stack
11. Product Demo Flow
12. Expected Impact
13. Future Roadmap
14. Project Folder Structure
15. Repository Setup
16. Final Vision
17. Pitch Deck
18. License

---

# 1. Problem Statement

Gig delivery workers such as **Swiggy, Zomato, Blinkit, and Uber delivery partners** rely on daily orders for their income.

However, their earnings are frequently affected by disruptions such as:

* Traffic congestion
* Flooded or blocked routes
* Extreme weather
* Pollution spikes

Through conversations with delivery workers, we discovered that **order cancellations and long waiting times cause significant income loss** because workers waste time, fuel, and miss other potential orders.

Currently, gig workers **have limited protection against these small but frequent financial losses**.

---

# 2. Proposed Solution

**Desver** is a parametric insurance system designed specifically for gig delivery workers.

The platform monitors delivery events in real time and automatically compensates workers when disruptions cause measurable income loss.

Desver combines:

* Event-driven architecture
* Risk prediction
* Parametric insurance triggers
* Real-time event processing

to create a scalable financial safety system for gig workers.

---

# 3. Key Features

## 3.1 Weather-Based Disruption Insurance

Desver detects extreme weather conditions such as heavy rain or heatwaves and compensates workers when working becomes difficult or unsafe.

---

## 3.2 Pollution & Environmental Risk Coverage

When pollution levels exceed safe thresholds, workers may reduce activity. Desver provides compensation during such conditions.

---

## 3.3 Road & Traffic Disruption Detection

Desver identifies blocked routes, traffic restrictions, or city-wide disruptions and triggers compensation accordingly.

---

## 3.4 AI Route Risk Predictor

Desver analyzes traffic data, weather conditions, and historical delivery patterns to identify risky delivery routes.

The system predicts:

* High traffic delay routes
* Flood-prone areas
* Protest or blocked roads

Example output:

Route A → Risk 82% (avoid)
Route B → Risk 18% (safe)

Workers receive safer route suggestions to minimize delays.

---

## 3.5 Route-Based Insurance Plans

Desver dynamically adjusts insurance pricing based on delivery route risk.

Example:

Low Risk Route
Premium = ₹50/week

Medium Risk Route
Premium = ₹60/week

High Risk Route
Premium = ₹80/week

Workers operating in higher-risk zones receive higher protection coverage.

This **AI-driven pricing model ensures sustainability while protecting workers**.

---

## 3.6 Optional Extension (Future Scope)

While Desver primarily focuses on external disruptions, future versions may explore platform-level inefficiencies such as order cancellations and delays to provide broader income protection.

---


# 4. System Architecture

```
Worker Mobile App
        │
        ▼
API Gateway
        │
        ▼
Node.js Backend (Express)
        │
        ├── MongoDB Database
        ├── Redis Cache
        │
        ▼
Kafka Event Stream
        │
        ▼
Event Processing Services
        │
        ▼
AI Risk Engine (Python)
        │
        ▼
Income Loss Estimator
        │
        ▼
Parametric Trigger Engine
        │
        ▼
Wallet / Compensation Payout
```

Desver uses an **event-driven architecture powered by Apache Kafka** to process delivery events in real time.

---

# 5. AI Model Workflow

```
Delivery Events
(weather events, pollution spikes, traffic disruptions)

        ↓

Kafka Event Stream

        ↓

Feature Processing

        ↓

AI Risk Model
(cancellation probability, delay prediction)

        ↓

Income Loss Estimator

        ↓

Parametric Trigger

        ↓

Automatic Compensation Decision
```

---

# 5A. Adversarial Defense & Anti-Spoofing Strategy

Desver is designed to be resilient against adversarial attacks such as GPS spoofing and coordinated fraud rings. Our system goes beyond basic location verification and uses multi-signal intelligence to ensure fair and accurate payouts.

---

## 1. Differentiation (Real vs Spoofed Workers)

Instead of relying only on GPS location, Desver validates real-world worker activity.

IF disruption detected
AND worker shows real delivery activity signals
→ Genuine claim

IF disruption detected
BUT no real activity or inconsistent behavior
→ Flagged as suspicious


Key validation signals:

- Delivery activity (orders completed, timestamps)
- Movement patterns (continuous vs static location)
- App interaction (active vs idle usage)

This ensures payouts are only given to workers genuinely impacted by disruptions.

---

## 2. Data Points Beyond GPS

Desver analyzes multiple behavioral and environmental signals:

- GPS movement consistency (not just coordinates)
- Delivery logs (order acceptance, completion)
- Network patterns (sudden location jumps)
- App session activity (foreground usage, time spent active)
- Weather correlation (does worker location match real conditions?)
- Cluster analysis (multiple users showing identical patterns)

Example fraud detection pattern:
500 workers
Same location
No movement
No deliveries
Same timestamps
→ Potential fraud ring detected


---

## 3. AI-Based Fraud Detection Model

Desver uses a fraud scoring mechanism:

Fraud Score = Location anomaly + Activity mismatch + Pattern similarity


If:
Fraud Score > threshold
→ Claim flagged for review


This helps detect:

- GPS spoofing attacks
- coordinated fraud groups
- fake disruption claims

---

## 4. UX Balance (Fairness for Honest Workers)

To avoid penalizing genuine workers:

- Flagged claims are NOT automatically rejected  
- Marked as **"Under Review"**  
- Workers can submit optional inputs (manual report, notes)

Fallback logic:

If disruption is confirmed
AND no strong fraud signal
→ Claim approved


This ensures a balance between fraud prevention and user fairness.

---

## 5. Smart Claim Processing Workflow

Disruption detected
↓
Validate worker activity & behavior
↓
Low fraud score → Auto payout
High fraud score → Flag for review
↓
Final decision (automated / assisted)


---

### Key Insight

Desver minimizes both **basis risk** and **adversarial exploitation** by combining parametric triggers with behavioral intelligence.

# 6. Data Sources

The AI system analyzes multiple data streams:

* Delivery event logs
* Restaurant reliability data
* Weather APIs
* Traffic APIs
* Historical delivery patterns
* Route congestion data

These inputs help predict disruptions and estimate potential income loss.

---

# 7. Example Scenario

Delivery Partner: **Shirsh Gupta**  
Platform: Zomato  

Scenario:

Heavy rainfall occurs in Delhi during peak delivery hours.

Shirsh is unable to accept or complete deliveries due to unsafe weather conditions and low order availability.

---

Impact:

- Loss of working hours  
- Reduced order opportunities  
- Decreased daily income  

---

System Response:

Weather API detects rainfall above threshold  
AI validates disruption in the region  
Worker activity drops significantly  

if rainfall > threshold AND worker activity is low
→ trigger compensation


Micro-compensation is automatically credited to Shirsh’s wallet.

---

# 8. Business Model

Desver follows a **micro-insurance model**.

Workers pay a small weekly premium in exchange for disruption protection.

Example:

Weekly premium = ₹80

If disruption occurs:

Estimated income loss = ₹120
Compensation paid = ₹50–₹100

Because thousands of workers contribute small premiums, the system can compensate affected workers while remaining profitable.

---

# 9. Unit Economics

Revenue per worker:

₹80 per week

Annual revenue:

₹80 × 52 = ₹4160

Estimated yearly payout:

₹1200

Platform cost:

₹300

Estimated yearly profit per worker:

₹2660

AI risk pricing helps optimize premium levels and prevent fraudulent claims.

---

# 10. Tech Stack

### Frontend

* React.js
* Tailwind CSS

### Backend

* Node.js
* Express.js

### Database

* MongoDB

### Cache

* Redis

### Event Streaming

* Apache Kafka

### AI / Machine Learning

* Python
* Scikit-learn

### Cloud Infrastructure

* AWS
* Docker

---

# 11. Product Demo Flow

### Step 1 – Disruption Detected


weather_alert
location: Delhi
rainfall: 85mm
timestamp: 10:05 AM


Event is detected via external weather API and sent to the Kafka event stream.

---

### Step 2 – Event Processing

The disruption event is processed by the system and mapped to affected regions and workers.

---

### Step 3 – AI Risk Analysis

AI evaluates:

* severity of weather conditions  
* geographic impact area  
* worker activity levels  
* historical disruption patterns  

Output:

Disruption Severity Score = 0.87  
Estimated Income Loss = ₹300  

---

### Step 4 – Compensation Trigger

If conditions exceed predefined thresholds, the parametric insurance engine triggers compensation.

Example rule:

if rainfall > threshold AND worker activity is low
→ trigger compensation


---

### Step 5 – Automatic Payout

Compensation = ₹300
Reason = Weather Disruption


Worker receives notification:

"₹300 Desver compensation credited due to heavy rainfall."

---

# 12. Expected Impact

Desver can support millions of gig workers by:

* protecting daily income
* reducing financial uncertainty
* improving delivery partner retention
* enabling scalable micro-insurance systems

---

# 13. Future Roadmap

### Phase 1 – MVP

* Weather disruption detection  
* Pollution risk detection  
* Traffic disruption handling  
* Kafka event processing  
* AI risk prediction  

### Phase 2 – Platform Integration

Integration with:

* Swiggy
* Zomato
* Blinkit
* Uber Eats

### Phase 3 – Advanced AI

* Delivery demand forecasting
* Restaurant reliability scoring
* Dynamic premium pricing
* Fraud detection

### Phase 4 – Gig Worker Financial Ecosystem

* Emergency micro-loans
* Smart savings tools
* AI-based disruption prediction alerts
* Financial dashboard

### Phase 5 – Global Expansion

Target regions:

* Southeast Asia
* Europe
* Latin America

---

# 14. Project Folder Structure

```
Desver/
│
├── frontend/
├── backend/
├── ai-engine/
├── kafka/
├── database/
├── infrastructure/
└── README.md
```

---

# 15. Repository Setup

Clone repository:

```
git clone https://github.com/<team-repository-owner>/desver
cd desver
```

Install dependencies:

```
npm install
```

Create local environment file:

```
npm run setup
```

Update `.env` with your Atlas URI:

```
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/desver?retryWrites=true&w=majority&appName=Cluster0"
```

Run frontend + backend together:

```
npm run dev:full
```

Run only backend:

```
npm run dev:backend
```

Run only frontend:

```
npm run dev:frontend
```

Seed hackathon demo data (recommended before demo):

```
npm run seed:demo
```

### Deployment (Render single service)

- Build command: `npm install --legacy-peer-deps && npm run build`
- Start command: `npm run start`
- Env vars required:
  - `MONGODB_URI`
  - `NODE_ENV=production`
  - `CRON_INTERVAL_MS=0`

This project serves the built React app from the same Node service in production, so frontend and backend deploy together.

---

# 16. Final Vision

Desver aims to become the **AI-powered financial protection layer for the global gig economy**.

By combining AI risk prediction, event-driven systems, and parametric insurance, Desver ensures gig workers are protected from everyday disruptions such as external disruptions such as weather, pollution, and infrastructure failures.

---

# 17. Pitch Deck

Public pitch deck and demo assets are available here:

- [Desver Pitch Deck (Google Drive)](https://drive.google.com/drive/folders/1bNhunw5q8Bjka-suy8MSPkOFI2GpG7z8?usp=drive_link)
- `Video:` `Video1776446951357170.mp4` (available inside the Drive folder)
- `Pitch PDF:` `DESVER.pdf` (available inside the Drive folder)

---

# 18. License

This project was created as a hackathon prototype and is intended for demonstration purposes.
