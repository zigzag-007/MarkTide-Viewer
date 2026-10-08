module.exports = `# 4. Telemetry and Field Selection

| Detection | Source telemetry | Matching fields | Context and limitations |
| --- | --- | --- | --- |
| **D1** | Sysmon Event ID 1 | CSV: \`EventID\`, \`Image\`, \`ParentImage\`, \`CommandLine\`. Wazuh: \`sysmon_event1\`, \`win.eventdata.image\`, \`win.eventdata.parentImage\`, \`win.eventdata.commandLine\` | \`UtcTime\` and \`Hostname\` provide context. Wazuh Discover shows indexed fields in the \`data.win...\` form. The custom rule uses decoded \`win...\` fields. |
| **D2** | Linux authentication CSV | \`timestamp\`, \`src_ip\`, \`user\`, \`result\` | \`host\` is context and is not part of the grouping rule. The same source IP is grouped across target hosts. Timestamps have minute precision. Attempted passwords are not available. |
| **D3** | DNS CSV | \`ts\`, \`src_ip\`, \`query\` | Records are grouped by exact source IP and exact query across the full CSV. This historical calculation is not an online streaming detection. |`;
