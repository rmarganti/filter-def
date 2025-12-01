import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";
import { drizzleFilter } from "../src";

// ----------------------------------------------------------------
// Table definition
// ----------------------------------------------------------------

const contactsTable = pgTable("contacts", {
    id: integer("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    linkedinUrl: text("linkedin_url"),
    notes: text("notes"),
    isVerified: boolean("is_verified").notNull(),
});

// ----------------------------------------------------------------
// Filter definition
// ----------------------------------------------------------------

const contactFilter = drizzleFilter(contactsTable).filterDef({
    // Primitive filters with inferred fields
    firstName: { kind: "eq" },
    lastName: { kind: "eq" },
    isVerified: { kind: "eq" },

    // Null check filters
    emailIsNull: { kind: "isNull", field: "email" },
    emailIsNotNull: { kind: "isNotNull", field: "email" },
    phoneIsNull: { kind: "isNull", field: "phone" },
    phoneIsNotNull: { kind: "isNotNull", field: "phone" },
    companyIsNull: { kind: "isNull", field: "company" },
    companyIsNotNull: { kind: "isNotNull", field: "company" },
    linkedinIsNull: { kind: "isNull", field: "linkedinUrl" },
    linkedinIsNotNull: { kind: "isNotNull", field: "linkedinUrl" },
    notesIsNull: { kind: "isNull", field: "notes" },

    // Contains filters for searching
    emailContains: { kind: "contains", field: "email" },
    companyContains: { kind: "contains", field: "company" },
});

// ----------------------------------------------------------------
// Examples: Basic null checks
// ----------------------------------------------------------------

console.log("=== Basic Null Checks ===\n");

// Find contacts with no email
const noEmailWhere = contactFilter({ emailIsNull: true });
console.log("✅ Contacts without email:", noEmailWhere?.toString());
// Generates: email IS NULL

// Find contacts with email
const hasEmailWhere = contactFilter({ emailIsNotNull: true });
console.log("✅ Contacts with email:", hasEmailWhere?.toString());
// Generates: email IS NOT NULL

// Find contacts with no phone (using isNull with true)
const noPhoneWhere = contactFilter({ phoneIsNull: true });
console.log("✅ Contacts without phone:", noPhoneWhere?.toString());
// Generates: phone IS NULL

// Find contacts with phone (using isNull with false inverts the check)
const hasPhoneInvertedWhere = contactFilter({ phoneIsNull: false });
console.log(
    "✅ Contacts with phone (inverted):",
    hasPhoneInvertedWhere?.toString(),
);
// Generates: phone IS NOT NULL

// ----------------------------------------------------------------
// Examples: Multiple nullable columns
// ----------------------------------------------------------------

console.log("\n=== Multiple Nullable Columns ===\n");

// Contacts with complete contact info (has both email and phone)
const completeContactInfoWhere = contactFilter({
    emailIsNotNull: true,
    phoneIsNotNull: true,
});
console.log(
    "✅ Contacts with both email and phone:",
    completeContactInfoWhere?.toString(),
);
// Generates: email IS NOT NULL AND phone IS NOT NULL

// Contacts missing any contact method
const noContactMethodsWhere = contactFilter({
    emailIsNull: true,
    phoneIsNull: true,
});
console.log(
    "✅ Contacts without email or phone:",
    noContactMethodsWhere?.toString(),
);
// Generates: email IS NULL AND phone IS NULL

// Contacts with professional profile (company and linkedin)
const professionalProfileWhere = contactFilter({
    companyIsNotNull: true,
    linkedinIsNotNull: true,
});
console.log(
    "✅ Contacts with company and LinkedIn:",
    professionalProfileWhere?.toString(),
);
// Generates: company IS NOT NULL AND linkedin_url IS NOT NULL

// ----------------------------------------------------------------
// Examples: Combining null checks with other filters
// ----------------------------------------------------------------

console.log("\n=== Null Checks + Other Filters ===\n");

// Verified contacts with email
const verifiedWithEmailWhere = contactFilter({
    isVerified: true,
    emailIsNotNull: true,
});
console.log(
    "✅ Verified contacts with email:",
    verifiedWithEmailWhere?.toString(),
);
// Generates: is_verified = true AND email IS NOT NULL

// Contacts at specific company with LinkedIn
const companyContactsWhere = contactFilter({
    companyContains: "Acme",
    linkedinIsNotNull: true,
    isVerified: true,
});
console.log(
    '✅ Verified "Acme" contacts with LinkedIn:',
    companyContactsWhere?.toString(),
);
// Generates: company LIKE '%Acme%' AND linkedin_url IS NOT NULL AND is_verified = true

// Search for contacts with email containing domain, has phone
const domainSearchWhere = contactFilter({
    emailContains: "@company.com",
    phoneIsNotNull: true,
});
console.log(
    "✅ Contacts with @company.com email and phone:",
    domainSearchWhere?.toString(),
);
// Generates: email LIKE '%@company.com%' AND phone IS NOT NULL

// ----------------------------------------------------------------
// Examples: Data quality filtering
// ----------------------------------------------------------------

console.log("\n=== Data Quality Filtering ===\n");

// Find incomplete profiles (missing required business info)
const incompleteProfilesWhere = contactFilter({
    companyIsNull: true,
    notesIsNull: true,
});
console.log(
    "✅ Incomplete profiles (no company, no notes):",
    incompleteProfilesWhere?.toString(),
);

// Find contacts needing verification outreach (unverified but has email)
const needsVerificationWhere = contactFilter({
    isVerified: false,
    emailIsNotNull: true,
});
console.log(
    "✅ Unverified contacts with email:",
    needsVerificationWhere?.toString(),
);

// Find contacts that can be reached (has at least verified and some contact method)
// Note: This uses AND logic, meaning both conditions must be true
const reachableContactsWhere = contactFilter({
    isVerified: true,
    phoneIsNotNull: true,
    emailIsNotNull: true,
});
console.log(
    "✅ Verified contacts with phone and email:",
    reachableContactsWhere?.toString(),
);

// ----------------------------------------------------------------
// Examples: Using boolean filter for OR null checks
// ----------------------------------------------------------------

console.log("\n=== OR Logic with Null Checks ===\n");

const contactFilterWithOr = drizzleFilter(contactsTable).filterDef({
    // Has any contact method (email OR phone is not null)
    hasAnyContactMethod: {
        kind: "or",
        conditions: [
            { kind: "isNotNull", field: "email" },
            { kind: "isNotNull", field: "phone" },
        ],
    },

    // Missing both contact methods (email AND phone are null)
    missingAllContactMethods: {
        kind: "and",
        conditions: [
            { kind: "isNull", field: "email" },
            { kind: "isNull", field: "phone" },
        ],
    },

    // Has professional presence (company OR linkedin)
    hasProfessionalPresence: {
        kind: "or",
        conditions: [
            { kind: "isNotNull", field: "company" },
            { kind: "isNotNull", field: "linkedinUrl" },
        ],
    },

    isVerified: { kind: "eq" },
});

// Find contacts with at least one contact method
const anyContactMethodWhere = contactFilterWithOr({
    hasAnyContactMethod: true,
});
console.log(
    "✅ Contacts with email OR phone:",
    anyContactMethodWhere?.toString(),
);
// Generates: email IS NOT NULL OR phone IS NOT NULL

// Find contacts missing all contact methods
const noContactMethodWhere = contactFilterWithOr({
    missingAllContactMethods: true,
});
console.log(
    "✅ Contacts without email AND phone:",
    noContactMethodWhere?.toString(),
);
// Generates: email IS NULL AND phone IS NULL

// Find verified contacts with professional presence
const verifiedProfessionalWhere = contactFilterWithOr({
    isVerified: true,
    hasProfessionalPresence: true,
});
console.log(
    "✅ Verified contacts with company or LinkedIn:",
    verifiedProfessionalWhere?.toString(),
);
// Generates: is_verified = true AND (company IS NOT NULL OR linkedin_url IS NOT NULL)

// ----------------------------------------------------------------
// Integration with Drizzle queries
// ----------------------------------------------------------------

// Example function: Find contacts for data cleanup
async function findContactsNeedingCleanup(
    db: any, // Replace with your actual db type
    options: {
        missingEmail?: boolean;
        missingPhone?: boolean;
        unverified?: boolean;
    },
) {
    const where = contactFilter({
        emailIsNull: options.missingEmail ? true : undefined,
        phoneIsNull: options.missingPhone ? true : undefined,
        isVerified: options.unverified ? false : undefined,
    });
    return db.select().from(contactsTable).where(where);
}

// Example function: Find contacts for outreach
async function findContactsForOutreach(
    db: any,
    options: {
        requireEmail: boolean;
        requirePhone: boolean;
        verifiedOnly: boolean;
    },
) {
    const where = contactFilter({
        emailIsNotNull: options.requireEmail ? true : undefined,
        phoneIsNotNull: options.requirePhone ? true : undefined,
        isVerified: options.verifiedOnly ? true : undefined,
    });
    return db.select().from(contactsTable).where(where);
}
