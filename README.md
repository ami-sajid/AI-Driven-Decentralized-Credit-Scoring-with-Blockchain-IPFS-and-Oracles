# Blockchain Meets AI-Powered Oracles and Decentralized Storage

Watch this video

[![Watch the video](https://img.youtube.com/vi/dWDNfRKjUOQ/maxresdefault.jpg)](https://www.youtube.com/watch?v=dWDNfRKjUOQ)


**A Secure and Scalable Framework for Decentralized Credit Scoring**

Senior Design Project (CSE499B) · Department of Computer Science and Engineering, North South University

## Overview

Millions of people in Bangladesh — farmers, rural entrepreneurs, freelancers — remain excluded from formal credit because they have no traditional repayment history ("thin-file" borrowers), even though they generate rich alternative data through mobile transactions and utility payments. On top of that, existing credit scoring is largely centralized and opaque: users can't see how a score was calculated, and centralized databases are single points of failure for tampering.

This project builds a **hybrid decentralized credit scoring system** that combines:

- An **off-chain AI scoring engine** (stacked ensemble ML) that turns alternative borrower data into an industry-standard credit score (300–850).
- **IPFS** for storing the score record (so sensitive data never sits directly on-chain).
- An **Ethereum smart contract** that only stores a content identifier (CID) as a tamper-evident, verifiable pointer to the off-chain record.
- A custom **Node.js oracle** that bridges the on-chain request/response cycle with off-chain AI inference and IPFS, since smart contracts cannot call external APIs or storage on their own.

## Why this architecture

Blockchains are deterministic and can't read external data or store large payloads cheaply. So instead of forcing everything on-chain, the system:

1. Keeps the heavy lifting (ML inference, data storage) off-chain.
2. Publishes only a small, verifiable fingerprint (the IPFS CID) on-chain.
3. Uses an **event-driven oracle** to connect the two worlds — the contract emits events, the oracle listens, fetches, validates, and writes the result back.

This keeps gas costs low, avoids putting sensitive borrower data on a public ledger, and still gives users a tamper-evident, auditable trail of every score request.

## System Architecture

```
 ┌────────────────────────┐        ┌───────────────────────────┐        ┌────────────────────┐
 │  AI PIPELINE (off-chain)│        │  FRONTEND / USER          │        │  BLOCKCHAIN LAYER   │
 │  Dataset → preprocessing│        │  MetaMask wallet auth     │        │  Solidity contract   │
 │  → ML/DL models → PD    │        │  Requests credit score    │◄──────►│  on Sepolia testnet  │
 │  → score via PDO scaling│        │  Listens for result event │        │  Emits request/      │
 └───────────┬─────────────┘        └───────────────────────────┘        │  response events     │
             │ JSON (score + metadata)                                   └──────────┬───────────┘
             ▼                                                                       │
 ┌────────────────────────┐        ┌───────────────────────────┐                     │
 │  DECENTRALIZED STORAGE  │◄──────►│  ORACLE / BACK-END        │◄────────────────────┘
 │  IPFS stores JSON,      │        │  Node.js service (server.js)
 │  returns a CID          │        │  Listens for events, maps
 └────────────────────────┘        │  userId → CID (CSV db),
                                     │  fetches from IPFS (gateway
                                     │  fallback), validates, calls
                                     │  back to the smart contract
                                     └───────────────────────────┘
```

**End-to-end flow:**

1. User connects MetaMask and requests a credit score from the frontend.
2. The smart contract logs the request and emits a `CreditScoreRequested` event.
3. The oracle (`server.js`) polls for this event, resolves the user's IPFS CID from a CSV mapping database, and fetches the score JSON from IPFS (with multi-gateway fallback for reliability).
4. The oracle validates the payload (JSON structure, valid score field/range) and calls `fulfillCreditScore` on the contract.
5. The contract updates state and emits `CreditScoreReceived`; the frontend listens for this and displays the score to the user.
6. Deduplication and cooldown logic in the oracle prevent duplicate or spammy callback transactions.

## AI / Credit Scoring Pipeline

A two-level **stacked ensemble** is used to predict Probability of Default (PD), which is then converted into a standard credit score:

- **Data balancing:** SMOTE is applied to correct for the natural class imbalance in credit data (defaulters are the minority class).
- **Level-0 base learners:**
  - **XGBoost** (gradient-boosted trees, tuned with Optuna) — captures non-linear interactions in tabular data.
  - **MLP neural network** (64 → 32 hidden units, ReLU) — captures complex, high-dimensional feature interactions.
- **Level-1 meta-learner:** Logistic Regression combines the base learners' probability outputs into a calibrated final PD.
- **Score generation:** PD is converted to good/bad odds and mapped to a score using a log-odds **Points-to-Double-the-Odds (PDO)** scaling scheme (the same style of transformation used in industry scorecards), with a final clipping step to keep scores within an operational range (e.g., 300–850).
- **Explainability (XAI):** SHAP is used for both global feature importance (beeswarm plots) and per-applicant explanations (waterfall plots), so score decisions aren't a black box.

### Model performance

| Model | AUC | F1 | Precision | Recall | Training time |
|---|---|---|---|---|---|
| Logistic Regression | 0.855 | 0.772 | 0.782 | 0.762 | 2.6s |
| Random Forest | 0.918 | 0.832 | 0.840 | 0.825 | 5.9s |
| XGBoost | 0.983 | 0.939 | 0.961 | 0.918 | 1.7s |
| Neural Network (MLP) | 0.830 | 0.755 | 0.706 | 0.813 | 213.5s |
| **Advanced Stacked Ensemble** | **0.984** | **0.948** | 0.956 | **0.940** | 49.2s |

The stacked ensemble achieved the best overall discrimination (AUC 0.984) and F1/Recall, while XGBoost alone came close with the highest precision and by far the lowest training cost — a useful trade-off to consider for lightweight deployment.

At the system level, the end-to-end request-to-display latency on the Sepolia testnet averaged around **34 seconds**, dominated by blockchain confirmation time, oracle polling interval, and IPFS retrieval variability.

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Browser-based Web UI | User interaction, score display |
| Wallet | MetaMask | Wallet connection, transaction signing, authentication |
| Blockchain | Ethereum (Sepolia testnet) | Test environment for contract deployment |
| Smart Contract | Solidity | On-chain request/response logic, event emission |
| Node Provider | Alchemy | RPC connection to Ethereum |
| Oracle / Backend | Node.js (`server.js`) | Listens for events, fetches from IPFS, submits callback |
| Data Mapping | CSV database | Maps `userId → IPFS CID` |
| Storage | IPFS | Decentralized storage of credit score JSON payloads |
| Gateways | Multiple IPFS gateways | Redundant retrieval / fallback |
| Dev Tools | Hardhat | Compile, deploy, test smart contracts |
| ML Stack | XGBoost, scikit-learn (MLP/Logistic Regression), Optuna, SMOTE, SHAP | Model training, tuning, explainability |

## Key Contributions

- **Advanced stacking ensemble with log-odds scaling** — combines XGBoost, an MLP, and a logistic-regression meta-learner, then maps the calibrated PD to an industry-style credit score via PDO scaling.
- **Hybrid on-chain/off-chain storage** — sensitive credit data lives in IPFS; the blockchain only stores the CID, minimizing gas costs while preserving tamper-evidence.
- **Custom event-driven oracle** — a Node.js service that forms a trustless bridge between off-chain AI inference/storage and the on-chain smart contract, with gateway fallback, deduplication, and cooldown protections.
- **Explainable AI (XAI) framework** — SHAP-based global and per-applicant explanations, plus ROC/PR curves and score distribution analysis, to keep scoring decisions interpretable rather than a black box.

## Limitations

- The system can make records tamper-evident but cannot verify the truthfulness of self-reported borrower data ("garbage in, garbage out").
- Relies on an always-on oracle service and a CSV-based `userId → CID` mapping, which is simple but introduces a manual, centralized point of failure in the current prototype.
- Latency and gas costs are structural: confirmation times, oracle polling cadence, and IPFS gateway variability set a floor on responsiveness, and multiple transactions per request cycle would need cost analysis for mainnet use.
- Blockchain transparency can still enable transaction-graph linkage attacks, so privacy is improved but not absolute.

## Future Work

- A frontend AI assistant to guide registration and sanitize inputs before they reach the backend.
- Automating the `userId → CID` mapping/update process instead of maintaining it manually.
- Fully end-to-end linking of score generation → IPFS publication → on-chain update in a single orchestrated workflow.
- Moving the oracle from fixed-interval polling to event-native subscriptions to reduce latency.
- Adding calibration and decision-utility analysis alongside AUC/PR metrics, plus systematic fairness and privacy audits for real-world deployment in the Bangladesh microfinance context.

## Authors

- Md. Mehenuf Hossain Bhuiyan (2111397642)
- S. K. Sajid Anam (2211624042)

**Faculty Advisor:** Dr. Mohammad Abdul Qayum, Assistant Professor, Dept. of CSE, North South University

## Keywords

Decentralized credit scoring · Financial inclusion · Thin-file borrowers · Bangladesh microfinance · Machine learning · Probability of Default (PD) · Blockchain · Smart contracts · Oracles · IPFS · Content Identifier (CID) · Event-driven architecture · Web3 · MetaMask

---

> This repository contains the prototype developed for the CSE499B Senior Design Project at North South University (Summer 2026). It is a research/academic prototype built and tested on the Ethereum Sepolia testnet — not a production financial system.
