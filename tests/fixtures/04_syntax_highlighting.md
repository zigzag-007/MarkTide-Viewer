# 04  Syntax Highlighting in Code Blocks

> **Test Purpose:** Test syntax highlighting for fenced code blocks across many languages, and verify edge cases.  
> **What to look for:** Correct colorization of keywords, strings, comments, numbers; inline vs block rendering; no leakage of code outside the block.

---

## 1. Python

```python
#!/usr/bin/env python3
"""Module docstring: demonstrates Python syntax highlighting."""

import os
import sys
from typing import List, Optional, Dict
from dataclasses import dataclass

# Constants
MAX_RETRIES: int = 3
BASE_URL: str = "https://api.example.com"


@dataclass
class User:
    """Data class representing a user."""
    id: int
    name: str
    email: str
    is_active: bool = True


def fetch_users(limit: int = 10, offset: int = 0) -> List[User]:
    """Fetch users from API with pagination."""
    users = []
    for i in range(limit):
        user = User(
            id=offset + i,
            name=f"User {offset + i}",
            email=f"user{offset + i}@example.com",
        )
        users.append(user)
    return users


class UserRepository:
    """Repository pattern for user data access."""

    def __init__(self, db_url: str) -> None:
        self._db_url = db_url
        self._cache: Dict[int, User] = {}

    def get_by_id(self, user_id: int) -> Optional[User]:
        if user_id in self._cache:
            return self._cache[user_id]
        # Simulate DB lookup
        return None

    async def save(self, user: User) -> bool:
        try:
            self._cache[user.id] = user
            return True
        except Exception as e:
            print(f"Error saving user: {e}", file=sys.stderr)
            return False


if __name__ == "__main__":
    repo = UserRepository(db_url=os.getenv("DATABASE_URL", "sqlite:///dev.db"))
    print(fetch_users(limit=5))
```

---

## 2. JavaScript / TypeScript

```typescript
// TypeScript with generics, decorators, async/await
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: string;
}

type UserRole = 'admin' | 'user' | 'guest';

interface User {
  readonly id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  private readonly users: Map<string, User> = new Map();

  async findById(id: string): Promise<ApiResponse<User | null>> {
    const user = this.users.get(id) ?? null;
    return {
      data: user,
      status: user ? HttpStatus.OK : HttpStatus.NOT_FOUND,
      message: user ? 'User found' : 'User not found',
      timestamp: new Date().toISOString(),
    };
  }

  async createUser(payload: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const id = crypto.randomUUID();
    const newUser: User = {
      ...payload,
      id,
      createdAt: new Date(),
    };

    if (this.users.has(id)) {
      throw new HttpException('Conflict', HttpStatus.CONFLICT);
    }

    this.users.set(id, newUser);
    return newUser;
  }

  // Arrow function with ternary
  isAdmin = (user: User): boolean =>
    user.role === 'admin';
}

// Generic function
function identity<T>(arg: T): T {
  return arg;
}

// Template literal
const greeting = (name: string) => `Hello, ${name}! Welcome to TypeScript.`;
console.log(greeting('World'));
```

---

## 3. JavaScript (vanilla)

```javascript
'use strict';

// Classes, destructuring, spread, async
class EventEmitter {
  #listeners = new Map();

  on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, []);
    }
    this.#listeners.get(event).push(callback);
    return this; // chainable
  }

  emit(event, ...args) {
    const handlers = this.#listeners.get(event) ?? [];
    handlers.forEach(handler => handler(...args));
  }

  off(event, callback) {
    const handlers = this.#listeners.get(event) ?? [];
    this.#listeners.set(
      event,
      handlers.filter(h => h !== callback)
    );
  }
}

// Async IIFE with error handling
(async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }
  const { id, title, completed } = await response.json();
  console.log({ id, title, completed });
})().catch(console.error);

// Regex, symbols, generators
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}
```

---

## 4. Rust

```rust
use std::collections::HashMap;
use std::fmt;

/// A generic stack data structure.
#[derive(Debug, Clone)]
pub struct Stack<T> {
    elements: Vec<T>,
}

impl<T> Stack<T> {
    pub fn new() -> Self {
        Stack { elements: Vec::new() }
    }

    pub fn push(&mut self, item: T) {
        self.elements.push(item);
    }

    pub fn pop(&mut self) -> Option<T> {
        self.elements.pop()
    }

    pub fn peek(&self) -> Option<&T> {
        self.elements.last()
    }

    pub fn is_empty(&self) -> bool {
        self.elements.is_empty()
    }

    pub fn len(&self) -> usize {
        self.elements.len()
    }
}

impl<T: fmt::Display> fmt::Display for Stack<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Stack[")?;
        for (i, item) in self.elements.iter().enumerate() {
            if i > 0 { write!(f, ", ")?; }
            write!(f, "{}", item)?;
        }
        write!(f, "]")
    }
}

fn main() {
    let mut stack: Stack<i32> = Stack::new();
    for i in 1..=5 {
        stack.push(i * 10);
    }
    println!("{}", stack);

    while let Some(val) = stack.pop() {
        println!("Popped: {}", val);
    }

    // Pattern matching
    let config: HashMap<&str, &str> = [
        ("host", "localhost"),
        ("port", "8080"),
    ]
    .into_iter()
    .collect();

    match config.get("port") {
        Some(&"8080") => println!("Using default port"),
        Some(p) => println!("Custom port: {}", p),
        None => eprintln!("No port configured"),
    }
}
```

---

## 5. Go

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// User represents a user entity
type User struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

// UserHandler handles HTTP requests for users
type UserHandler struct {
	users map[int]User
}

func NewUserHandler() *UserHandler {
	return &UserHandler{users: make(map[int]User)}
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	select {
	case <-ctx.Done():
		http.Error(w, "Request timeout", http.StatusGatewayTimeout)
		return
	default:
	}

	user, ok := h.users[1]
	if !ok {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(user); err != nil {
		log.Printf("encode error: %v", err)
	}
}

func main() {
	handler := NewUserHandler()
	mux := http.NewServeMux()
	mux.HandleFunc("/users/", handler.GetUser)

	srv := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	fmt.Println("Server starting on :8080")
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
```

---

## 6. SQL

```sql
-- Complex SQL query with CTEs, window functions, JOINs
WITH monthly_revenue AS (
    SELECT
        DATE_TRUNC('month', o.created_at)::DATE AS month,
        p.category,
        SUM(li.quantity * li.unit_price)         AS revenue,
        COUNT(DISTINCT o.customer_id)             AS unique_customers,
        COUNT(o.order_id)                         AS total_orders
    FROM orders o
    INNER JOIN line_items li ON o.order_id = li.order_id
    INNER JOIN products p    ON li.product_id = p.product_id
    WHERE o.status = 'completed'
      AND o.created_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY 1, 2
),
ranked_categories AS (
    SELECT
        month,
        category,
        revenue,
        unique_customers,
        total_orders,
        RANK() OVER (PARTITION BY month ORDER BY revenue DESC) AS rank,
        LAG(revenue) OVER (PARTITION BY category ORDER BY month) AS prev_month_revenue,
        revenue - LAG(revenue) OVER (PARTITION BY category ORDER BY month) AS mom_change
    FROM monthly_revenue
)
SELECT
    month,
    category,
    revenue,
    unique_customers,
    total_orders,
    rank,
    ROUND(
        ((revenue - prev_month_revenue) / NULLIF(prev_month_revenue, 0)) * 100,
        2
    ) AS mom_growth_pct
FROM ranked_categories
WHERE rank <= 5
ORDER BY month DESC, rank ASC;

-- DDL
CREATE TABLE IF NOT EXISTS audit_log (
    log_id    BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(128) NOT NULL,
    action    VARCHAR(16) CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data  JSONB,
    new_data  JSONB,
    changed_by VARCHAR(64) REFERENCES users(username),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_table_action ON audit_log(table_name, action);
```

---

## 7. Bash / Shell Script

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Default values
ENVIRONMENT="${1:-development}"
DOCKER_TAG="${2:-latest}"
REGISTRY="registry.example.com"

usage() {
    cat <<-EOF
    Usage: $(basename "$0") [ENVIRONMENT] [TAG]
    
    Arguments:
        ENVIRONMENT  Target environment: development|staging|production (default: development)
        TAG          Docker image tag (default: latest)
    
    Examples:
        $(basename "$0") production v1.2.3
        $(basename "$0") staging
EOF
    exit 1
}

deploy() {
    local env="$1"
    local tag="$2"
    local image="${REGISTRY}/myapp:${tag}"

    log_info "Deploying ${image} to ${env}..."

    # Check prerequisites
    command -v docker &>/dev/null || { log_error "Docker not found"; exit 1; }
    command -v kubectl &>/dev/null || { log_error "kubectl not found"; exit 1; }

    # Pull and deploy
    docker pull "$image"
    kubectl set image deployment/myapp "myapp=${image}" --namespace="${env}"
    kubectl rollout status deployment/myapp --namespace="${env}" --timeout=300s

    log_info "Deployment complete!"
}

# Argument validation
[[ "$ENVIRONMENT" =~ ^(development|staging|production)$ ]] || {
    log_error "Invalid environment: ${ENVIRONMENT}"
    usage
}

deploy "$ENVIRONMENT" "$DOCKER_TAG"
```

---

## 8. JSON

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "User Management API",
    "version": "2.0.0",
    "description": "RESTful API for managing users",
    "contact": {
      "name": "API Support",
      "email": "api@example.com"
    }
  },
  "servers": [
    { "url": "https://api.example.com/v2", "description": "Production" },
    { "url": "https://staging-api.example.com/v2", "description": "Staging" }
  ],
  "paths": {
    "/users/{id}": {
      "get": {
        "summary": "Get user by ID",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "integer", "minimum": 1 }
          }
        ],
        "responses": {
          "200": {
            "description": "User found",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/User" }
              }
            }
          },
          "404": { "description": "User not found" }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "required": ["id", "name", "email"],
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string", "maxLength": 100 },
          "email": { "type": "string", "format": "email" },
          "role": {
            "type": "string",
            "enum": ["admin", "user", "guest"],
            "default": "user"
          },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

---

## 9. YAML

```yaml
# Kubernetes Deployment manifest
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
  labels:
    app: myapp
    version: "1.2.3"
    managed-by: helm
  annotations:
    deployment.kubernetes.io/revision: "5"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: registry.example.com/myapp:1.2.3
          ports:
            - containerPort: 8080
              name: http
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
            - name: LOG_LEVEL
              value: "info"
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: myapp
                topologyKey: kubernetes.io/hostname
```

---

## 10. CSS

```css
/* Modern CSS with custom properties, grid, animations */
:root {
  --color-primary:   hsl(220, 90%, 56%);
  --color-secondary: hsl(280, 70%, 60%);
  --color-surface:   hsl(220, 15%, 10%);
  --color-text:      hsl(220, 10%, 90%);
  --radius-lg:       1rem;
  --shadow-lg:       0 20px 60px rgba(0, 0, 0, 0.4);
  --transition:      all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  transition: var(--transition);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      transparent 40%,
      rgba(255, 255, 255, 0.05)
    );
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-4px) scale(1.01);
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
  }

  &:focus-within {
    outline: 2px solid var(--color-primary);
    outline-offset: 4px;
  }
}

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    hsl(220, 15%, 15%) 25%,
    hsl(220, 15%, 25%) 50%,
    hsl(220, 15%, 15%) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 11. HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Example Page</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header role="banner">
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/" aria-current="page">Home</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <main id="main-content">
    <section aria-labelledby="hero-heading">
      <h1 id="hero-heading">Welcome</h1>
      <p>This is a <strong>semantic HTML5</strong> example.</p>
      
      <figure>
        <img src="hero.webp" alt="A beautiful landscape" loading="lazy" />
        <figcaption>Fig 1. Hero image</figcaption>
      </figure>
    </section>

    <article>
      <h2>Article Title</h2>
      <time datetime="2024-01-15">January 15, 2024</time>
      <p>Article content goes here...</p>
    </article>
  </main>

  <footer role="contentinfo">
    <p>&copy; 2024 Example Corp. All rights reserved.</p>
  </footer>

  <script type="module" src="app.js"></script>
</body>
</html>
```

---

## 12. Diff Output

```diff
--- a/src/server.js
+++ b/src/server.js
@@ -1,12 +1,18 @@
-const express = require('express');
+import express from 'express';
+import { createServer } from 'http';
+import { Server as SocketIO } from 'socket.io';
 
 const app = express();
-const PORT = 3000;
+const server = createServer(app);
+const io = new SocketIO(server, { cors: { origin: '*' } });
+const PORT = process.env.PORT ?? 3000;
 
-app.listen(PORT, () => {
-  console.log(`Server on port ${PORT}`);
-});
+app.use(express.json());
+app.use(express.urlencoded({ extended: true }));
+
+io.on('connection', (socket) => {
+  console.log(`Client connected: ${socket.id}`);
+  socket.on('disconnect', () => console.log(`Client disconnected: ${socket.id}`));
+});
+
+server.listen(PORT, () => console.log(`Server on port ${PORT}`));
```

---

## 13. Dockerfile

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "dist/server.js"]
```

---

## 14. Markdown in Code Block (meta test)

The following should appear as raw plaintext, NOT rendered:

```markdown
# This heading should NOT render
**This bold should NOT render**
- This list should NOT render
> This blockquote should NOT render
```

---

## 15. No Language Tag (plain / unknown)

```
This block has no language tag.
It should render as monospace plaintext.
No syntax highlighting expected.
Special chars: <div> & "quotes" 'single' \backslash
```

---

## 16. Unknown/Unsupported Language

```brainfuck
++++++++++[>+++++++>++++++++++>+++>+<<<<-]
>++.>+.+++++++..+++.>++.<<+++++++++++++++.
>.+++.------.--------.>+.>.
```

```lolcode
HAI 1.2
  CAN HAS STDIO?
  VISIBLE "Hello, World!"
KTHXBYE
```

---

## 17. Inline Code Edge Cases

Backtick inside inline code: `` ` ``

Double backtick fence with interior space: `` `code` ``

Code with HTML inside: `<div class="test">`  should show literal tags.

Code spanning chars: `const x = 1 + 2; // comment`

Very long inline code: `this_is_a_very_long_identifier_that_might_cause_horizontal_overflow_in_some_narrow_renderers`

---

## 18. Windows Batch / CMD

> **Language tags to try:** `batch`, `bat`, `dosbatch`, `winbatch`  
> **Note:** Support is inconsistent  some renderers use `batch`, others `dosbatch`. Try both if one shows no highlighting.

```batch
@ECHO OFF
SETLOCAL ENABLEDELAYEDEXPANSION

:: ============================================================
:: deploy.bat — Windows Batch deployment script
:: Usage: deploy.bat [environment] [version]
:: ============================================================

SET "ENVIRONMENT=%~1"
SET "VERSION=%~2"
SET "REGISTRY=registry.example.com"
SET "APP_NAME=myapp"

:: Default values if args missing
IF "%ENVIRONMENT%"=="" SET "ENVIRONMENT=development"
IF "%VERSION%"==""     SET "VERSION=latest"

ECHO [INFO] Deploying %APP_NAME%:%VERSION% to %ENVIRONMENT%...

:: Validate environment argument
IF /I "%ENVIRONMENT%"=="production"   GOTO :valid_env
IF /I "%ENVIRONMENT%"=="staging"      GOTO :valid_env
IF /I "%ENVIRONMENT%"=="development"  GOTO :valid_env
ECHO [ERROR] Invalid environment: %ENVIRONMENT%
ECHO Valid values: production, staging, development
EXIT /B 1

:valid_env

:: Check Docker is available
WHERE docker >NUL 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERROR] Docker not found. Please install Docker Desktop.
    EXIT /B 1
)

:: Pull image
SET "IMAGE=%REGISTRY%/%APP_NAME%:%VERSION%"
ECHO [INFO] Pulling image: %IMAGE%
docker pull %IMAGE%
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERROR] Failed to pull image %IMAGE%
    EXIT /B 1
)

:: Stop and remove existing container
docker stop %APP_NAME% >NUL 2>&1
docker rm   %APP_NAME% >NUL 2>&1

:: Run new container
docker run -d ^
    --name %APP_NAME% ^
    --restart unless-stopped ^
    -p 8080:8080 ^
    -e NODE_ENV=%ENVIRONMENT% ^
    %IMAGE%

IF %ERRORLEVEL% EQU 0 (
    ECHO [SUCCESS] Container started successfully on port 8080.
) ELSE (
    ECHO [ERROR] Failed to start container.
    EXIT /B 1
)

:: Loop example — wait for health check
SET /A "RETRY=0"
:health_loop
IF !RETRY! GEQ 10 (
    ECHO [ERROR] Health check timed out after 10 attempts.
    EXIT /B 1
)
curl -sf http://localhost:8080/health >NUL 2>&1
IF %ERRORLEVEL% EQU 0 (
    ECHO [INFO] Health check passed.
    GOTO :done
)
SET /A "RETRY+=1"
ECHO [INFO] Waiting for app... attempt !RETRY!
TIMEOUT /T 3 /NOBREAK >NUL
GOTO :health_loop

:done
ECHO [INFO] Deployment complete!
ENDLOCAL
EXIT /B 0
```

**Alternative tag test  same code, different language identifier:**

```bat
@ECHO OFF
:: Simple variable and IF example
SET NAME=World
IF "%NAME%"=="World" (
    ECHO Hello, %NAME%!
) ELSE (
    ECHO Goodbye, %NAME%!
)

:: FOR loop over files
FOR %%F IN (*.txt) DO (
    ECHO Processing: %%F
)

:: String operations
SET "FULL_PATH=C:\Users\Zig Zag\Desktop\Test\file.txt"
ECHO Full path : %FULL_PATH%
ECHO Filename  : %~nxFULL_PATH%
ECHO Drive     : %~dFULL_PATH%
ECHO Directory : %~pFULL_PATH%
```

---

## 19. PowerShell

> **Language tags to try:** `powershell`, `ps1`, `posh`  
> **Note:** `powershell` is the most widely supported tag. Some renderers also accept `ps` or `ps1`.

```powershell
#Requires -Version 7.0
<#
.SYNOPSIS
    Deploy application to target environment.
.DESCRIPTION
    Pulls Docker image and runs container with health check.
.PARAMETER Environment
    Target environment: Development, Staging, or Production.
.PARAMETER Version
    Docker image tag (default: latest).
.EXAMPLE
    .\Deploy.ps1 -Environment Production -Version "v1.2.3"
#>

[CmdletBinding(SupportsShouldProcess)]
param (
    [Parameter(Mandatory)]
    [ValidateSet('Development', 'Staging', 'Production')]
    [string] $Environment,

    [string] $Version = 'latest',

    [string] $Registry = 'registry.example.com',

    [switch] $Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ─── Constants ────────────────────────────────────────────────
$APP_NAME  = 'myapp'
$IMAGE     = "$Registry/$APP_NAME`:$Version"
$PORT      = 8080
$LOG_FILE  = "$PSScriptRoot\deploy_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# ─── Helper Functions ──────────────────────────────────────────
function Write-Log {
    param(
        [ValidateSet('INFO','WARN','ERROR','SUCCESS')]
        [string] $Level = 'INFO',
        [string] $Message
    )
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $entry     = "[$timestamp] [$Level] $Message"
    $color     = @{ INFO='Cyan'; WARN='Yellow'; ERROR='Red'; SUCCESS='Green' }[$Level]
    Write-Host $entry -ForegroundColor $color
    Add-Content -Path $LOG_FILE -Value $entry
}

function Test-DockerRunning {
    try {
        docker info *>$null
        return $true
    } catch {
        return $false
    }
}

function Wait-HealthCheck {
    param([int] $MaxRetries = 10, [int] $DelaySeconds = 3)
    $url = "http://localhost:$PORT/health"
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            $response = Invoke-RestMethod -Uri $url -TimeoutSec 5
            if ($response.status -eq 'ok') {
                Write-Log SUCCESS "Health check passed on attempt $i."
                return $true
            }
        } catch {
            Write-Log WARN "Health check attempt $i/$MaxRetries failed. Retrying in ${DelaySeconds}s..."
            Start-Sleep -Seconds $DelaySeconds
        }
    }
    return $false
}

# ─── Pre-flight Checks ─────────────────────────────────────────
Write-Log INFO "Starting deployment: $IMAGE → $Environment"

if (-not (Test-DockerRunning)) {
    Write-Log ERROR 'Docker is not running. Please start Docker Desktop.'
    exit 1
}

# ─── Confirm Production Deploy ─────────────────────────────────
if ($Environment -eq 'Production' -and -not $Force) {
    $confirm = Read-Host "Deploy to PRODUCTION? Type 'yes' to confirm"
    if ($confirm -ne 'yes') {
        Write-Log WARN 'Deployment cancelled by user.'
        exit 0
    }
}

# ─── Pull Image ────────────────────────────────────────────────
if ($PSCmdlet.ShouldProcess($IMAGE, 'docker pull')) {
    Write-Log INFO "Pulling $IMAGE..."
    docker pull $IMAGE
    if ($LASTEXITCODE -ne 0) {
        Write-Log ERROR "Failed to pull image: $IMAGE"
        exit 1
    }
}

# ─── Stop Existing Container ───────────────────────────────────
$existing = docker ps -aq --filter "name=^/$APP_NAME$"
if ($existing) {
    Write-Log INFO "Stopping existing container: $APP_NAME"
    docker stop $APP_NAME | Out-Null
    docker rm   $APP_NAME | Out-Null
}

# ─── Run New Container ─────────────────────────────────────────
$runArgs = @(
    'run', '-d',
    '--name', $APP_NAME,
    '--restart', 'unless-stopped',
    '-p', "${PORT}:${PORT}",
    '-e', "NODE_ENV=$($Environment.ToLower())",
    '-e', "APP_VERSION=$Version",
    $IMAGE
)

docker @runArgs
if ($LASTEXITCODE -ne 0) {
    Write-Log ERROR "Failed to start container."
    exit 1
}

# ─── Health Check ──────────────────────────────────────────────
if (-not (Wait-HealthCheck)) {
    Write-Log ERROR 'App did not become healthy. Rolling back...'
    docker stop $APP_NAME | Out-Null
    docker rm   $APP_NAME | Out-Null
    exit 1
}

Write-Log SUCCESS "Deployment complete! $APP_NAME v$Version running on port $PORT."
Write-Log INFO   "Log saved to: $LOG_FILE"
```

**PowerShell  additional syntax coverage:**

```powershell
# Pipeline, Where-Object, ForEach-Object, Select-Object
Get-Process |
    Where-Object { $_.CPU -gt 1.0 } |
    Sort-Object CPU -Descending |
    Select-Object -First 10 Name, Id, CPU, WorkingSet |
    Format-Table -AutoSize

# Hash tables
$config = @{
    Host     = 'localhost'
    Port     = 5432
    Database = 'mydb'
    Options  = @{
        Timeout    = 30
        PoolSize   = 10
        SSLMode    = 'require'
    }
}

# String interpolation & here-string
$name = "PowerShell"
$version = $PSVersionTable.PSVersion
Write-Host "Running $name v$version"

$heredoc = @"
This is a here-string.
It can span multiple lines.
Variables like $name are expanded.
"@

# Try/Catch/Finally
try {
    $data = Get-Content 'nonexistent.json' -Raw | ConvertFrom-Json
} catch [System.IO.FileNotFoundException] {
    Write-Warning "File not found: $_"
} catch {
    Write-Error "Unexpected error: $_"
} finally {
    Write-Verbose "Cleanup complete."
}

# Regex
$logLine = '2024-01-15 10:30:45 ERROR [auth] Login failed for user@example.com'
if ($logLine -match '(?<date>\d{4}-\d{2}-\d{2}) (?<level>\w+) \[(?<module>\w+)\] (?<msg>.+)') {
    [PSCustomObject]@{
        Date    = $Matches['date']
        Level   = $Matches['level']
        Module  = $Matches['module']
        Message = $Matches['msg']
    }
}

# Classes (PowerShell 5+)
class Animal {
    [string] $Name
    [int]    $Age

    Animal([string]$name, [int]$age) {
        $this.Name = $name
        $this.Age  = $age
    }

    [string] Speak() {
        return "$($this.Name) says: ..."
    }
}

class Dog : Animal {
    [string] $Breed

    Dog([string]$name, [int]$age, [string]$breed) : base($name, $age) {
        $this.Breed = $breed
    }

    [string] Speak() {
        return "$($this.Name) says: Woof!"
    }
}

$dog = [Dog]::new('Rex', 3, 'Labrador')
Write-Host $dog.Speak()
```

---

## 20. Pseudocode

> **Language tags to try:** `pseudocode`, `pseudo`, `text`, `plaintext`, `algorithm`  
> **Note:** There is NO standard syntax highlighting for pseudocode  most renderers treat it as plain monospace text. The tag is mainly for semantic clarity. Some renderers (e.g. with custom themes) may colorize keywords.

```pseudocode
ALGORITHM BinarySearch(array A, integer target) → integer
    INPUT:  Sorted array A of n integers, target value
    OUTPUT: Index of target in A, or -1 if not found

    left  ← 0
    right ← length(A) - 1

    WHILE left ≤ right DO
        mid ← ⌊(left + right) / 2⌋

        IF A[mid] = target THEN
            RETURN mid
        ELSE IF A[mid] < target THEN
            left ← mid + 1
        ELSE
            right ← mid - 1
        END IF
    END WHILE

    RETURN -1
END ALGORITHM
```

```pseudocode
ALGORITHM MergeSort(array A) → array
    INPUT:  Unsorted array A
    OUTPUT: Sorted array

    IF length(A) ≤ 1 THEN
        RETURN A
    END IF

    mid   ← ⌊length(A) / 2⌋
    left  ← MergeSort(A[0 .. mid - 1])
    right ← MergeSort(A[mid .. end])

    RETURN Merge(left, right)
END ALGORITHM

PROCEDURE Merge(array L, array R) → array
    result ← empty array
    i ← 0,  j ← 0

    WHILE i < length(L) AND j < length(R) DO
        IF L[i] ≤ R[j] THEN
            APPEND L[i] TO result
            i ← i + 1
        ELSE
            APPEND R[j] TO result
            j ← j + 1
        END IF
    END WHILE

    APPEND remaining elements of L[i..] TO result
    APPEND remaining elements of R[j..] TO result
    RETURN result
END PROCEDURE
```

```pseudocode
ALGORITHM Dijkstra(Graph G, vertex source) → distances[]
    INPUT:  Weighted directed graph G, source vertex
    OUTPUT: Shortest distance from source to every vertex

    FOR EACH vertex v IN G DO
        dist[v] ← ∞
        visited[v] ← FALSE
    END FOR
    dist[source] ← 0

    priority_queue Q ← {(0, source)}

    WHILE Q is not empty DO
        (d, u) ← EXTRACT-MIN(Q)

        IF visited[u] THEN CONTINUE
        visited[u] ← TRUE

        FOR EACH neighbor v OF u WITH edge weight w DO
            IF dist[u] + w < dist[v] THEN
                dist[v] ← dist[u] + w
                INSERT (dist[v], v) INTO Q
            END IF
        END FOR
    END WHILE

    RETURN dist
END ALGORITHM
```

```pseudocode
// Authentication Flow Pseudocode
PROCEDURE Login(string username, string password) → Result

    // Input validation
    IF username = "" OR password = "" THEN
        RETURN Error("Username and password are required")
    END IF

    // Fetch user from database
    user ← Database.FindUser(WHERE email = username)
    IF user = NULL THEN
        RETURN Error("Invalid credentials")   // Don't reveal which field failed
    END IF

    // Check account lock
    IF user.failedAttempts ≥ MAX_ATTEMPTS THEN
        IF CurrentTime() < user.lockExpiry THEN
            RETURN Error("Account locked. Try again later.")
        ELSE
            user.failedAttempts ← 0           // Reset after lock expires
        END IF
    END IF

    // Verify password (constant-time comparison to prevent timing attacks)
    IF NOT ConstantTimeCompare(Hash(password, user.salt), user.passwordHash) THEN
        user.failedAttempts ← user.failedAttempts + 1
        Database.Save(user)
        RETURN Error("Invalid credentials")
    END IF

    // Successful login
    user.failedAttempts ← 0
    session ← CreateSession(userId = user.id, expiresIn = SESSION_TTL)
    AuditLog.Record("LOGIN_SUCCESS", user.id, CurrentTime(), ClientIP())

    RETURN Success(token = session.token)

END PROCEDURE
```

---

## 21. Language Tag Aliases Reference

> The following table shows which language tags are typically recognized for each language. Try both if one fails.

| Language       | Primary Tag    | Aliases Accepted by Renderers     |
|----------------|----------------|-----------------------------------|
| Windows Batch  | `batch`        | `bat`, `dosbatch`, `winbatch`     |
| PowerShell     | `powershell`   | `ps1`, `posh`, `ps`               |
| Pseudocode     | `pseudocode`   | `pseudo`, `plaintext`, `text`     |
| Bash/Shell     | `bash`         | `sh`, `shell`, `zsh`              |
| Python         | `python`       | `py`, `python3`                   |
| JavaScript     | `javascript`   | `js`, `jsx`                       |
| TypeScript     | `typescript`   | `ts`, `tsx`                       |
| SQL            | `sql`          | `mysql`, `postgresql`, `sqlite`   |
| YAML           | `yaml`         | `yml`                             |
| Dockerfile     | `dockerfile`   | `docker`                          |
| Diff           | `diff`         | `patch`                           |
| Markdown       | `markdown`     | `md`                              |
| JSON           | `json`         | `jsonc` (JSON with comments)      |
| C              | `c`            | none standard                     |
| C++            | `cpp`          | `c++`, `cxx`                      |
| C#             | `csharp`       | `cs`, `c#`                        |
| Ruby           | `ruby`         | `rb`                              |
| PHP            | `php`          | none standard                     |
| Swift          | `swift`        | none standard                     |
| Kotlin         | `kotlin`       | `kt`                              |
| Java           | `java`         | none standard                     |
| Brainfuck      | `brainfuck`    | `bf`                              |
