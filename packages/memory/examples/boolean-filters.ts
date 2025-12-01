import { inMemoryFilter } from "@filter-def/memory";

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

interface User {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: "admin" | "user" | "guest";
    isActive: boolean;
}

// ----------------------------------------------------------------
// Sample data
// ----------------------------------------------------------------

const users: User[] = [
    {
        id: "1",
        name: "Alice Johnson",
        email: "alice@company.com",
        phone: "555-0101",
        role: "admin",
        isActive: true,
    },
    {
        id: "2",
        name: "Bob Smith",
        email: "bob@external.org",
        phone: null,
        role: "user",
        isActive: true,
    },
    {
        id: "3",
        name: "Charlie Brown",
        email: "charlie@company.com",
        phone: "555-0103",
        role: "user",
        isActive: false,
    },
    {
        id: "4",
        name: "Diana Prince",
        email: "diana@external.org",
        phone: "555-0104",
        role: "guest",
        isActive: true,
    },
    {
        id: "5",
        name: "Eve Anderson",
        email: "eve@company.com",
        phone: null,
        role: "admin",
        isActive: true,
    },
];

// ----------------------------------------------------------------
// Filter definition
// ----------------------------------------------------------------

const userFilter = inMemoryFilter<User>().filterDef({
    // Primitive filters with inferred fields
    role: { kind: "eq" },
    isActive: { kind: "eq" },

    // Boolean filter: Search across multiple fields with OR
    // Note: All conditions must have explicit `field` properties
    searchTerm: {
        kind: "or",
        conditions: [
            { kind: "contains", field: "name" },
            { kind: "contains", field: "email" },
        ],
    },

    // Boolean filter: Match email domain OR phone existence
    companyContactable: {
        kind: "or",
        conditions: [
            { kind: "contains", field: "email" },
            { kind: "isNotNull", field: "phone" },
        ],
    },

    // Boolean filter: Must match ALL conditions
    strictMatch: {
        kind: "and",
        conditions: [
            { kind: "eq", field: "isActive" },
            { kind: "contains", field: "email" },
        ],
    },
});

// ----------------------------------------------------------------
// Examples
// ----------------------------------------------------------------

// OR logic: Search by name or email
const searchPredicate = userFilter({
    searchTerm: "company",
});
const companyUsers = users.filter(searchPredicate);
console.log('✅ Users with "company" in name or email:', companyUsers);

// OR logic combined with other filters (multiple fields)
const activeCompanyUsersPredicate = userFilter({
    searchTerm: "company",
    isActive: true,
    role: "user",
});
const activeCompanyUsers = users.filter(activeCompanyUsersPredicate);
console.log(
    '✅ Active users with "company" in name/email:',
    activeCompanyUsers,
);

// OR logic: Company email OR has phone number
const contactablePredicate = userFilter({
    companyContactable: "@company.com",
});
const contactableUsers = users.filter(contactablePredicate);
console.log("✅ Users with company email or phone:", contactableUsers);

// Multiple boolean filters together
const advancedPredicate = userFilter({
    searchTerm: "e", // "e" in name or email
    companyContactable: "@company.com", // Company email OR phone exists
    isActive: true,
});
const advancedResults = users.filter(advancedPredicate);
console.log("✅ Advanced multi-criteria search:", advancedResults);

// AND logic: Must be active AND have company email
const strictPredicate = userFilter({
    strictMatch: true,
});
const strictResults = users.filter(strictPredicate);
console.log("✅ Strict match (active AND company email):", strictResults);

// Combining multiple primitive filters (implicit AND)
const adminSearchPredicate = userFilter({
    role: "admin",
    isActive: true,
    searchTerm: "e",
});
const activeAdmins = users.filter(adminSearchPredicate);
console.log('✅ Active admins with "e" in name/email:', activeAdmins);
