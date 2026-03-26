/**
 * interview-questions.js
 * Default question bank for the C# & .NET AI Interview system.
 * Organised by phase. Questions are shown as clickable chips in the UI
 * so candidates can pick a pre-written answer scaffold or the interviewer
 * can jump to a specific question without the API.
 */

window.INTERVIEW_QUESTIONS = {

  /* ── Phase 1: Introduction ─────────────────────────────────── */
  introduction: [
    {
      id: 'intro_1',
      label: 'Self Introduction',
      question: 'Can you briefly introduce yourself — your background, current role, and what drew you to C# and .NET development?',
      sampleAnswer: 'I am a software developer with X years of experience building backend services primarily in C# and .NET. I started with .NET Framework and have been working with .NET Core / .NET 5+ since its release. My current role involves designing RESTful APIs and microservices for a fintech platform.'
    },
    {
      id: 'intro_2',
      label: 'Recent Project',
      question: 'Tell me about the most recent .NET project you worked on. What was your contribution?',
      sampleAnswer: 'I recently led the backend development of a customer portal using ASP.NET Core 7, Entity Framework Core, and Azure Service Bus for event-driven communication. I was responsible for API design, implementing the repository pattern, and setting up CI/CD pipelines.'
    },
    {
      id: 'intro_3',
      label: 'Why This Role',
      question: 'What interests you most about this position, and what do you hope to learn or contribute?',
      sampleAnswer: 'I am excited about the opportunity to work on scalable systems at a larger scale. I want to deepen my expertise in distributed architecture and contribute by bringing clean code practices and solid design patterns to the team.'
    }
  ],

  /* ── Phase 2: C# & .NET Technical ─────────────────────────── */
  csharp: [
    {
      id: 'cs_1',
      label: 'async/await',
      question: 'Explain how async/await works in C#. What is the difference between Task.Run and async/await?',
      difficulty: 'mid',
      sampleAnswer: 'async/await is syntactic sugar over the Task-based Asynchronous Pattern (TAP). When you await a Task, the compiler generates a state machine that suspends execution and frees the calling thread without blocking it. Task.Run schedules work on the ThreadPool and is suited for CPU-bound work, while async/await with I/O-bound operations (like HttpClient or DbContext) avoids occupying a thread during the wait entirely.'
    },
    {
      id: 'cs_2',
      label: 'Garbage Collection',
      question: 'How does the .NET Garbage Collector work? Explain generations and when you might use IDisposable.',
      difficulty: 'mid',
      sampleAnswer: 'The GC uses a generational model with Gen 0, Gen 1, and Gen 2. Short-lived objects are allocated in Gen 0 and collected frequently. Surviving objects are promoted. IDisposable is used for deterministic cleanup of unmanaged resources (file handles, DB connections). The using statement ensures Dispose() is called even if an exception occurs.'
    },
    {
      id: 'cs_3',
      label: 'LINQ',
      question: 'What is deferred execution in LINQ and why does it matter? Give a practical example.',
      difficulty: 'junior',
      sampleAnswer: 'LINQ queries using IEnumerable are not executed when defined — they execute when iterated (e.g., with foreach, ToList(), or Count()). This matters for EF Core: a query like dbContext.Users.Where(u => u.Active) does not hit the database until you materialise it, allowing you to chain conditions before execution.'
    },
    {
      id: 'cs_4',
      label: 'Dependency Injection',
      question: 'Explain the three DI lifetimes in ASP.NET Core: Transient, Scoped, and Singleton. When would each be misused?',
      difficulty: 'mid',
      sampleAnswer: 'Transient creates a new instance per request to the container. Scoped creates one instance per HTTP request. Singleton creates one for the app lifetime. A common mistake is injecting a Scoped service into a Singleton (captive dependency), which causes the Scoped service to live longer than intended, potentially causing data leaks in multi-tenant scenarios.'
    },
    {
      id: 'cs_5',
      label: 'Value vs Reference',
      question: 'What is the difference between value types and reference types in C#? Where does each live in memory?',
      difficulty: 'junior',
      sampleAnswer: 'Value types (struct, int, bool, etc.) are stored on the stack when declared as local variables or inline within an object. Reference types (class, string, arrays) store a reference on the stack pointing to heap memory. However, value types inside reference types live on the heap too. Boxing occurs when a value type is cast to object, allocating heap memory.'
    },
    {
      id: 'cs_6',
      label: 'Exception Handling',
      question: 'What are best practices for exception handling in a production ASP.NET Core API?',
      difficulty: 'mid',
      sampleAnswer: 'Use global exception middleware (UseExceptionHandler or a custom IExceptionFilter) to catch unhandled exceptions. Avoid swallowing exceptions with empty catch blocks. Use specific exception types and map them to HTTP status codes (e.g., NotFoundException → 404). Log full stack traces using ILogger but return sanitised error responses to clients. Never expose internal details in production.'
    },
    {
      id: 'cs_7',
      label: 'Middleware Pipeline',
      question: 'Describe how the ASP.NET Core middleware pipeline works. How do you write custom middleware?',
      difficulty: 'senior',
      sampleAnswer: 'The middleware pipeline is a chain of delegates. Each middleware component calls next() to pass control to the next component, or short-circuits by returning without calling next. Custom middleware is a class with an InvokeAsync(HttpContext context, RequestDelegate next) method, registered with app.UseMiddleware<T>(). Order of registration matters.'
    },
    {
      id: 'cs_8',
      label: 'Record Types',
      question: 'What are C# record types? How do they differ from classes and when would you use them?',
      difficulty: 'mid',
      sampleAnswer: 'Records are reference types (record class) or value types (record struct) with value-based equality by default. They are immutable by default using init-only setters and support with-expressions for non-destructive mutation. Ideal for DTOs, commands, events, and domain value objects where identity is determined by data, not reference.'
    }
  ],

  /* ── Phase 3: OOP & Design Patterns ───────────────────────── */
  oop: [
    {
      id: 'oop_1',
      label: 'SOLID Principles',
      question: 'Explain the SOLID principles with a brief C# example for each.',
      difficulty: 'mid',
      sampleAnswer: 'S – Single Responsibility: each class has one reason to change. O – Open/Closed: extend via inheritance/composition, not modification. L – Liskov Substitution: subtypes must be substitutable for their base types. I – Interface Segregation: prefer small, focused interfaces over large ones. D – Dependency Inversion: depend on abstractions (interfaces), not concretions.'
    },
    {
      id: 'oop_2',
      label: 'Repository Pattern',
      question: 'Why use the Repository pattern with EF Core? What are its trade-offs?',
      difficulty: 'mid',
      sampleAnswer: 'Repository abstracts data access behind an interface, making business logic testable without a real database. Trade-offs: EF Core\'s DbContext is already a unit of work and repository pattern can lead to leaky abstractions or anemic repositories that just wrap EF methods. It is most valuable when you want to swap data sources or write unit tests with in-memory fakes.'
    },
    {
      id: 'oop_3',
      label: 'Singleton Pattern',
      question: 'How would you implement a thread-safe Singleton in C#? What pitfalls should you avoid?',
      difficulty: 'mid',
      sampleAnswer: 'The simplest thread-safe approach uses Lazy<T>: `private static readonly Lazy<MyClass> _instance = new(() => new MyClass()); public static MyClass Instance => _instance.Value;`. Pitfalls: double-checked locking is error-prone without volatile. Avoid Singletons for stateful mutable objects in multi-threaded contexts as they become global state and reduce testability.'
    },
    {
      id: 'oop_4',
      label: 'Factory Pattern',
      question: 'When would you choose Factory Method over Abstract Factory? Give a real-world C# scenario.',
      difficulty: 'senior',
      sampleAnswer: 'Factory Method is for creating one product family — e.g., a PaymentProcessorFactory that returns IPaymentProcessor based on a payment type string. Abstract Factory creates families of related objects — e.g., an IUIFactory that returns IButton and ITextBox consistent with a theme (Light/Dark). Use Abstract Factory when multiple related products must be coordinated.'
    },
    {
      id: 'oop_5',
      label: 'Strategy Pattern',
      question: 'Describe the Strategy pattern and how it helps avoid long if/else chains.',
      difficulty: 'junior',
      sampleAnswer: 'Strategy defines a family of algorithms behind a common interface and makes them interchangeable. Instead of if(type == "pdf") { ... } else if (type == "csv") { ... }, you register IExportStrategy implementations (PdfExportStrategy, CsvExportStrategy) and resolve the correct one via a dictionary or DI. Adding a new format means adding a class, not editing existing code (Open/Closed Principle).'
    },
    {
      id: 'oop_6',
      label: 'Decorator Pattern',
      question: 'How does the Decorator pattern work in C#? How does ASP.NET Core middleware use this concept?',
      difficulty: 'senior',
      sampleAnswer: 'Decorator wraps an object to add behaviour without changing the original class. ASP.NET Core middleware is essentially a decorator chain — each middleware wraps the next delegate, adding cross-cutting concerns (logging, auth, compression) transparently. In code, you can decorate an IOrderService with a CachingOrderService and a LoggingOrderService, each delegating to the inner service.'
    },
    {
      id: 'oop_7',
      label: 'Refactor This',
      question: 'You see a 400-line God class with 30 methods and public fields. How do you approach refactoring it?',
      difficulty: 'senior',
      sampleAnswer: 'First, add characterisation tests to capture current behaviour. Then identify distinct responsibilities — each becomes a new class. Extract methods into private helpers, then move cohesive groups into new classes. Apply Dependency Inversion — inject collaborators rather than newing them up. Incrementally replace public fields with properties and encapsulate logic. Release in small, reviewed steps.'
    }
  ],

  /* ── Phase 4: Coding Exercise ──────────────────────────────── */
  coding: [
    {
      id: 'code_1',
      label: 'Rate Limiter',
      question: `Design a simple in-memory rate limiter in C#.
      
**Requirements:**
- Allow a maximum of N requests per user per time window (e.g. 10 requests per minute)
- Return true if the request is allowed, false if it is rate limited
- Thread-safe

**Signature:** bool IsAllowed(string userId, int maxRequests, TimeSpan window)`,
      difficulty: 'senior',
      sampleAnswer: `public class RateLimiter
{
    private readonly ConcurrentDictionary<string, Queue<DateTime>> _requests = new();

    public bool IsAllowed(string userId, int maxRequests, TimeSpan window)
    {
        var now = DateTime.UtcNow;
        var queue = _requests.GetOrAdd(userId, _ => new Queue<DateTime>());

        lock (queue)
        {
            while (queue.Count > 0 && now - queue.Peek() > window)
                queue.Dequeue();

            if (queue.Count >= maxRequests) return false;

            queue.Enqueue(now);
            return true;
        }
    }
}`
    },
    {
      id: 'code_2',
      label: 'Flatten Nested List',
      question: `Write a C# method that flattens a nested list of integers.

**Input:** [1, [2, [3, 4], 5], 6]  
**Output:** [1, 2, 3, 4, 5, 6]

Model the nested structure using a class and recursion or a stack.`,
      difficulty: 'mid',
      sampleAnswer: `public class NestedItem
{
    public int? Value { get; set; }
    public List<NestedItem> Children { get; set; } = new();
    public bool IsLeaf => Value.HasValue;
}

public static IEnumerable<int> Flatten(IEnumerable<NestedItem> items)
{
    foreach (var item in items)
    {
        if (item.IsLeaf) yield return item.Value!.Value;
        else foreach (var v in Flatten(item.Children)) yield return v;
    }
}`
    },
    {
      id: 'code_3',
      label: 'Generic Cache',
      question: `Implement a generic in-memory cache with expiry in C#.

**Requirements:**
- Store key-value pairs with a TTL (time-to-live)
- Auto-expire entries on access
- Thread-safe
- Get returns null/default if expired or not found`,
      difficulty: 'mid',
      sampleAnswer: `public class SimpleCache<TKey, TValue> where TKey : notnull
{
    private record CacheEntry(TValue Value, DateTime ExpiresAt);
    private readonly ConcurrentDictionary<TKey, CacheEntry> _store = new();

    public void Set(TKey key, TValue value, TimeSpan ttl)
        => _store[key] = new CacheEntry(value, DateTime.UtcNow + ttl);

    public TValue? Get(TKey key)
    {
        if (_store.TryGetValue(key, out var entry))
        {
            if (DateTime.UtcNow < entry.ExpiresAt) return entry.Value;
            _store.TryRemove(key, out _);
        }
        return default;
    }
}`
    },
    {
      id: 'code_4',
      label: 'API Endpoint Design',
      question: `Design an ASP.NET Core minimal API endpoint for creating an order.

**Requirements:**
- POST /orders  
- Validate that ProductId and Quantity > 0  
- Return 201 Created with order ID on success  
- Return 400 Bad Request with validation errors  
- Use a service layer (inject IOrderService)`,
      difficulty: 'mid',
      sampleAnswer: `app.MapPost("/orders", async (
    CreateOrderRequest request,
    IOrderService orderService,
    IValidator<CreateOrderRequest> validator) =>
{
    var result = await validator.ValidateAsync(request);
    if (!result.IsValid)
        return Results.ValidationProblem(result.ToDictionary());

    var orderId = await orderService.CreateOrderAsync(request);
    return Results.Created($"/orders/{orderId}", new { orderId });
})
.WithName("CreateOrder")
.Produces<object>(201)
.ProducesValidationProblem();`
    },
    {
      id: 'code_5',
      label: 'LRU Cache',
      question: `Implement an LRU (Least Recently Used) Cache in C# with O(1) Get and Put.

**API:**
- LruCache(int capacity)
- int Get(int key) → -1 if not found
- void Put(int key, int value) → evict LRU if at capacity`,
      difficulty: 'senior',
      sampleAnswer: `public class LruCache
{
    private readonly int _cap;
    private readonly Dictionary<int, LinkedListNode<(int key, int val)>> _map = new();
    private readonly LinkedList<(int key, int val)> _list = new();

    public LruCache(int capacity) => _cap = capacity;

    public int Get(int key)
    {
        if (!_map.TryGetValue(key, out var node)) return -1;
        _list.Remove(node); _list.AddFirst(node);
        return node.Value.val;
    }

    public void Put(int key, int value)
    {
        if (_map.TryGetValue(key, out var node)) { _list.Remove(node); _map.Remove(key); }
        else if (_map.Count == _cap) { _map.Remove(_list.Last!.Value.key); _list.RemoveLast(); }
        var n = _list.AddFirst((key, value));
        _map[key] = n;
    }
}`
    },
    {
      id: 'code_6',
      label: 'Retry Helper',
      question: `Write a generic async retry helper in C#.

**Requirements:**
- Retry an async operation up to N times  
- Configurable delay between retries  
- Stop retrying on certain exception types  
- Signature: Task<T> RetryAsync<T>(Func<Task<T>> operation, int maxAttempts, TimeSpan delay, Type[]? nonRetryableExceptions = null)`,
      difficulty: 'senior',
      sampleAnswer: `public static async Task<T> RetryAsync<T>(
    Func<Task<T>> operation,
    int maxAttempts,
    TimeSpan delay,
    Type[]? nonRetryable = null)
{
    for (int attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try { return await operation(); }
        catch (Exception ex) when (attempt < maxAttempts)
        {
            if (nonRetryable?.Any(t => t.IsInstanceOfType(ex)) == true) throw;
            await Task.Delay(delay);
        }
    }
    return await operation(); // final attempt — let it throw
}`
    }
  ],

  /* ── Phase 5: Agile & Communication ───────────────────────── */
  agile: [
    {
      id: 'agile_1',
      label: 'Sprint Conflict',
      question: 'Describe a time when you disagreed with a technical decision made by your team or tech lead. How did you handle it?',
      sampleAnswer: 'I disagreed with the decision to use stored procedures for all data access because it made unit testing extremely difficult. I documented my concerns with concrete examples, proposed an alternative using the repository pattern, and brought it to the team in a tech review. We agreed to pilot the new approach on the next feature, which proved successful and was adopted team-wide.'
    },
    {
      id: 'agile_2',
      label: 'Remote Challenges',
      question: 'What is the hardest part of working remotely on an Agile team, and how do you address it?',
      sampleAnswer: 'Async communication can cause blocked tickets when reviewers are in different time zones. I address this by writing detailed PR descriptions, using async video walkthroughs (Loom), and pairing on complex features via scheduled sessions. I also advocate for shorter feedback cycles — smaller PRs that are easier to review asynchronously.'
    },
    {
      id: 'agile_3',
      label: 'Unclear Requirements',
      question: 'A ticket in the sprint has vague acceptance criteria and the product owner is unavailable. What do you do?',
      sampleAnswer: 'I document my assumptions clearly in the ticket comments, break the work into the parts I can define confidently, and flag the ambiguity in Slack with a specific question rather than a general "this is unclear". If it blocks the entire ticket, I move to another task and raise it in stand-up. I never assume and code for two days in the wrong direction.'
    },
    {
      id: 'agile_4',
      label: 'Estimation',
      question: 'How do you approach story point estimation? What do you do when estimates are consistently off?',
      sampleAnswer: 'I use relative sizing (Fibonacci) against a reference story the team agrees on. When estimates are consistently off, I push for a retrospective on root causes: unclear requirements, hidden dependencies, or tech debt. I advocate for adding a tech debt buffer in sprint capacity rather than ignoring the cause. Velocity becomes more reliable when the team is honest about unknowns.'
    },
    {
      id: 'agile_5',
      label: 'Code Review Culture',
      question: 'How do you give and receive constructive code review feedback on a remote team?',
      sampleAnswer: 'I frame review comments as questions or suggestions rather than mandates ("What do you think about extracting this into a service?" vs "This is wrong"). I distinguish between blocking issues and nitpicks explicitly using labels. When receiving feedback I assume good intent, ask for clarification before defending, and if I disagree I provide a clear technical rationale rather than just pushing back.'
    },
    {
      id: 'agile_6',
      label: 'Scrum Ceremonies',
      question: 'Which Scrum ceremonies do you find most valuable and which feel like overhead? How would you improve them?',
      sampleAnswer: 'Sprint retrospectives are the most valuable — they compound team improvements. Daily stand-ups can feel like status reports rather than blocker removal; I prefer async stand-ups (written updates) with only blocking issues discussed live. Sprint reviews are often too long; I prefer continuous demos over a formal end-of-sprint session for faster feedback loops.'
    }
  ]
};

/**
 * Get questions for a specific phase.
 * @param {'introduction'|'csharp'|'oop'|'coding'|'agile'} phase
 * @param {'junior'|'mid'|'senior'|'lead'|null} level  optional filter
 * @returns Array of question objects
 */
window.getQuestions = function(phase, level = null) {
  const bank = window.INTERVIEW_QUESTIONS[phase] || [];
  if (!level) return bank;
  // For phases without difficulty (intro/agile), return all
  return bank.filter(q => !q.difficulty || q.difficulty === level ||
    (level === 'lead' && q.difficulty === 'senior'));
};

/**
 * Get a random subset of questions for a phase.
 * @param {string} phase
 * @param {number} count
 * @param {string|null} level
 */
window.getRandomQuestions = function(phase, count = 3, level = null) {
  const all = window.getQuestions(phase, level);
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

/**
 * Phase → question bank key mapping
 */
window.PHASE_KEYS = ['introduction', 'csharp', 'oop', 'coding', 'agile'];
