module.exports = String.raw`# Appendix B - Detailed Validation Table

| Case / source | Origin and method | Expected security outcome | V1 actual | V2 actual | Interpretation | Evidence |
|---|---|---|---|---|---|---|
| **D1 \`VAL-PS-FP-01\`, \`WIN-HR-02\`** | Lecturer Sysmon CSV, offline rule-equivalent evaluation | No final alert | MATCH | NO MATCH | Approved Excel HR automation demonstrates V1 over-breadth. | Figures 2, 3 |
| **D1 \`VAL-PS-TP-01\`, \`WIN-FIN-01\`** | Lecturer Sysmon CSV, offline rule-equivalent evaluation | Alert | MATCH | MATCH | Word-to-encoded-PowerShell behaviour retained. | Figures 2, 3 |
| **D2 \`VAL-BF-TP-01\`, \`198.51.100.23\`** | Lecturer auth CSV imported unchanged to a dedicated RONIN Wazuh Indexer historical-validation index; server-side scripted metric, with offline cross-check | Alert | MATCH | MATCH | 109 total failures, max 40 in five minutes, 6 distinct attempted usernames in the displayed maximum window. | Figure 4 |
| **D2 \`VAL-BF-TP-01\`, \`203.0.113.50\`** | Same lecturer case and Wazuh Indexer method, grouped by source | Alert | MATCH | MATCH | 106 total, max 38, 6 distinct attempted usernames. | Figure 4 |
| **D2 \`VAL-BF-TP-01\`, \`45.77.88.91\`** | Same lecturer case and Wazuh Indexer method, grouped by source | Alert | MATCH | MATCH | 115 total, max 46, 6 distinct attempted usernames. | Figure 4 |
| **\`SYN-D2-BENIGN-01\`** | 8 constructed in-memory events, 1 attempted username | Ideally no alert. Logic prediction: V1 match, V2 no match. | MATCH | NO MATCH | Plausible benign V1 alert suppressed by V2 in this synthetic scenario. | Figure 5 |
| **\`SYN-D2-RESIDUAL-01\`** | 12 constructed events, 3 attempted usernames | Ideally no alert. Logic prediction: both match. | MATCH | MATCH | Residual benign multi-account alert risk. | Figure 5 |
| **\`SYN-D2-COVERAGE-01\`** | 12 constructed malicious events, 1 attempted username | Ideally detected. Logic prediction: V1 match, V2 no match. | MATCH | NO MATCH | Demonstrates lost V2 single-account guessing coverage. | Figure 5 |
| **\`SYN-D2-SLOW-01\`** | 8 constructed events across 4 attempted usernames over 16 minutes | Broader credential monitoring should ideally detect it. Logic prediction: neither matches. | NO MATCH | NO MATCH | Shared low-rate limitation. The displayed maximum window contains 3 failures and 3 attempted usernames. | Figure 5 |
| **D3 \`VAL-DNS-C2-TP-01\`, \`10.20.10.21\`, \`cdn-update-checker.net\`** | Lecturer DNS CSV imported unchanged to a dedicated RONIN Wazuh Indexer historical-validation index; server-side scripted metric, with offline cross-check | Alert | MATCH | MATCH | 180 queries, mean 60 seconds, jitter 0 seconds. | Figure 6 |
| **D3 \`VAL-DNS-FP-01\`, \`10.20.20.50\`, \`monitoring.internal.corp\`** | Same Wazuh Indexer historical method | No final alert | MATCH | NO MATCH | 60 queries, mean 600 seconds, jitter 0 seconds. Host identity is unconfirmed. | Figure 6 |

---
`.replace(/\\`/g, '`');
