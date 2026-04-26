# Nepal IT Company — .NET Interview Questions & Ideal Answers
### Tailored for Suraj Goud | Senior .NET Engineer | 7+ Years Fintech/Remittance

> Sources: Glassdoor (Verisk Nepal, Cedar Gate Kathmandu, Infinite CS), GeeksforGeeks interview reports, general Nepal IT hiring patterns.  
> Companies covered: **Verisk**, **Cedar Gate Technologies**, **Infinite Computer Solutions**, **General Nepal IT**

---

## Table of Contents

1. [C# / .NET Core](#1-c--net-core)
2. [System Design](#2-system-design)
3. [Database](#3-database)
4. [OOP & Design Patterns](#4-oop--design-patterns)
5. [Microservices](#5-microservices)
6. [Behavioral / HR](#6-behavioral--hr)
7. [React / Frontend](#7-react--frontend)
8. [GraphQL](#8-graphql)

---

## 1. C# / .NET Core

---

### Q1 — Verisk | Hard
**Explain how the ASP.NET Core middleware pipeline works. How would you write a custom middleware that logs request duration and returns a 503 if the service is degraded?**

**Ideal Answer:**

The pipeline is a chain of delegates. Each middleware calls `next()` to pass control down the chain. For custom middleware:

- Implement `InvokeAsync(HttpContext context, RequestDelegate next)`
- Measure elapsed time using `Stopwatch` around `await next(context)`
- Short-circuit by setting `context.Response.StatusCode = 503` and returning early if a health/degradation flag is set
- Register with `app.UseMiddleware<YourMiddleware>()` in `Program.cs`

**Key points to mention:**
- Order matters — exception handling middleware should be first, then logging, then auth
- Short-circuiting means not calling `next()` at all
- You can inject services via constructor (registered in DI)

```csharp
public class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    public RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        await _next(context);
        sw.Stop();
        _logger.LogInformation("Request {Path} took {Ms}ms", context.Request.Path, sw.ElapsedMilliseconds);
    }
}
```

---

### Q2 — Verisk | Medium
**What is the difference between `IQueryable` and `IEnumerable` in LINQ? Give a real example from your remittance API work where using one over the other mattered.**

**Ideal Answer:**

| | `IEnumerable` | `IQueryable` |
|---|---|---|
| Execution | In-memory (client-side) | Translates to SQL (server-side) |
| Best for | In-memory collections, post-DB filtering | Database queries via EF Core |
| Extension methods | LINQ-to-objects | LINQ-to-SQL |

**Real remittance example:**

If you filter transactions by date using `IEnumerable`, all rows load into memory first — a disaster at 50M+ rows. With `IQueryable` + EF Core, the `WHERE created_date >= @date` clause goes directly to MSSQL.

```csharp
// BAD - loads all records then filters in memory
IEnumerable<Transaction> txns = _context.Transactions.ToList()
    .Where(t => t.CreatedAt >= DateTime.UtcNow.AddDays(-30));

// GOOD - SQL WHERE clause pushed to the database
IQueryable<Transaction> txns = _context.Transactions
    .Where(t => t.CreatedAt >= DateTime.UtcNow.AddDays(-30));
```

Always use `IQueryable` when querying the DB; switch to `IEnumerable` once you need in-memory projection or when working with data already loaded.

---

### Q3 — Cedar Gate | Medium
**Cedar Gate uses .NET for healthcare business process automation. How would you design a background job that processes insurance claims nightly?**

**Ideal Answer:**

Use `BackgroundService` (abstract base from `IHostedService`) in ASP.NET Core. For scheduling, use **Hangfire** or **Quartz.NET**.

**Pattern:**
1. Fetch pending claims in batches (avoid memory spikes — e.g., 500 records at a time)
2. Process each claim with business rules validation
3. Update status atomically (ACID transaction)
4. Log results with correlation IDs
5. Dead-letter failed claims to a retry queue
6. Alert/notify on repeated failure

```csharp
public class ClaimsProcessingJob : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var nextRun = GetNextMidnight();
            await Task.Delay(nextRun - DateTime.UtcNow, stoppingToken);
            await ProcessPendingClaimsAsync(stoppingToken);
        }
    }
}
```

Reference your PolicyPowerHouse experience at Vesuvio Labs — mention any job scheduler used there.

---

### Q4 — General Nepal IT | Hard
**What is async/await in C#? What is the difference between `Task.WhenAll` and `Task.WhenAny`? Can you explain a deadlock scenario with async code and how to avoid it?**

**Ideal Answer:**

`async/await` is syntactic sugar over the Task Parallel Library (TPL). The compiler transforms async methods into a state machine.

| | `Task.WhenAll` | `Task.WhenAny` |
|---|---|---|
| Completes when | ALL tasks finish | FIRST task finishes |
| Use case | Parallel calls, aggregate results | Timeout pattern, first-response wins |
| On failure | Throws AggregateException if any fail | Returns the first completed (check for fault) |

**Deadlock scenario:**
```csharp
// DEADLOCK - calling .Result blocks the synchronization context
public string GetData()
{
    return GetDataAsync().Result; // blocks the thread that async needs to resume on
}
```

**Fix:**
- Go async all the way: `public async Task<string> GetData()`
- Use `ConfigureAwait(false)` in library code to avoid capturing the sync context
- Never call `.Wait()` or `.Result` on an async method in a sync context

---

### Q5 — Infinite CS | Medium
**Implement a function in C# to find the first non-repeating character in a string. What is the time complexity?**

**Ideal Answer:**

```csharp
public static char? FirstNonRepeating(string s)
{
    var freq = new Dictionary<char, int>();
    
    foreach (char c in s)
        freq[c] = freq.GetValueOrDefault(c, 0) + 1;
    
    foreach (char c in s)
        if (freq[c] == 1) return c;
    
    return null;
}
```

- **Time complexity:** O(n) — two linear passes
- **Space complexity:** O(1) — at most 26 entries for lowercase alphabet (constant space)

Infinite CS specifically tests DSA in their technical rounds — be ready for variations: first non-repeating in a stream, or using a LinkedHashMap approach.

---

## 2. System Design

---

### Q6 — Verisk | Hard
**Design a remittance reconciliation service that handles 100,000 transactions/day, ensures idempotency, and supports audit trails.**

**Ideal Answer:**

**Architecture:**

```
Mobile/Web App
      ↓
REST API (ASP.NET Core)
      ↓
Message Queue (RabbitMQ / Azure Service Bus)
      ↓
Reconciliation Processor (microservice)
      ↓
MSSQL / PostgreSQL
      ↓
Audit Log Table (append-only)
```

**Idempotency:**
- Store a unique `transaction_id` (UUID from client) + `processed` flag
- On each request: `INSERT IF NOT EXISTS` or check before processing
- Return cached result if already processed

**Audit Trail:**
- Append-only table: `(id, transaction_id, action, old_value, new_value, actor, timestamp)`
- Never UPDATE audit rows — only INSERT

**Scale considerations:**
- Batch DB inserts (bulk operations)
- Index on `(created_date, status, corridor)` for common queries
- Async processing via queue — decouple ingestion from processing

Reference your GME Korea B2B/C2C flows directly — this is your strongest differentiator.

---

### Q7 — General Nepal IT | Hard
**Design a rate limiter for a remittance API that allows max 10 transactions per user per minute. How would you implement this in ASP.NET Core?**

**Ideal Answer:**

**Algorithm choices:** Token Bucket or Sliding Window (prefer Sliding Window for precision).

**Implementation options:**

**Option 1 — Built-in (.NET 7+):**
```csharp
builder.Services.AddRateLimiter(options =>
{
    options.AddSlidingWindowLimiter("perUser", opt =>
    {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.SegmentsPerWindow = 6;
        opt.QueueLimit = 0;
    });
});
```

**Option 2 — Redis (distributed, production-grade):**
```csharp
// Key: ratelimit:{userId}:{minute_bucket}
var key = $"ratelimit:{userId}:{DateTime.UtcNow:yyyyMMddHHmm}";
var count = await _redis.IncrAsync(key);
if (count == 1) await _redis.ExpireAsync(key, TimeSpan.FromMinutes(1));
if (count > 10) return StatusCode(429); // Too Many Requests
```

**Response:** Return `429 Too Many Requests` with `Retry-After` header.  
Redis `INCR` is atomic — no race conditions in distributed setup.

---

## 3. Database

---

### Q8 — Verisk | Medium
**You have a transactions table with 50M rows. A query joining it to a beneficiaries table is slow. Walk me through your optimization steps.**

**Ideal Answer:**

Step-by-step approach:

1. **Execution plan first** — `SET STATISTICS IO ON` + `EXPLAIN` / actual execution plan. Look for Table Scans, Key Lookups, high estimated vs actual row counts
2. **Add composite index** on join key + filter columns (e.g., `(beneficiary_id, created_date, status)`)
3. **Covering index** to avoid key lookups — include frequently selected columns
4. **Avoid `SELECT *`** — fetch only needed columns
5. **Partition the table** by date range if queries always filter on date
6. **Update statistics** — stale stats cause bad query plans
7. **Stored procedures** for repeated queries (reduces parse/compile time in MSSQL)
8. **Check for implicit type conversions** — joining `VARCHAR` to `INT` kills index usage

```sql
-- Before (slow - no index, SELECT *)
SELECT * FROM Transactions t
JOIN Beneficiaries b ON t.BeneficiaryId = b.Id
WHERE t.CreatedDate >= '2024-01-01'

-- After (optimized)
SELECT t.Id, t.Amount, t.Status, b.Name
FROM Transactions t WITH (NOLOCK)
JOIN Beneficiaries b ON t.BeneficiaryId = b.Id
WHERE t.CreatedDate >= '2024-01-01'
AND t.Status = 'COMPLETED'
-- With index: CREATE INDEX IX_Txn_BenefDate ON Transactions(BeneficiaryId, CreatedDate) INCLUDE (Amount, Status)
```

---

### Q9 — Cedar Gate | Medium
**Write a SQL query to find the top 5 agents by total remittance volume in the last 30 days, including agents who had zero transactions.**

**Ideal Answer:**

The key insight: use `LEFT JOIN` to include agents with zero transactions. Many candidates miss this.

```sql
SELECT TOP 5
    a.AgentId,
    a.AgentName,
    COALESCE(SUM(t.Amount), 0) AS TotalVolume
FROM Agents a
LEFT JOIN Transactions t 
    ON a.AgentId = t.AgentId
    AND t.CreatedDate >= DATEADD(DAY, -30, GETDATE())
    AND t.Status = 'COMPLETED'
GROUP BY a.AgentId, a.AgentName
ORDER BY TotalVolume DESC;
```

**PostgreSQL variant:**
```sql
SELECT a.agent_id, a.agent_name,
       COALESCE(SUM(t.amount), 0) AS total_volume
FROM agents a
LEFT JOIN transactions t 
    ON a.agent_id = t.agent_id
    AND t.created_at >= NOW() - INTERVAL '30 days'
GROUP BY a.agent_id, a.agent_name
ORDER BY total_volume DESC
LIMIT 5;
```

---

### Q10 — Infinite CS | Medium
**What is a database transaction? Explain ACID properties with a real fintech example.**

**Ideal Answer:**

A transaction is a unit of work that's either fully committed or fully rolled back — no partial state.

| Property | Meaning | Remittance Example |
|---|---|---|
| **Atomicity** | All-or-nothing | Debit sender + credit recipient happen together |
| **Consistency** | Rules always hold | Balance can't go negative; total money is conserved |
| **Isolation** | Concurrent txns don't interfere | Two transfers from same account can't double-spend |
| **Durability** | Committed data survives crashes | Transfer written to disk, survives server restart |

**Real GME example:**
```sql
BEGIN TRANSACTION;
    UPDATE Accounts SET Balance = Balance - @Amount WHERE AccountId = @SenderId;
    INSERT INTO Transactions (SenderId, ReceiverId, Amount, Status) VALUES (...);
    UPDATE Accounts SET Balance = Balance + @Amount WHERE AccountId = @ReceiverId;
    -- If any step fails:
ROLLBACK TRANSACTION;
    -- If all succeed:
COMMIT TRANSACTION;
```

Mention isolation levels: `READ COMMITTED` (default MSSQL), `SERIALIZABLE` for highest isolation.

---

## 4. OOP & Design Patterns

---

### Q11 — Verisk | Medium
**Explain SOLID principles. Which one do you find hardest to apply in practice? Give a real example where you violated it and fixed it.**

**Ideal Answer:**

| Principle | One-line summary |
|---|---|
| **S** — Single Responsibility | One class, one reason to change |
| **O** — Open/Closed | Open for extension, closed for modification |
| **L** — Liskov Substitution | Subclasses must be substitutable for base types |
| **I** — Interface Segregation | Don't force clients to implement methods they don't use |
| **D** — Dependency Inversion | Depend on abstractions, not concretions |

**Strong answer for "hardest":**

Open/Closed Principle in legacy remittance code. Example: a `PaymentProcessor` class with a massive switch statement for each corridor (India, Korea, Nepal).

```csharp
// BEFORE - violates OCP (every new corridor requires modifying this class)
public void Process(Payment p)
{
    switch (p.Corridor)
    {
        case "INDIA": ProcessIndia(p); break;
        case "KOREA": ProcessKorea(p); break;
        // Adding Nepal requires modifying this class
    }
}

// AFTER - OCP + DIP (strategy pattern)
public interface ICorridorStrategy
{
    Task ProcessAsync(Payment payment);
    string Corridor { get; }
}

public class KoreaCorridorStrategy : ICorridorStrategy { ... }
public class IndiaCorridorStrategy : ICorridorStrategy { ... }

// Register in DI, resolve by corridor name - no switch needed
```

---

### Q12 — Infinite CS | Medium
**Explain the difference between abstract classes and interfaces in C#. When would you use each? Give a payment/remittance example.**

**Ideal Answer:**

| | Interface | Abstract Class |
|---|---|---|
| Inheritance | Multiple implementation | Single inheritance only |
| State | No fields/state | Can have fields, properties |
| Implementation | Default methods (C# 8+) | Can provide partial implementation |
| Use when | Pure contract, unrelated types | Shared behavior + contract |

**Remittance example:**

```csharp
// Interface - any payment gateway implements this
public interface IPaymentGateway
{
    Task<PaymentResult> ProcessPaymentAsync(PaymentRequest request);
    Task<RefundResult> RefundAsync(string transactionId);
}

// Abstract class - shared retry/logging logic across all gateways
public abstract class BasePaymentGateway : IPaymentGateway
{
    protected readonly ILogger _logger;
    
    // Shared logic (open/close circuit, logging)
    public async Task<PaymentResult> ProcessPaymentAsync(PaymentRequest request)
    {
        _logger.LogInformation("Processing {Amount}", request.Amount);
        return await ExecuteTransactionAsync(request); // abstract - each gateway implements
    }
    
    protected abstract Task<PaymentResult> ExecuteTransactionAsync(PaymentRequest request);
}

public class IMEGateway : BasePaymentGateway { ... }
public class KoreaGMEGateway : BasePaymentGateway { ... }
```

C# 8+ interfaces can have default implementations — worth mentioning as a modern nuance.

---

## 5. Microservices

---

### Q13 — General Nepal IT | Hard
**What challenges did you face integrating with partner systems (like GME Korea's APIs), and how did you handle service failures gracefully?**

**Ideal Answer:**

Real challenges in partner API integration:
- **Timeouts** — partner API slow/unresponsive during peak hours
- **Version mismatches** — partner updates their contract without notice
- **Different error contracts** — partner returns 200 with error in body
- **Network instability** — especially cross-border (Nepal ↔ Korea latency)

**Patterns applied:**

```csharp
// Polly - Circuit Breaker + Retry
services.AddHttpClient<IGMEClient, GMEClient>()
    .AddPolicyHandler(GetRetryPolicy())
    .AddPolicyHandler(GetCircuitBreakerPolicy());

static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
    => HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, retryAttempt => 
            TimeSpan.FromSeconds(Math.Pow(2, retryAttempt))); // exponential backoff

static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
    => HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)); // open after 5 failures
```

**Additional measures:**
- Correlation IDs across all service calls for distributed tracing
- Health checks on all dependent services
- Fallback to cached/local data for non-critical lookups
- Contract testing to catch breaking changes early

---

## 6. Behavioral / HR

---

### Q14 — Cedar Gate | Easy
**Tell me about a time you worked in a cross-cultural or international team. How do you handle collaboration across time zones?**

**Ideal Answer (STAR format):**

- **Situation:** During the GME Korea project at Swift Technology, I completed a 3-month onsite visit to Korea for IT training and live implementation of the remittance platform
- **Task:** Collaborate with Korean engineers to implement B2B and C2C payment flows, with production systems running for real customers
- **Action:**
  - Async-first communication: all decisions documented in writing (Confluence/email), not just verbal
  - Identified overlap hours (9-11am KST / 6-8am NPT) for critical syncs
  - Maintained clear handoff notes at end of each working day
  - Adapted to different communication styles — Korean teams often prefer formal written sign-off before changes
- **Result:** Live implementation completed on schedule, system handling production traffic with Korean corridor partners

This directly mirrors Cedar Gate's Nepal-US dynamic. This is your strongest differentiator — few candidates have real production experience in a foreign office.

---

### Q15 — General Nepal IT | Easy
**Walk me through your most technically challenging project. What was the hardest problem you solved at Swift Technology / IME Group?**

**Ideal Answer (STAR structure):**

Choose one specific challenge — don't give a CV summary. Strong options from your background:

**Example 1 — Integration complexity:**
- Situation: GME Korea B2B API had non-standard error responses and frequent timeouts during peak hours
- Task: Ensure zero transaction loss while maintaining throughput SLAs
- Action: Implemented idempotency layer + Polly circuit breaker + async queue-based processing to decouple ingestion from processing
- Result: Reduced failed transaction rate from X% to near-zero, processing K transactions/day reliably

**Example 2 — DB performance:**
- Situation: Transaction history queries timing out on 30M+ row table
- Task: Optimize without downtime or schema migration risk
- Action: Added covering indexes, partitioned by date, rewrote N+1 query patterns to batch fetches
- Result: Query time from 8s → 200ms

**Key tip:** Avoid vague answers like "I built APIs." Give numbers wherever possible.

---

## 7. React / Frontend

---

### Q16 — General Nepal IT | Easy
**What is the difference between controlled and uncontrolled components in React? When would you use `useRef` over `useState`?**

**Ideal Answer:**

**Controlled component:** Form value lives in React state. `onChange` updates state — React is the single source of truth.

**Uncontrolled component:** DOM manages the value internally. You access it via `ref.current.value` when needed.

```jsx
// Controlled
const [name, setName] = useState('');
<input value={name} onChange={e => setName(e.target.value)} />

// Uncontrolled
const nameRef = useRef(null);
<input ref={nameRef} />
// Access: nameRef.current.value on submit
```

**When to use `useRef` over `useState`:**

| Scenario | Use |
|---|---|
| Direct DOM access (focus, scroll, measure) | `useRef` |
| Persist value across renders WITHOUT re-render | `useRef` (e.g., store timer ID, animation frame) |
| Store previous value | `useRef` |
| Value change should trigger UI update | `useState` |

**Insurance form example (PolicyPowerHouse):** Controlled components for fields with validation (email, amount); uncontrolled for file inputs (`<input type="file">` doesn't support controlled pattern).

---

## 8. GraphQL

---

### Q17 — General Nepal IT | Medium
**What are the advantages of GraphQL over REST for a remittance platform? What are the trade-offs?**

**Ideal Answer:**

**Advantages of GraphQL:**
- Clients request exactly what they need — no over-fetching (only get `amount, status`) or under-fetching (one call vs multiple REST calls)
- Single endpoint — simpler API gateway setup
- Strongly typed schema — auto-generated docs, type safety
- Great for mobile clients with limited bandwidth (relevant in Nepal's connectivity context)
- Introspection — clients can discover available data

**Trade-offs / Challenges:**
- **N+1 problem:** Querying 100 transactions + their senders = 101 DB queries. Solve with **DataLoader** (batching + caching)
- **Caching harder than REST** — REST uses HTTP cache headers naturally; GraphQL POSTs don't cache at the HTTP layer
- **Learning curve** — team needs to understand schema design, resolvers
- **Tooling maturity** — still catching up to REST for some monitoring scenarios

**When to use what:**
- GraphQL: mobile apps needing different data shapes, BFF (Backend for Frontend) patterns, complex domain queries
- REST: simple CRUD corridors, third-party integrations (partners expect REST), file uploads

Tie this to your GitHub GraphQL API project — mention the resolver structure and whether you used a library like Hot Chocolate or GraphQL.NET.

---

## Quick Reference: Company Interview Process Summary

| Company | Rounds | Focus Areas | Difficulty |
|---|---|---|---|
| **Verisk Nepal** | HR → Technical (panel) → Task → Final + Salary | DBMS, OOP, AWS, concepts over syntax | Medium-Hard |
| **Cedar Gate Kathmandu** | HR → Technical → (sometimes task) | .NET automation, fundamental concepts | Medium |
| **Infinite CS** | Phone screen → 2x Technical → HR | DSA, OOP, resume-based projects | Medium |
| **General Nepal IT** | Varies (2-4 rounds) | C#/.NET, SQL, system design, behavioral | Medium |

---

## Preparation Checklist (Based on Your CV)

- [ ] Practice explaining GME Korea B2B/C2C architecture in 2 minutes (your strongest story)
- [ ] Revise async/await, IQueryable vs IEnumerable (asked at Verisk)
- [ ] Prepare SQL query writing on paper/whiteboard (Verisk and Infinite both do this)
- [ ] Review your PolicyPowerHouse insurance work for Cedar Gate questions
- [ ] Be ready to talk about Azure services you've explored (Verisk expects cloud knowledge)
- [ ] Study Polly library patterns for resilience (directly relevant to your microservices work)
- [ ] Review your GraphQL GitHub project — N+1 problem, DataLoader, resolver design
- [ ] Prepare 3 STAR-format behavioral stories: challenge solved, cross-team collaboration, technical failure + learning

---