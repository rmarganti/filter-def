---
"@filter-def/bigquery": major
---

Generate safer SQL ([#50](https://github.com/rmarganti/filter-def/issues/50)).

- Custom filter SQL is wrapped in parentheses, so an `OR` inside it can't change the meaning of the rest of the query.
- Column names are quoted with backticks (`` `address`.`city` ``), so reserved words like `order` work.
- Param names are always valid and unique. Keys that used to collide (`a.b` and `a_b`, or `x` and `X`) now get a numeric suffix (`@a_b_2`). A custom filter that reuses a param name now throws instead of silently overwriting a value.
- `contains` escapes `%`, `_` and `\`, so the search text is matched literally.

**Breaking:** the generated SQL text changes, and so can some param names. Tests that compare SQL strings will need updating.
