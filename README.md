# Philter

Easily define and execute data filters for your data.

```typescript
import { entity } from 'philter';
import type { InputForFilter } from 'philter';

interface User {
    name: string;
    email: string;
    age: number;
}

const filterUsers = entity<User>().philter({
    name: { kind: 'eq' },
    emailContains: { kind: 'eq', field: 'email' },
    olderThan: { kind: 'gt', field: 'age' },
});

type UserFilterInput = InputForFilter<typeof filterUsers>;

const filteredUser = filterUsers(users, {
    name: 'John',
    emailContains: '@example.com',
    olderThan: 25,
});
```
