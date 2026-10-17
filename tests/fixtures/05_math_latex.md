# 05  Math / LaTeX Rendering

> **Test Purpose:** Test mathematical formula rendering via KaTeX or MathJax.  
> **What to look for:** Correct rendering of inline and block math; fractions, integrals, matrices, Greek letters, operators.  
> **Note:** Requires renderer support for LaTeX (e.g., Typora, Obsidian, HackMD, VS Code with Math extension, Notion, Pandoc).

---

## 1. Inline Math

Einstein's famous equation: $E = mc^2$

The quadratic formula: $x = \dfrac{-b \pm \sqrt{b^2 - 4ac}}{2a}$

Euler's identity: $e^{i\pi} + 1 = 0$

Pythagorean theorem: $a^2 + b^2 = c^2$

The derivative of $f(x) = x^n$ is $f'(x) = nx^{n-1}$.

The integral $\int_0^1 x^2\,dx = \dfrac{1}{3}$.

---

## 2. Block (Display) Math

**The Gaussian integral:**

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

**Maxwell's equations (differential form):**

$$
\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}
$$

$$
\nabla \cdot \mathbf{B} = 0
$$

$$
\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}
$$

$$
\nabla \times \mathbf{B} = \mu_0\mathbf{J} + \mu_0\varepsilon_0\frac{\partial \mathbf{E}}{\partial t}
$$

---

## 3. Fractions & Nested Fractions

$$
\frac{1}{1+\frac{1}{1+\frac{1}{1+\cdots}}} = \frac{\sqrt{5}-1}{2} = \phi^{-1}
$$

$$
\binom{n}{k} = \frac{n!}{k!(n k)!}
$$

---

## 4. Summations & Products

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

$$
\prod_{p\text{ prime}} \frac{1}{1-p^{-s}} = \sum_{n=1}^{\infty} \frac{1}{n^s} = \zeta(s)
$$

$$
\sum_{k=0}^{n} \binom{n}{k} x^k y^{n k} = (x+y)^n
$$

---

## 5. Limits

$$
\lim_{x \to 0} \frac{\sin x}{x} = 1
$$

$$
\lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n = e
$$

$$
\lim_{h \to 0} \frac{f(x+h) - f(x)}{h} = f'(x)
$$

---

## 6. Integrals

$$
\int_a^b f(x)\,dx = F(b) - F(a)
$$

$$
\iint_D f(x,y)\,dA = \int_a^b \int_{g(x)}^{h(x)} f(x,y)\,dy\,dx
$$

$$
\oint_C \mathbf{F} \cdot d\mathbf{r} = \iint_S (\nabla \times \mathbf{F}) \cdot d\mathbf{S}
$$

---

## 7. Matrices

**2×2 Matrix:**

$$
A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}
$$

**3×3 Identity Matrix:**

$$
I_3 = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix}
$$

**Determinant:**

$$
\det(A) = \begin{vmatrix} a & b \\ c & d \end{vmatrix} = ad - bc
$$

**System of equations:**

$$
\begin{cases}
  2x + 3y - z = 7 \\
  x - y + 2z = -1 \\
  3x + y + z = 4
\end{cases}
$$

---

## 8. Aligned Equations

$$
\begin{aligned}
  (a+b)^2 &= a^2 + 2ab + b^2 \\
  (a b)^2 &= a^2 - 2ab + b^2 \\
  (a+b)(a b) &= a^2 - b^2
\end{aligned}
$$

**Step by step derivation:**

$$
\begin{aligned}
  \nabla^2 f &= \frac{\partial^2 f}{\partial x^2} + \frac{\partial^2 f}{\partial y^2} + \frac{\partial^2 f}{\partial z^2} \\
             &= \text{div}(\text{grad}\,f) \\
             &= \nabla \cdot (\nabla f)
\end{aligned}
$$

---

## 9. Greek Letters & Symbols

| Lowercase | Uppercase | Name    |
|-----------|-----------|---------|
| $\alpha$  | $A$       | Alpha   |
| $\beta$   | $B$       | Beta    |
| $\gamma$  | $\Gamma$  | Gamma   |
| $\delta$  | $\Delta$  | Delta   |
| $\epsilon$| $E$       | Epsilon |
| $\theta$  | $\Theta$  | Theta   |
| $\lambda$ | $\Lambda$ | Lambda  |
| $\mu$     | $M$       | Mu      |
| $\pi$     | $\Pi$     | Pi      |
| $\sigma$  | $\Sigma$  | Sigma   |
| $\phi$    | $\Phi$    | Phi     |
| $\psi$    | $\Psi$    | Psi     |
| $\omega$  | $\Omega$  | Omega   |

---

## 10. Operators & Relations

$$
a \leq b \geq c \neq d \approx e \equiv f \propto g \sim h
$$

$$
A \subset B \subseteq C \supset D \cap E \cup F \setminus G
$$

$$
\forall x \in \mathbb{R}: x^2 \geq 0 \qquad \exists y \in \mathbb{Z}: y < 0
$$

---

## 11. Number Sets

$$
\mathbb{N} \subset \mathbb{Z} \subset \mathbb{Q} \subset \mathbb{R} \subset \mathbb{C}
$$

---

## 12. Arrows & Logic

$$
p \Rightarrow q \qquad p \Leftrightarrow q \qquad \neg p \lor q
$$

$$
A \xrightarrow{f} B \xrightarrow{g} C
$$

---

## 13. Probability & Statistics

$$
P(A \mid B) = \frac{P(B \mid A)\,P(A)}{P(B)}
$$

$$
\mathbb{E}[X] = \int_{-\infty}^{\infty} x\,f_X(x)\,dx
$$

$$
\text{Var}(X) = \mathbb{E}[X^2] - (\mathbb{E}[X])^2 = \sigma^2
$$

$$
\mathcal{N}(\mu, \sigma^2): \quad f(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{(x-\mu)^2}{2\sigma^2}}
$$

---

## 14. Calculus  Fourier Transform

$$
\hat{f}(\xi) = \int_{-\infty}^{\infty} f(x)\,e^{-2\pi i x \xi}\,dx
$$

$$
f(x) = \int_{-\infty}^{\infty} \hat{f}(\xi)\,e^{2\pi i x \xi}\,d\xi
$$

---

## 15. Edge Cases  Dollar Signs & Text

**Potential ambiguity  dollar sign in text:**

The price is $10 and the tax is $1.50, so total is $11.50.

If the renderer is too aggressive, the above may be partially rendered as math!

**Escaped dollar sign (should show literal $):**

This costs \$50.

**Inline math next to text:**

The value of $x$ is 5 and $y = x + 3 = 8$.

**Math immediately after punctuation:**

The formula,$E=mc^2$, is famous.

---

## 16. Complex Expression

$$
\frac{d}{dt}\left[\oint_{\partial \Sigma(t)} \mathbf{B}(\mathbf{r},t) \cdot d\mathbf{l}\right] = -\frac{d\Phi_B}{dt} = \oint_{\partial \Sigma} \mathbf{E} \cdot d\mathbf{l}
$$

---

## 17. Chemical Equations (non standard, some renderers)

$$
\text{C}_6\text{H}_{12}\text{O}_6 + 6\text{O}_2 \rightarrow 6\text{CO}_2 + 6\text{H}_2\text{O} + \text{Energy}
$$

$$
\Delta G = \Delta H - T\Delta S
$$
