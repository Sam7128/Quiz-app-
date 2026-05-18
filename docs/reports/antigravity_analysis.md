# COMPREHENSIVE SOURCE FILE ANALYSIS - Antigravity Plugin

## 1. src/persistence/sessionStore.ts

### Key Interfaces & Types

**DataPoint** (lines 13-18)
- 	urn: Number identifier for turn
- 	okens: Token count at this turn
- 	imestamp: Recorded timestamp
- model: Model name (optional)

**CompressionEvent** (lines 20-26)
- 	imestamp: When compression occurred
- 	okensBefore: Context before compression
- 	okensAfter: Context after compression
- drop: Difference (before - after)
- stepCount: Step number when compressed

**PersistedSession** (lines 28-35)
- id: Session ID (cascadeId)
- model: Primary model used
- startTime: Session start time
- dataPoints: Array of DataPoint entries
- ccountEmail: Normalized email (with fallback to 'unknown')
- compressionEvents: Array of CompressionEvent entries

**StoreData** (lines 37-40)
- ersion: 1 or 2 (for migration handling)
- sessions: Array of PersistedSession

### Key Methods

**constructor(storagePath)** (lines 50-55)
- Creates <storagePath>/sessions/ directory
- Initializes empty v2 store if no data file exists
- Calls load() immediately

**load()** (lines 57-110)
- Reads data.json if exists
- **v1→v2 migration**: Adds ccountEmail='unknown', compressionEvents=[]
  - Creates backup at data.json.v1.bak
  - Atomically saves migrated v2 data
  - Sets migrationFailed=true if backup fails (prevents overwriting)
- **v2 loading**: Normalizes account aliases and prunes old sessions
- **Error handling**: Resets to empty v2 on corruption

**addDataPoint(sessionId, model, turn, tokens, accountEmail='unknown')** (lines 138-172)
- Creates new session if missing (startTime = Date.now())
- **Account resolution**:
  1. If accountEmail is 'unknown', tries fallback: resolveFreshAgSecureActiveAccountEmail()
  2. Normalizes via resolveCanonicalAccountEmail()
  3. Updates session.accountEmail if:
     - Current is 'unknown' and resolved is known, OR
     - Current is masked, resolved is unmasked, and accounts equivalent
- Updates model if valid non-empty string
- Appends DataPoint with current timestamp

**addCompressionEvent(sessionId, event)** (lines 174-180)
- Appends CompressionEvent to session
- Sorts by timestamp (maintains order)

**clearAll()** (lines 186-192)
- Clears all sessions
- Resets migrationFailed flag
- Persists to disk
- Comment notes: "clearing sessions removes all attribution heuristic inputs"

**getSessions()** (lines 182-184)
- Returns all persisted sessions (direct reference)

**save()** (lines 118-125)
- Returns early if migrationFailed === true
- Uses atomicSave(): write to .tmp, rename to final
- Catches/logs errors

**startAutoSave() / stopAutoSave()** (lines 127-136)
- Saves every 60,000 ms (60 seconds)

**dispose()** (lines 304-307)
- Stops auto-save
- Calls save() once more

### Current Functionality State
- ✅ V1→V2 migration with atomic operations and backup
- ✅ Account identity backfilling with fallback chain
- ✅ 30-day session pruning on load
- ✅ Compression event tracking with sorted storage
- ✅ Graceful degradation (memory-only mode on migration failure)

---

## 2. src/lsPollingManager.ts

### Key Private State

**previousStepCounts: Map<string, number>** (line 45)
- Maps cascadeId → last observed step count
- Used to detect step progression or trajectory reset

**trackedCascadeId: string | null** (line 46)
- Currently active cascade being monitored
- Persists across polls to maintain focus

**previousContextUsedMap: Map<string, number>** (line 47)
- Maps cascadeId → last context used (tokens)
- Used for poll-level compression detection (delta > 1% threshold)

**compressionPersistCounters: Map<string, number>** (line 48)
- Maps cascadeId → remaining persist cycles (0-3)
- Decrements each poll when compressionDetected=true
- Keeps compressionDetected=true during countdown

**emittedCompressionDrops: Set<string>** (line 49)
- Deduplication set: "cascadeId:before:after"
- Prevents emitting same compression multiple times if polling misses timing

**currentUsage: ContextUsage | null** (line 42)
- Cached current context usage from last successful poll

**consecutiveFailures: number** (line 43)
- Counts LS discovery failures
- Used for exponential backoff (up to 60 seconds)

### Key Methods

**resetTrackingState()** (lines 76-85)
`	ypescript
- Clears currentUsage
- Clears all Maps (previousStepCounts, trackedCascadeId, previousContextUsedMap, etc.)
- Calls clearIncrementalState() from lsTracker
- Used by extension.clearAllDataCmd handler
`

**start(cfg)** (lines 87-97)
- Sets disposed=false
- Resets state, failure count, and email
- Calls initial poll()
- Schedules recursive polling

**stop()** (lines 99-111)
- Sets disposed=true (prevents new polls)
- Clears polling timer
- Aborts in-flight RPC via abortController
- Resets state and email

**poll(cfg)** (lines 277-509) - Core polling logic

**Discovery Phase** (lines 285-298):
- Calls discoverLanguageServer(wsUri)
- On success: fetches user status, updates model display names
- On failure: increments consecutiveFailures, logs (first 3 and every 10th attempt)

**Email/Config Fetch** (lines 299-331):
- Fetches UserStatus RPC to get active account email
- On new discovery: applies AgSecure fallback if LS returns empty email
- On subsequent polls: retries email fetch with strategy:
  - First 3 polls: always retry
  - After 3: retry every 10th poll
  - Resets counter when email found

**Trajectory Selection** (lines 333-386):
- Filters trajectories by workspace (with fallback to all if no match)
- **Priority order** (line 346-373):
  1. Running cascades (status='CASCADE_RUN_STATUS_RUNNING')
  2. Recently changed cascades (stepCount ≠ previous)
  3. Previously tracked cascade
  4. Cold start: recent trajectories (lastModified within 30 min)
- Maintains previousStepCounts for all qualified trajectories

**Compression Detection** (lines 390-446):

*Poll-level detection* (lines 404-413):
- Compares contextUsed vs previousContextUsedMap[cascadeId]
- Detects when NOT undoing AND drop > 1% of contextLimit
- Sets isNewCompression=true, emits "just occurred"

*Step-level detection* (lines 414-427):
- Uses lsTracker's compressionDetected flag (from step-level analysis)
- Uses exact compressionTokensBeforeExact/AfterExact values
- Deduplicates via sig = "cascadeId:before:after"

*Persistence* (lines 429-446):
- New compression: sets compressionPersistCounters[cascadeId] = 3
- Each poll: decrements if counter > 0
- Keeps compressionDetected=true during countdown (3 polls)
- Cleans up old entries when cascade no longer active

**Event Emission** (lines 462-498):
- Builds LsContextUpdateEvent with all computed fields
- Includes compression flags: compressionJustOccurred, tokensBefore/After, exact variants
- Emits 'ls-context-update' event (consumed by extension.ts)
- Also emits 'estimate-updated' for status bar/dashboard

**schedule(cfg)** (lines 511-524):
- Calculates backoff: baseMs * 2^(consecutiveFailures-1), capped at 60s
- Schedules next poll recursively

### Current Functionality State
- ✅ Workspace-aware trajectory filtering (with fallback)
- ✅ Email recovery via AgSecure fallback (3-retry then backoff strategy)
- ✅ Dual compression detection (poll-level + step-level)
- ✅ Compression persistence across 3 polling cycles
- ✅ Deduplication of compression drops by signature
- ✅ Exponential backoff on discovery failures (up to 60 seconds)

---

## 3. src/lsTracker.ts

### Key Interfaces

**TokenUsageResult** (lines 37-52)
- inputTokens: Last checkpoint input
- 	otalOutputTokens: Cumulative output (all checkpoints + current step)
- 	otalToolCallOutputTokens: Tool-generated output
- contextUsed: Total tokens in context (input + output + delta)
- isEstimated: true if delta includes estimation (no current checkpoint)
- model: Effective model name
- lastModelUsage: ModelUsageInfo (exact values from last checkpoint)
- stimatedDeltaSinceCheckpoint: Tokens added since last checkpoint (estimated)
- compressionDetected: true if checkpoint input decreased
- compressionDrop: Max drop observed
- compressionTokensBeforeExact: Exact checkpoint input before drop
- compressionTokensAfterExact: Exact checkpoint input after drop
- hasGaps: true if RPC failed or returned 0 steps when expected

**ContextUsage** (lines 54-76)
- Extends TokenUsageResult with cascade metadata
- Adds: cascadeId, title, modelDisplayName, contextLimit, usagePercent, stepCount, status

### Key Functions

**processSteps(steps: Array<Record>)** (lines 366-504)

**Algorithm**:
1. Initialize empty result with all counters at 0/false
2. Loop through steps in order (lines 393-484):
   - Extract metadata and model info from step
   - Check for checkpoint (modelUsage with inputTokens/outputTokens)
   - **If checkpoint exists**:
     - Detect compression: if (prevCheckpointInput > 0 && input < prevCheckpointInput && drop > 5000) → compressionDetected=true
     - Update lastCheckpointInput, lastCheckpointOutput, cumulativeOutput
     - Reset estimatedDelta to 0 (we're now at a checkpoint)
     - Mark result.isEstimated=false (we have precise data)
   - **If no checkpoint**:
     - Estimate tokens from userInput and plannerResponse text
     - Add to estimatedDelta
   - Track toolCallOutputTokens separately
   - Update result.model from checkpoint or step metadata
3. **Final calculation** (lines 486-501):
   - If had checkpoints: contextUsed = lastCheckpointInput + cumulativeOutput + estimatedDelta
   - If no checkpoints: contextUsed = SYSTEM_PROMPT_OVERHEAD (10k) + estimatedDelta
   - Mark isEstimated = (estimatedDelta > 0)

**Compression Detection** (lines 418-426):
`	ypescript
if (prevCheckpointInput > 0 && input < prevCheckpointInput) {
  const drop = prevCheckpointInput - input;
  if (drop > COMPRESSION_MIN_DROP) {  // 5000 tokens minimum
    result.compressionDetected = true;
    result.compressionDrop = Math.max(result.compressionDrop, drop);
    result.compressionTokensBeforeExact = prevCheckpointInput;
    result.compressionTokensAfterExact = input;
  }
}
`

**result.model Resolution** (lines 403-404, 437, 443, 482):
1. From checkpoint: modelUsage.model (line 415)
2. From step: step.generatorModel or step.requestedModel (line 403-404)
3. From metadata: metadata.generatorModel or metadata.requestedModel (line 403-404)
4. Latest value in step order wins (line 482)

**getContextUsage(ls, trajectory, customLimits?, signal)** (lines 642-676)
- Calls getTrajectoryTokenUsage() to fetch and process steps
- Wraps result with cascade metadata:
  - cascadeId, title (summary), model, modelDisplayName
  - contextLimit (from model or customLimits or default 200k)
  - usagePercent = (contextUsed / contextLimit) * 100
  - stepCount, lastModifiedTime, status from trajectory

**getTrajectoryTokenUsage(cascadeId, stepCount, signal?)** (lines 513-557)
- RPC call: GetCascadeTrajectorySteps (startStepIndex=0, endStepIndex=stepCount)
- Incremental fetching: getLastSeenStepIndex() → only fetch new steps
- Detects trajectory reset: if (currentStepCount < lastIndex) → refetch from 0
- Updates lastSeenStepIndex on success
- Handles hasGaps = true if RPC fails or returns empty when stepCount > 0

### Constants (lines 78-99)
- SYSTEM_PROMPT_OVERHEAD: 10,000 tokens
- USER_INPUT_FALLBACK: 500 tokens
- PLANNER_RESPONSE_FALLBACK: 800 tokens
- COMPRESSION_MIN_DROP: 5,000 tokens
- RPC_TIMEOUT_MS: 10,000 ms
- STEPS_RPC_TIMEOUT_MS: 30,000 ms
- DEFAULT_CONTEXT_LIMITS: per-model limits (most 200k, some 1M)

### Current Functionality State
- ✅ Checkpoint-based precise token tracking
- ✅ Estimation fallbacks for gap-filling
- ✅ Compression detection with exact before/after values (5k threshold)
- ✅ Model identity resolution (priority order)
- ✅ Incremental step fetching with trajectory reset detection
- ✅ Token estimation from text (4 chars/token ASCII, 1.5 chars/token non-ASCII)

---

## 4. src/eventBus.ts

### Event Interfaces

**RequestCapturedEvent** (lines 3-13)
- Used by networkInterceptor to signal request capture
- Fields: url, bodySize, timestamp, source, reason, tokenDelta, captureMode, confidence, activeAccountEmail

**EstimateUpdatedEvent** (lines 15-22)
- Used by tokenEstimator and lsPollingManager
- Fields: totalTokens, maxTokens, percentage, totalBytes, maxBytes, activeAccountEmail

**LsContextUpdateEvent** (lines 25-51)
- Primary event from lsPollingManager when LS provides context data
- **Core fields**: cascadeId, title, model, modelDisplayName, contextUsed, contextLimit, usagePercent
- **Token details**: totalOutputTokens, totalToolCallOutputTokens, checkpointInputTokens, checkpointOutputTokens, checkpointCacheReadTokens
- **State fields**: stepCount, isEstimated, compressionDetected, hasGaps
- **Compression fields**: compressionJustOccurred, compressionTokensBefore/After, compressionTokensBeforeExact/AfterExact
- **Meta**: accountEmail, isLsSource

**EventBusEvents** (lines 53-57)
- Type mapping for typed event bus

### Exported Instance (line 73)
`	ypescript
export const eventBus = new TypedEventBus();
`
- Used globally throughout extension (singleton pattern)

---

## 5. src/extension.ts

### clearAllDataCmd Handler (lines 655-678)

**Handler Flow**:
1. Check sessionStore exists
2. Show warning modal: "This will permanently clear all stored session history"
3. If user confirms with "Clear" button:
   - Call sessionStore.clearAll() → clears all sessions, resets migrationFailed, saves
   - Call lsManager?.resetTrackingState() → clears compression tracking, previousStepCounts, etc.
   - If dashboard panel open: call efreshOpenDashboard() to update UI
   - Show info message: "Cleared all session data"

**Impact**:
- Removes all historical token usage data
- Resets compression persistence counters
- Loses account attribution (cannot recover after clearAll)

### ls-context-update Event Handler (lines 593-621)

**Handler Flow**:
1. Extract fields from event: cascadeId, model, stepCount, contextUsed, accountEmail
2. Call sessionStore.addDataPoint():
   - Creates or updates session
   - Adds data point with turn=stepCount, tokens=contextUsed
   - Applies account identity normalization
3. **If compressionJustOccurred === true**:
   - Prefer exact values: compressionTokensBeforeExact/AfterExact if available
   - Fall back to: compressionTokensBefore/After
   - Call sessionStore.addCompressionEvent():
     - Records timestamp (Date.now())
     - Records tokensBefore, tokensAfter, drop
     - Stores stepCount

**Key Point**: CompressionEvents ONLY persisted when compressionJustOccurred=true
- Prevents duplicate events from persistence countdown
- Exact values preferred (from step-level detection)

### Related Functions

**buildDashboardData(cfg, timeframe, account)** (lines 439-557)
- Gets all sessions from sessionStore
- Filters by timeframe ('today', '7d', 'all') via filterSessions()
- Filters by account (or 'all')
- If lsManager has active usage:
  - Builds chart data from dataPoints
  - Uses current model, usage percent, status
  - Retrieves activeSessionObj via resolveCurrentActiveSession()
- Returns data + resolved account for UI

**buildMergedModelGrowthData(sessions)** (lines 226-283)
- Calls aggregateByModel() and computeSessionModelGrowth() for each session
- Maps model IDs → display names
- Aggregates by display name (handles aliases)
- Returns sorted list by totalGrowth

**buildMergedModelUsageSummary(sessions)** (lines 285-323)
- Aggregates step counts and growth per model
- Merges entries by display name
- Sorts by totalGrowth desc, then stepCount desc

**activate(context)** (lines 575-754)
- Initializes all modules (networkInterceptor, tokenEstimator, statusBar, etc.)
- Creates SessionStore with auto-save
- Registers event listener for 'ls-context-update'
- Registers commands: resetCounter, showDetails, clearAllData, runDiagnostics, simulateTurn, exportData
- Registers config change listener

### Current Functionality State
- ✅ Compression events only written when "just occurred"
- ✅ Exact compression values preferred over polling estimates
- ✅ Dashboard auto-refresh on config changes
- ✅ Session export to JSON
- ✅ Full diagnostic telemetry output

---

## 6. src/analytics/analyticsAggregator.ts

### Helper Functions

**getFinalTokens(session)** (lines 169-174)
- Returns last dataPoint.tokens, or 0 if no points

**getGrowthAnalysisInput(session)** (lines 180-195)
- If session has __contextSentinelWindowMeta:
  - Returns windowed points, compressionEvents, and initialBaseline
- Else:
  - Normalizes current dataPoints and compressionEvents
  - Returns {points, compressionEvents, initialBaseline: 0}

### Aggregation Functions

**aggregateByAccount(sessions)** (lines 559-577)
- Normalizes account identities
- Groups by accountEmail
- Returns AccountAggregation[]:
  - accountEmail, totalTokens (sum of final points), sessionCount, lastUsed (max startTime)
- Sorted by totalTokens descending

**aggregateByDayPerAccount(sessions, dayRange=7)** (lines 682-702)
- Generates dayRange dates backward from today
- For each session: gets final tokens, dates by session.startTime, adds to daily bucket by account
- Returns DailyAccountAggregation[]:
  - date, accounts: {[email]: tokens}

**aggregateByDay(sessions, dayRange=7)** (lines 541-557)
- Similar to aggregateByDayPerAccount, but single total per day (not per account)

**aggregateByModel(sessions)** (lines 620-642)
- For each session: calls computeSessionModelGrowth()
- Aggregates growth by model across sessions
- Returns ModelAggregation[]:
  - model, totalTokens (delta growth), sessionCount
- Sorted by totalTokens descending

### Analysis Functions

**computeSessionModelGrowth(session, emitWarnings=true)** (lines 579-584)
- Delegates to buildSessionModelAnalysis()
- Returns Map<model, totalGrowth>

**buildSessionModelAnalysis(session, emitWarnings)** (lines 396-446)
- Gets growth analysis input (points, compressions, baseline)
- For each point (in order):
  - Creates or updates usage entry for point.model
  - Applies any compressions in the gap
  - Calculates delta = point.tokens - baseline
  - Attributes delta to point.model
  - Marks as compressionAffected if compression occurred
- Returns {growthByModel: Map, usageByModel: Map}

**buildSegmentLedger(session)** (lines 237-306)
- Builds segments (model + tokens retained)
- Algorithm:
  1. For each point: creates segment with model and growth delta
  2. Processes compressions: removes drop from segment queue (FIFO)
  3. Returns remaining (non-zero) segments
- Used for retained context calculation

**computeRetainedContextByModel(session)** (lines 308-394)
- Uses buildSegmentLedger() to get segments
- Aggregates retained tokens by model
- **Uncertainty detection**: marks model as uncertain if model changed across compressions
- **Invariant check**: 
  - expectedTotal = last point tokens (or last compression's tokensAfter)
  - retainedTotal = sum of segments
  - Returns {entries, invariantViolation: (retainedTotal !== expectedTotal)}
- Logs warning if invariant violated

### Windowing & Filtering

**toWindowedSession(session, cutoff)** (lines 448-504)
- Filters dataPoints to those with timestamp >= cutoff
- Calculates baseline from points/compressions before cutoff
- Adjusts all points: tokens -= baseline
- Returns new session with:
  - startTime = max(session.startTime, first windowed point's timestamp)
  - dataPoints = windowed points with adjusted tokens
  - Attaches __contextSentinelWindowMeta:
    - initialBaseline, points (full history), compressionEvents (full history)

**filterSessionsByTimeframe(sessions, timeframe)** (lines 506-523)
- 'today': midnight today
- '7d': 7 days back
- 'all': no filter
- Uses toWindowedSession() internally
- Returns sessions with at least 1 windowed data point

**filterSessions(sessions, filters)** (lines 525-539)
- Normalizes account identities
- Filters by timeframe
- If account !== 'all': filters by account
- Returns filtered sessions

### Data Flow for Growth Attribution

1. **Raw session**: dataPoints with absolute tokens, compressionEvents with before/after
2. **Growth calculation**:
   - For each point: baseline (from previous point or compression)
   - delta = currentTokens - baseline
   - attribute delta to point.model
3. **Compression handling**:
   - Removes drop from baseline (compressionTokensAfter becomes new baseline)
4. **Retained context**:
   - Segments represent "chunks" added per model
   - Compressions consume from oldest segments
   - Final segments = what remains

### Current Functionality State
- ✅ Multi-dimensional aggregation (by account, model, day, day+account)
- ✅ Delta-based growth attribution (not absolute tokens)
- ✅ Compression-aware retained context calculation
- ✅ Timeframe windowing with baseline normalization
- ✅ Invariant violation detection with warnings
- ✅ Uncertainty flagging for model-switching scenarios
- ✅ Per-model step count and first/last timestamp tracking

---

## EXISTING TEST FILES SUMMARY

**persistence.test.ts**
- SessionStore initialization, add/persist/reload, pruning, account identity, clearAll, v1→v2 migration

**lsPollingManager.test.ts**
- Compression logic: justOccurred only on first poll, persist for 3 cycles, dedup signatures

**lsTracker.test.ts**
- Token estimation, checkpoint detection, compression detection, model extraction

**analyticsAggregator.test.ts**
- Aggregation functions, windowed sessions, retained context, segment ledger, invariant checks

**extension.test.ts**
- Command registration, event flow, dashboard data assembly

**19 additional test files**
- Network, config, UI components, prediction, security, discovery, error handling, etc.

---

## CRITICAL DESIGN PATTERNS

1. **Compression Deduplication**:
   - Poll-level: delta > 1% threshold + "NOT undoing" check
   - Step-level: 5k token drop threshold + signature dedup
   - Signature: "cascadeId:before:after" prevents double-emission

2. **Account Identity**:
   - Normalized to canonical form on load
   - Fallback chain: lsPollingManager → resolveFreshAgSecureActiveAccountEmail() → addDataPoint()
   - Cannot be recovered after clearAll()

3. **Persistence Strategy**:
   - Atomic writes (write to .tmp, rename to final)
   - Auto-save every 60 seconds
   - Migration with backup and degraded mode on failure

4. **Token Accounting**:
   - Precise: from checkpoint's modelUsage
   - Estimated: from step content or fallbacks
   - Final = checkpoint.input + cumulativeOutput + delta
   - Growth = delta since baseline (per model)

5. **Event Flow**:
   - lsTracker.processSteps() → lsPollingManager.poll() → eventBus('ls-context-update') → extension.ts (sessionStore + dashboard)
   - Only compressionJustOccurred=true events → sessionStore.addCompressionEvent()

