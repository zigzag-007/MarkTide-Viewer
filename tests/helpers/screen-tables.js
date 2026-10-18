const reportAppendix = String.raw`# Appendix B: Detailed Validation Table

| Case / source | Origin and method | Expected security outcome | V1 actual | V2 actual | Interpretation | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| **D1 \`VAL-PS-FP-01\`, \`WIN-HR-02\`** | Lecturer Sysmon CSV, offline rule equivalent evaluation | No final alert | MATCH | NO MATCH | Approved Excel HR automation shows that V1 is too broad. | Figures 2, 3 |
| **D1 \`VAL-PS-TP-01\`, \`WIN-FIN-01\`** | Lecturer Sysmon CSV, offline rule equivalent evaluation | Alert | MATCH | MATCH | Word launching encoded PowerShell is kept. | Figures 2, 3 |
| **D2 \`VAL-BF-TP-01\`, \`198.51.100.23\`** | Lecturer authentication CSV imported unchanged to a separate RONIN Wazuh Indexer historical validation index; scripted metric runs on the server, with an offline cross check | Alert | MATCH | MATCH | 109 total failures, maximum 40 in five minutes, 6 distinct attempted usernames in the displayed maximum window. | Figure 4 |
| **D2 \`VAL-BF-TP-01\`, \`203.0.113.50\`** | Same lecturer case and Wazuh Indexer method, grouped by source | Alert | MATCH | MATCH | 106 total, maximum 38, 6 distinct attempted usernames. | Figure 4 |
| **D2 \`VAL-BF-TP-01\`, \`45.77.88.91\`** | Same lecturer case and Wazuh Indexer method, grouped by source | Alert | MATCH | MATCH | 115 total, maximum 46, 6 distinct attempted usernames. | Figure 4 |
| **\`SYN-D2-BENIGN-01\`** | 8 constructed events in memory, 1 attempted username | Ideally no alert. Logic prediction: V1 match, V2 no match. | MATCH | NO MATCH | Likely benign V1 alert removed by V2 in this synthetic case. | Figure 5 |
| **\`SYN-D2-RESIDUAL-01\`** | 12 constructed events, 3 attempted usernames | Ideally no alert. Logic prediction: both match. | MATCH | MATCH | Legitimate automation can still alert in V2. | Figure 5 |
| **\`SYN-D2-COVERAGE-01\`** | 12 constructed malicious events, 1 attempted username | Ideally detected. Logic prediction: V1 match, V2 no match. | MATCH | NO MATCH | Shows the single account guessing coverage lost in V2. | Figure 5 |
| **\`SYN-D2-SLOW-01\`** | 8 constructed events across 4 attempted usernames over 16 minutes | A broader credential rule should ideally detect it. Logic prediction: neither matches. | NO MATCH | NO MATCH | Both versions miss this low rate case. The displayed maximum window has 3 failures and 3 attempted usernames. | Figure 5 |
| **D3 \`VAL-DNS-C2-TP-01\`, \`10.20.10.21\`, \`cdn-update-checker.net\`** | Lecturer DNS CSV imported unchanged to a separate RONIN Wazuh Indexer historical validation index; scripted metric runs on the server, with an offline cross check | Alert | MATCH | MATCH | 180 queries, mean 60 seconds, jitter 0 seconds. | Figure 6 |
| **D3 \`VAL-DNS-FP-01\`, \`10.20.20.50\`, \`monitoring.internal.corp\`** | Same Wazuh Indexer historical method | No final alert | MATCH | NO MATCH | 60 queries, mean 600 seconds, jitter 0 seconds. Host identity is unconfirmed. | Figure 6 |
`.replace(/\\`/g, '`');

const small = `| Name | Value |
| :--- | ---: |
| One | 1 |
| Two | 2 |`;

const mobileProse = `## Detection hypotheses

| Detection | Testable hypothesis | Why the behaviour matters to a SOC |
| --- | --- | --- |
| **D1: Office launching PowerShell** | If Word or Excel launches PowerShell, especially with an encoded command argument, Sysmon Process Creation data should show the parent process, child process and command line. | A malicious document may launch a script interpreter after a user opens it. Legitimate Office automation can do the same, so context is needed before treating the event as malicious. |
| **D2: Repeated SSH failures** | A burst of failed SSH authentications from one source, especially across several distinct attempted usernames, may indicate automated brute force activity. | Repeated credential attempts may lead to unauthorised access. The SOC should investigate them while allowing for typing errors, old credentials and approved automation. |

## MITRE mapping

| Detection | Behaviour targeted | ATT&CK mapping | Justification |
| --- | --- | --- | --- |
| **D1: Office launching encoded PowerShell** | Office launches PowerShell with an encoded command indicator | **T1059.001: Command and Scripting Interpreter: PowerShell** | The process data directly shows PowerShell, its parent process and its command line [2]. |
| **D2: Repeated SSH authentication failures** | Repeated failures from one source across attempted usernames | **T1110: Brute Force**; **T1110.003 Password Spraying** as suspected context | The records show repeated failures and several attempted usernames. They do not show attempted passwords or prove attacker intent. T1110 is therefore the main mapping. The pattern may be consistent with password spraying, but reuse of one password or a small password set cannot be proved [3][4]. |

## Small four column table

| A | B | C | D |
| --- | --- | --- | --- |
| One | Two | Three | Four |
`;

const cases = `${small}

${reportAppendix}

## Long values

| Kind | Value |
| --- | --- |
| Hash | \`${'a3acc3e7c47b28bb'.repeat(8)}\` |
| URL | https://example.com/evidence/${'long-path-segment/'.repeat(12)}file.json |
| Path | \`C:\\Evidence\\${'historical_validation_'.repeat(8)}index.json\` |
| Case ID | \`SYN-D2-COVERAGE-01\` |

## Many columns

| A | B | C | D | E | F | G | H | I | J |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| One | Two | Three | Four | Five | Six | Seven | Eight | Nine | Ten |

## Authored columns

<table id="authored-columns" style="width:700px"><colgroup><col style="width:160px"><col style="width:540px"></colgroup><thead><tr><th>Label</th><th style="text-align:right">Description</th></tr></thead><tbody><tr><td style="color:#123456">Authored</td><td>Column widths and safe colors remain intact.</td></tr></tbody></table>

## Merged cells

<table id="spans"><thead><tr><th rowspan="2">Name</th><th colspan="3">Quarterly results</th></tr><tr><th>First</th><th>Second</th><th>Third</th></tr></thead><tbody><tr><td rowspan="2">Shared label</td><td>10</td><td>20</td><td>30</td></tr><tr><td colspan="2">Combined explanation</td><td>40</td></tr></tbody></table>

## Nested table

> | Label | Description |
> | --- | --- |
> | Evidence | A useful explanation that wraps inside a separate quotation. |
`;

module.exports = { reportAppendix, small, cases, mobileProse };
