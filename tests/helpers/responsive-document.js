const source = `# 1. Executive Summary

This report evaluates three detections using Windows process data, Linux authentication data and DNS data. Detection 1 looks for Office launching PowerShell. Detection 2 looks for repeated SSH authentication failures from the same source. Detection 3 looks for highly regular DNS queries to the same name.

Detection 1 uses a Wazuh custom rule with Sysmon Process Creation events. The rule files were saved and checked for loading errors. Microsoft Word and Excel were not available on the RONIN Windows machine, so the Office behaviour was tested against the Sysmon data supplied by the lecturer.

## 2. Detection Engineering and Validation

Readable paragraphs include a [reference link](https://example.com) and \`ordinary inline code\`.

### 2.1 Process Validation

- A list item with a useful explanation.
- Another item with **important words**.

#### 2.1.1 Evidence review

> A separate quotation keeps the current style.

##### 2.1.1.1 Supporting details

More supporting text.

###### 2.1.1.1.1 Final note

A small heading still reads clearly.

## 3. A long numbered heading that wraps naturally without hiding the end of the sentence

1. First numbered list entry with a reference.
2. Second numbered list entry with \`inline code\`.

<h2 id="authored-heading" style="font-size:25px;color:#123456">Authored heading size</h2>
<p id="authored-paragraph" style="font-size:19px;font-family:Georgia">Authored paragraph size and font.</p>

![Figure 1. Shared caption stays below the image.](/responsive-image.svg)

<img src="/responsive-image.svg" alt="Figure 2. Authored size stays effective." width="180">

| Name | Value |
| --- | --- |
| Normal | Same table rules |

\`\`\`js
const unchangedCode = true;
\`\`\`

\`\`\`mermaid
flowchart LR
  A[Start] --> B[Finish]
\`\`\`
`;

module.exports = { source };
