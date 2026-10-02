const image = process.env.MARKTIDE_CAPTION_REVIEW_IMAGE || '/caption-test-image.svg';
const caption = 'Figure 1. Sysmon Event ID 1 received in Wazuh Discover.';
const quotation = 'Figure 1 shows that Sysmon Event ID 1 reached Wazuh Discover. The screenshot shows **66 hits** and columns for time, agent name, channel, event ID and agent IP. It confirms that the telemetry reached Wazuh. It does not show a match from the custom Office rule.';

const review = `![${caption}](${image})\n\n> ${quotation}\n\n<img src="${image}" alt="Figure 2. Authored HTML evidence." width="500">`;

const source = `${review}

<img src="${image}" alt="Safe inline sized evidence." style="width:420px">

<img src="${image}" alt="Fixed authored dimensions." width="240" height="120">

<img src="/caption-small-image.svg" alt="Small natural evidence.">

![](${image})

<img src="${image}" alt="">

![image](${image})

<img src="${image}" alt="Screenshot">

<img src="${image}">

Inline ![Inline evidence](${image}) stays in this sentence.

Inline HTML <img src="${image}" alt="Inline HTML evidence" width="24"> stays in this sentence.

![Descriptive badge](https://img.shields.io/caption-test.svg)

![Figure 3. Existing Markdown caption.](${image})

*Figure 3. Existing Markdown caption.*

<figure id="authored-figure"><img src="${image}" alt="Alternative accessible text" width="100"><figcaption>Author written caption</figcaption></figure>

![Figure 4. Visible heading already labels the evidence.](${image})

### Figure 4. Existing authored heading

<p><img src="${image}" alt="Inline authored caption" width="100"><br><em>Inline authored caption</em></p>

<img src="${image}" alt="Figure 5. Existing labelled caption." width="100">
<p class="image-caption">Custom visible caption</p>

*Figure 7. Caption written above the image.*

![Figure 7. Caption written above the image.](${image})

<p id="styled-image" style="font-size:18px;margin-bottom:20px"><img src="${image}" alt="Styled image paragraph." width="100"></p>

<div id="authored-image-wrapper" style="text-align:center;margin-top:20px"><img src="${image}" alt="Figure 10. Image in an authored wrapper." width="160"></div>

<div style="display:none"><img src="${image}" alt="Hidden wrapper evidence" width="100"></div>

<img src="${image}" alt="&lt;script&gt;window.__captionUnsafe = true&lt;/script&gt;" onerror="window.__captionUnsafe = true" width="100">

<img src="${image}" alt="Hidden evidence" style="display:none" width="100">

<img src="${image}" alt="Figure 6. Caption before a separate quotation." width="100">

> Figure 6. Caption before a separate quotation.

![Figure 8. Caption before separate prose.](${image})

Figure 8 shows why this separate explanation is not a caption.

<img src="${image}" alt=" PHOTO " width="100">

![Diagram 2](${image})

![Picture](${image})
`;

module.exports = { caption, image, quotation, review, source };
