import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";
import { drizzleFilter } from "../src";

// ----------------------------------------------------------------
// Table definition
// ----------------------------------------------------------------

const usersTable = pgTable("users", {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    role: text("role").notNull(), // "admin" | "user" | "guest"
    isActive: boolean("is_active").notNull(),
});

// ----------------------------------------------------------------
// Filter definition
// ----------------------------------------------------------------

const userFilter = drizzleFilter(usersTable).filterDef({
    // Primitive filters with inferred fields
    role: { kind: "eq" },
    isActive: { kind: "eq" },

    // Boolean filter: Search across multiple columns with OR
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

    // Boolean filter: Must match ALL conditions (strict matching)
    strictMatch: {
        kind: "and",
        conditions: [
            { kind: "eq", field: "isActive" },
            { kind: "contains", field: "email" },
        ],
    },

    // Boolean filter: Age range using AND
    ageRange: {
        kind: "and",
        conditions: [
            { kind: "gte", field: "id" }, // Using id as a stand-in for numeric range
            { kind: "lte", field: "id" },
        ],
    },
});

// ----------------------------------------------------------------
// Examples
// ----------------------------------------------------------------

// OR logic: Search by name or email
const searchWhere = userFilter({
    searchTerm: "company",
});
console.log(
    '✅ Users with "company" in name or email:',
    searchWhere?.toString(),
);
// Generates: name LIKE '%company%' OR email LIKE '%company%'

// OR logic combined with other filters (multiple fields)
const activeCompanyUsersWhere = userFilter({
    searchTerm: "company",
    isActive: true,
    role: "user",
});
console.log(
    '✅ Active users with "company" in name/email:',
    activeCompanyUsersWhere?.toString(),
);
// Generates: (name LIKE '%company%' OR email LIKE '%company%') AND is_active = true AND role = 'user'

// OR logic: Company email OR has phone number
const contactableWhere = userFilter({
    companyContactable: "@company.com",
});
console.log(
    "✅ Users with company email or phone:",
    contactableWhere?.toString(),
);
// Generates: email LIKE '%@company.com%' OR phone IS NOT NULL

// Multiple boolean filters together
const advancedWhere = userFilter({
    searchTerm: "e", // "e" in name or email
    companyContactable: "@company.com", // Company email OR phone exists
    isActive: true,
});
console.log("✅ Advanced multi-criteria search:", advancedWhere?.toString());
// Generates: (name LIKE '%e%' OR email LIKE '%e%') AND (email LIKE '%@company.com%' OR phone IS NOT NULL) AND is_active = true

// AND logic: Must be active AND have company email
const strictWhere = userFilter({
    strictMatch: true,
});
console.log(
    "✅ Strict match (active AND company email):",
    strictWhere?.toString(),
);
// Generates: is_active = true AND email LIKE '%true%'
// Note: Boolean filters apply the same value to all conditions

// Combining multiple primitive filters (implicit AND)
const adminSearchWhere = userFilter({
    role: "admin",
    isActive: true,
    searchTerm: "e",
});
console.log(
    '✅ Active admins with "e" in name/email:',
    adminSearchWhere?.toString(),
);
// Generates: role = 'admin' AND is_active = true AND (name LIKE '%e%' OR email LIKE '%e%')

// Empty filter returns undefined
const emptyWhere = userFilter({});
console.log("✅ Empty filter returns:", emptyWhere);

// ----------------------------------------------------------------
// Additional examples: Complex boolean combinations
// ----------------------------------------------------------------

const complexFilter = drizzleFilter(usersTable).filterDef({
    // Search in name, email, or phone
    globalSearch: {
        kind: "or",
        conditions: [
            { kind: "contains", field: "name" },
            { kind: "contains", field: "email" },
            { kind: "contains", field: "phone" },
        ],
    },

    // Specific roles OR active status
    accessibleUsers: {
        kind: "or",
        conditions: [
            { kind: "eq", field: "role" },
            { kind: "eq", field: "isActive" },
        ],
    },
});

const globalSearchWhere = complexFilter({
    globalSearch: "john",
});
console.log(
    "✅ Global search across name/email/phone:",
    globalSearchWhere?.toString(),
);
// Generates: name LIKE '%john%' OR email LIKE '%john%' OR phone LIKE '%john%'

// ----------------------------------------------------------------
// Integration with Drizzle queries
// ----------------------------------------------------------------

// Example function showing how to use boolean filters in actual queries
async function searchUsers(
    db: any, // Replace with your actual db type
    filters: Parameters<typeof userFilter>[0],
) {
    const where = userFilter(filters);
    return db.select().from(usersTable).where(where);
}

// Example: Find users by search term with role filter
async function findUsersByRole(
    db: any,
    searchTerm: string,
    role: string,
    activeOnly: boolean,
) {
    const where = userFilter({
        searchTerm,
        role,
        isActive: activeOnly ? true : undefined,
    });
    return db.select().from(usersTable).where(where);
}
