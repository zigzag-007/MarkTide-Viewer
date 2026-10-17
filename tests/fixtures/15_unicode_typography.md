# 15  Typography, Unicode & Special Characters

> **Test Purpose:** Test Unicode rendering, bidirectional text, special characters, and typography.  
> **What to look for:** Correct glyph rendering, no encoding artifacts (garbled text), proper text direction.

---

## 1. Typography  Smart Quotes & Punctuation

**Straight vs. Smart quotes:**

Straight double: "hello world"

Straight single: 'hello world'

Smart double (typographic): "hello world"

Smart single (typographic): 'hello world'

**Em dash vs. En dash vs. Hyphen:**

Hyphen: word word

En dash: 20242026 (range)

Em dash: He pausedthen spoke.

Triple hyphen: --- (does your editor convert this to em dash?)

**Ellipsis:**

Type three dots: ...

Unicode ellipsis character: …

---

## 2. Math & Currency Symbols

½ ⅓ ¼ ¾ ⅔ (fractions)

° ′ ″ (degree, prime, double prime)

± × ÷ ≠ ≈ ≤ ≥ ∞ √ ∑ ∏ ∫

$ € £ ¥ ¢ ₿ ₹ ₩ ₱

---

## 3. Arrows

→ ← ↑ ↓ ↔ ↕ ↗ ↘ ↙ ↖

⇒ ⇐ ⇑ ⇓ ⇔ ⟹ ⟸ ⟺

➡️ ⬅️ ⬆️ ⬇️ (emoji variants)

---

## 4. Greek Alphabet (direct Unicode)

Α Β Γ Δ Ε Ζ Η Θ Ι Κ Λ Μ

Ν Ξ Ο Π Ρ Σ Τ Υ Φ Χ Ψ Ω

α β γ δ ε ζ η θ ι κ λ μ

ν ξ ο π ρ σ τ υ φ χ ψ ω

---

## 5. Diacritics & Accented Characters

**French:** café, naïve, résumé, Nöel, garçon, crêpe, jalapeño

**Spanish:** español, corazón, mañana, año, niño, señor

**German:** Straße, Müller, über, schön, wäre, Köln, König

**Portuguese:** não, ação, coração, língua, ânimo

**Scandinavian:** Å å Ø ø Æ æ (Norwegian/Danish), Ä ä Ö ö (Swedish/Finnish)

**Czech/Slovak:** č š ž ř ě ů (Czech), ť ď ľ ĺ (Slovak)

**Polish:** ą ć ę ł ń ó ś ź ż

**Vietnamese:** Tiếng Việt, Hà Nội, thành phố, văn hóa

---

## 6. CJK Characters (East Asian)

**Japanese:**

日本語のテキストです。Markdownは普通にサポートされていますか？

平仮名: あいうえお かきくけこ さしすせそ

片仮名: アイウエオ カキクケコ サシスセソ

漢字: 日本 東京 大阪 山 川 水 火 木 金 土

**Chinese Simplified:**

这是一段中文测试文字。Markdown渲染器是否正确处理中文？

中华人民共和国  北京 上海 广州 深圳

**Chinese Traditional:**

繁體中文測試。台灣 香港 澳門 繁體字

**Korean:**

한국어 테스트입니다. Markdown은 한국어를 올바르게 렌더링합니까?

안녕하세요  서울  대한민국

---

## 7. Arabic & Hebrew (Right to Left)

**Arabic:**

مرحبا بالعالم. هذا اختبار لعرض النص العربي في Markdown.

القاهرة  الرياض  دبي  بيروت

**Hebrew:**

שלום לעולם. זהו בדיקה של עיבוד טקסט עברי ב-Markdown.

ירושלים  תל אביב  חיפה

**Mixed RTL/LTR:**

The Arabic word مرحبا means "hello" and Hebrew שלום also means "peace/hello."

---

## 8. Cyrillic (Russian)

Привет, мир! Это тест Markdown с текстом на русском языке.

Москва  Санкт-Петербург  Россия

Алфавит: А Б В Г Д Е Ё Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ы Ь Э Ю Я

---

## 9. Thai, Hindi, Other Scripts

**Thai:**

สวัสดีครับ  ทดสอบการแสดงผลภาษาไทยใน Markdown

กรุงเทพมหานคร  ประเทศไทย

**Hindi (Devanagari):**

नमस्ते दुनिया। यह Markdown में हिंदी पाठ का परीक्षण है।

भारत  नई दिल्ली  मुंबई

**Tamil:**

வணக்கம் உலகே. இது Markdown-ல் தமிழ் உரையை சோதிக்கிறது.

**Georgian:**

გამარჯობა სამყარო  ქართული ტექსტის ტესტი

**Armenian:**

Բարև աշխարհ  Հայոց այբուբեն

---

## 10. Emoji: Full Range Test

**Faces:**
😀 😁 😂 🤣 😃 😄 😅 😆 😇 😈 😉 😊 😋 😌 😍 😎 😏 😐 😑 😒 😓 😔 😕 😖 😗 😘 😙 😚 😛 😜 😝 😞 😟 😠 😡 😢 😣 😤 😥 😦 😧 😨 😩 😪 😫 😬 😭 😮 😯 😰 😱 😲 😳 😴 😵 😶 😷

**Hands:**
👋 🤚 ✋ 🖐️ 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🙏 💅 🤳

**Objects & Tech:**
💻 🖥️ 🖨️ ⌨️ 🖱️ 📱 📲 📷 📸 📹 📼 📺 📻 🎙️ 🎚️ 🎛️ 🔋 🔌 💡 🔦 🕯️ 🗑️ 📦 📫 📬 📭 📮

**Flags (may render as text fallback on some platforms):**
🇺🇸 🇬🇧 🇩🇪 🇫🇷 🇯🇵 🇨🇳 🇰🇷 🇮🇳 🇧🇷 🇦🇺 🇨🇦 🇷🇺 🇮🇹 🇪🇸 🇲🇽

---

## 11. Special Unicode Categories

**Combining characters:**

A + combining acute: Á (precomposed) vs. A + ́ (combining  may look different)

**Mathematical alphanumeric symbols (Unicode block):**

𝐀 𝐁 𝐂 (mathematical bold A B C)

𝐴 𝐵 𝐶 (mathematical italic A B C)

𝕬 𝕭 𝕮 (Fraktur A B C)

𝕒 𝕓 𝕔 (mathematical double struck small a b c)

**Enclosed alphanumerics:**

① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩

Ⓐ Ⓑ Ⓒ Ⓓ Ⓔ

**Box drawing characters (terminal art):**

```
┌─────────────────────┐
│  Box Drawing Art    │
├─────────┬───────────┤
│ Left    │ Right     │
│ Column  │ Column    │
└─────────┴───────────┘
```

**Braille:**

⠓⠑⠇⠇⠕ (Braille "HELLO")

---

## 12. Zero Width & Invisible Characters

**Zero width space (U+200B)  may break word recognition:**

This word​has​a​zero width​space​between​each​letter run. (Search for "word"  it may not find it.)

**Zero width non joiner (U+200C):**

ک‌ی (Farsi characters with ZWNJ between  prevents joining)

**Zero width joiner (U+200D):**

👩‍💻 (Woman + ZWJ + Laptop = Woman Technologist emoji sequence)

**Non breaking space (U+00A0):**

These words are joined by non breaking spaces and will not wrap here:

word1 word2 word3 word4 (NBSP between each)

**Soft hyphen (U+00AD):**

Supercali­fragilistic­expiali­docious (soft hyphens inserted  visible break points on narrow screens)

---

## 13. Number Systems

**Binary:** 0b1010 = 10

**Octal:** 0o17 = 15

**Hexadecimal:** 0xFF = 255

**Roman numerals:** I II III IV V VI VII VIII IX X L C D M

Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ Ⅵ Ⅶ Ⅷ Ⅸ Ⅹ (Unicode Roman numeral characters)

---

## 14. Encoding Edge Cases

**HTML entities in Markdown:**

Named: &amp; &lt; &gt; &quot; &apos; &nbsp; &copy; &reg; &trade;

Decimal: &#65; &#66; &#67; (A B C)

Hex: &#x41; &#x42; &#x43; (A B C)

**Literal angle brackets (should show as text, not HTML):**

\<not a tag\>

&lt;also not a tag&gt;

**Ampersands:**

AT&T (bare ampersand in text  should render fine)

&amp; (entity  renders as &)

AT&amp;T (escaped  renders as AT&T)
