# Performance Benchmarks

This document tracks the performance metrics of filter-def over time.

## Running Benchmarks

```bash
pnpm run bench
```

## Baseline Performance (Initial Implementation)

Date: 2024
Environment: Node.js on macOS

### Single Filter - Equals

| Dataset Size | ops/sec    | Mean (ms) |
|--------------|------------|-----------|
| 100 items    | 82,041.57  | 0.0122    |
| 1,000 items  | 7,785.71   | 0.1284    |
| 10,000 items | 769.32     | 1.2998    |

### Single Filter - Contains

| Dataset Size | ops/sec    | Mean (ms) |
|--------------|------------|-----------|
| 100 items    | 62,775.80  | 0.0159    |
| 1,000 items  | 6,244.26   | 0.1601    |
| 10,000 items | 628.69     | 1.5906    |

### Single Filter - Comparison (>=)

| Dataset Size | ops/sec    | Mean (ms) |
|--------------|------------|-----------|
| 100 items    | 65,430.10  | 0.0153    |
| 1,000 items  | 6,476.90   | 0.1544    |
| 10,000 items | 642.06     | 1.5575    |

### Multiple Filters (2 filters)

| Dataset Size | ops/sec    | Mean (ms) |
|--------------|------------|-----------|
| 100 items    | 76,982.92  | 0.0130    |
| 1,000 items  | 7,392.50   | 0.1353    |
| 10,000 items | 740.98     | 1.3496    |

### Multiple Filters (All filters - 4 total)

| Dataset Size | ops/sec    | Mean (ms) |
|--------------|------------|-----------|
| 100 items    | 77,322.73  | 0.0129    |
| 1,000 items  | 7,436.87   | 0.1345    |
| 10,000 items | 751.74     | 1.3302    |

### Boolean Filters - OR

| Dataset Size | ops/sec    | Mean (ms) |
|--------------|------------|-----------|
| 100 items    | 67,160.63  | 0.0149    |
| 1,000 items  | 6,564.15   | 0.1523    |
| 10,000 items | 663.50     | 1.5072    |

### No Filters Applied

| Dataset Size | ops/sec    | Mean (ms) |
|--------------|------------|-----------|
| 100 items    | 68,043.73  | 0.0147    |
| 1,000 items  | 6,657.66   | 0.1502    |
| 10,000 items | 665.51     | 1.5026    |

## Key Observations

1. **Linear Scaling**: Performance scales roughly linearly with dataset size (~10x slower per 10x increase in data)
2. **Filter Overhead**: The "no filters applied" benchmark shows there's still overhead from iterating through the filter definitions
3. **String Operations**: The `contains` filter is the slowest primitive filter, likely due to string conversion and substring search
4. **Boolean Filters**: OR filters have similar performance to other filters, suggesting the condition checking is not a bottleneck
5. **Multiple Filters**: Surprisingly, applying all 4 filters is nearly as fast as applying 2 filters, suggesting early termination isn't happening often in the test data

## Optimization Opportunities

Based on the baseline metrics, potential areas for optimization:

1. **Early Exit**: Skip filter definition iteration when no filters are provided
2. **Field Value Caching**: Cache `entity[filterDef.field]` lookups
3. **Type Coercion**: Minimize `String()` and `Number()` conversions
4. **Filter Ordering**: Apply cheaper filters first (equals before contains)
5. **Object.entries**: Consider avoiding `Object.entries()` iteration overhead
