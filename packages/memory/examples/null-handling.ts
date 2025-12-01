import { inMemoryFilter, makeFilterHelpers } from "@filter-def/memory";

// ----------------------------------------------------------------
// Models
// ----------------------------------------------------------------

interface Contact {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    company: string | null;
    notes: string | null;
    lastContactedAt: Date | null;
}

// ----------------------------------------------------------------
// Sample data
// ----------------------------------------------------------------

const now = new Date();
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

const contacts: Contact[] = [
    {
        id: "1",
        name: "Alice Johnson",
        email: "alice@example.com",
        phone: "555-0101",
        address: "123 Main St",
        company: "TechCorp",
        notes: "Prefers email communication",
        lastContactedAt: oneWeekAgo,
    },
    {
        id: "2",
        name: "Bob Smith",
        email: "bob@example.com",
        phone: null,
        address: null,
        company: "StartupXYZ",
        notes: null,
        lastContactedAt: oneMonthAgo,
    },
    {
        id: "3",
        name: "Charlie Brown",
        email: null,
        phone: "555-0103",
        address: "789 Oak Ave",
        company: null,
        notes: "Call only after 2pm",
        lastContactedAt: null,
    },
    {
        id: "4",
        name: "Diana Prince",
        email: null,
        phone: null,
        address: null,
        company: null,
        notes: null,
        lastContactedAt: null,
    },
    {
        id: "5",
        name: "Eve Anderson",
        email: "eve@example.com",
        phone: "555-0105",
        address: null,
        company: "ConsultCo",
        notes: "VIP client",
        lastContactedAt: oneWeekAgo,
    },
    {
        id: "6",
        name: "Frank Miller",
        email: "frank@example.com",
        phone: null,
        address: "456 Pine Rd",
        company: null,
        notes: null,
        lastContactedAt: oneMonthAgo,
    },
];

// ----------------------------------------------------------------
// Filter definition
// ----------------------------------------------------------------

const contactFilter = inMemoryFilter<Contact>().filterDef({
    // Standard filters
    id: { kind: "eq" },
    name: { kind: "eq" },
    nameContains: { kind: "contains", field: "name" },
    company: { kind: "eq" },

    // Null check filters
    hasEmail: { kind: "isNotNull", field: "email" },
    hasPhone: { kind: "isNotNull", field: "phone" },
    hasAddress: { kind: "isNotNull", field: "address" },
    hasCompany: { kind: "isNotNull", field: "company" },
    hasNotes: { kind: "isNotNull", field: "notes" },
    hasBeenContacted: { kind: "isNotNull", field: "lastContactedAt" },

    // Alternative null checks (using isNull)
    missingEmail: { kind: "isNull", field: "email" },
    missingPhone: { kind: "isNull", field: "phone" },
    missingAddress: { kind: "isNull", field: "address" },

    // Custom filter: Has at least one contact method
    isContactable: (contact: Contact, shouldBe: boolean) => {
        const hasContactMethod =
            contact.email !== null || contact.phone !== null;
        return shouldBe ? hasContactMethod : !hasContactMethod;
    },

    // Custom filter: Has complete information
    isComplete: (contact: Contact, shouldBe: boolean) => {
        const isComplete =
            contact.email !== null &&
            contact.phone !== null &&
            contact.address !== null &&
            contact.company !== null;
        return shouldBe ? isComplete : !isComplete;
    },

    // Custom filter: Missing count threshold
    missingFieldsCount: (contact: Contact, maxMissing: number) => {
        const missingCount = [
            contact.email,
            contact.phone,
            contact.address,
            contact.company,
            contact.notes,
        ].filter((field) => field === null).length;
        return missingCount <= maxMissing;
    },
});

const {
    filter: filterContacts,
    some: someContacts,
    every: everyContact,
} = makeFilterHelpers(contactFilter);

// ----------------------------------------------------------------
// Example 1: Basic null checks
// ----------------------------------------------------------------

console.log("=== Basic Null Checks ===\n");

const contactsWithEmail = filterContacts(contacts, {
    hasEmail: true,
});
console.log("✅ Contacts with email:", contactsWithEmail.length);

const contactsWithoutEmail = filterContacts(contacts, {
    hasEmail: false,
});
console.log("✅ Contacts without email:", contactsWithoutEmail.length);

const contactsWithPhone = filterContacts(contacts, {
    hasPhone: true,
});
console.log("✅ Contacts with phone:", contactsWithPhone.length);

// ----------------------------------------------------------------
// Example 2: Using isNull vs isNotNull
// ----------------------------------------------------------------

console.log("\n=== isNull vs isNotNull ===\n");

// Using isNotNull
const withAddress1 = filterContacts(contacts, {
    hasAddress: true,
});

// Using isNull with false
const withAddress2 = filterContacts(contacts, {
    missingAddress: false,
});

console.log("✅ Using isNotNull:", withAddress1.length);
console.log("✅ Using isNull with false:", withAddress2.length);
console.log("✅ Results match:", withAddress1.length === withAddress2.length);

// ----------------------------------------------------------------
// Example 3: Multiple null checks (AND logic)
// ----------------------------------------------------------------

console.log("\n=== Multiple Field Checks ===\n");

const fullyContactable = filterContacts(contacts, {
    hasEmail: true,
    hasPhone: true,
});
console.log("✅ Contacts with both email and phone:", fullyContactable.length);
for (const c of fullyContactable) {
    console.log(`  - ${c.name}: ${c.email}, ${c.phone}`);
}

const partialInfo = filterContacts(contacts, {
    hasEmail: true,
    missingPhone: true,
});
console.log("\n✅ Contacts with email but no phone:", partialInfo.length);
for (const c of partialInfo) {
    console.log(`  - ${c.name}: ${c.email}`);
}

// ----------------------------------------------------------------
// Example 4: Combining null checks with other filters
// ----------------------------------------------------------------

console.log("\n=== Null Checks + Other Filters ===\n");

const corporateContactsWithPhone = filterContacts(contacts, {
    hasCompany: true,
    hasPhone: true,
});
console.log("✅ Corporate contacts with phone number:");
for (const c of corporateContactsWithPhone) {
    console.log(`  - ${c.name} (${c.company}): ${c.phone}`);
}

const recentlyContactedWithEmail = filterContacts(contacts, {
    hasBeenContacted: true,
    hasEmail: true,
});
console.log(
    "\n✅ Previously contacted people with email:",
    recentlyContactedWithEmail.length,
);

// ----------------------------------------------------------------
// Example 5: Finding incomplete records
// ----------------------------------------------------------------

console.log("\n=== Incomplete Records ===\n");

const missingContactInfo = filterContacts(contacts, {
    missingEmail: true,
    missingPhone: true,
});
console.log("✅ Contacts missing both email and phone:");
for (const c of missingContactInfo) {
    console.log(`  - ${c.name}`);
}

const neverContacted = filterContacts(contacts, {
    hasBeenContacted: false,
});
console.log("\n✅ Contacts never reached:");
for (const c of neverContacted) {
    console.log(`  - ${c.name}`);
}

// ----------------------------------------------------------------
// Example 6: Using custom filters with null logic
// ----------------------------------------------------------------

console.log("\n=== Custom Null Logic ===\n");

const contactablePeople = filterContacts(contacts, {
    isContactable: true,
});
console.log(
    "✅ Contactable people (email or phone):",
    contactablePeople.length,
);

const notContactable = filterContacts(contacts, {
    isContactable: false,
});
console.log("✅ Not contactable (no email or phone):");
for (const c of notContactable) {
    console.log(`  - ${c.name}`);
}

const completeProfiles = filterContacts(contacts, {
    isComplete: true,
});
console.log(
    "\n✅ Complete profiles (all fields filled):",
    completeProfiles.length,
);
for (const c of completeProfiles) {
    console.log(`  - ${c.name} (${c.company})`);
}

// ----------------------------------------------------------------
// Example 7: Data quality filtering
// ----------------------------------------------------------------

console.log("\n=== Data Quality Filtering ===\n");

const goodQuality = filterContacts(contacts, {
    missingFieldsCount: 1,
});
console.log("✅ High quality records (≤1 missing field):");
for (const c of goodQuality) {
    const missing = [
        !c.email && "email",
        !c.phone && "phone",
        !c.address && "address",
        !c.company && "company",
        !c.notes && "notes",
    ].filter(Boolean);
    console.log(
        `  - ${c.name}${missing.length > 0 ? ` (missing: ${missing.join(", ")})` : " (complete)"}`,
    );
}

const needsAttention = filterContacts(contacts, {
    isContactable: true,
    hasBeenContacted: false,
});
console.log("\n✅ Contactable but never contacted:");
for (const c of needsAttention) {
    console.log(`  - ${c.name}`);
}

// ----------------------------------------------------------------
// Example 8: Complex multi-field null scenarios
// ----------------------------------------------------------------

console.log("\n=== Complex Scenarios ===\n");

// Contacts with email but incomplete profile
const emailButIncomplete = filterContacts(contacts, {
    hasEmail: true,
    isComplete: false,
});
console.log("✅ Has email but profile incomplete:", emailButIncomplete.length);

// Corporate contacts needing profile completion
const corporateIncomplete = filterContacts(contacts, {
    hasCompany: true,
    missingPhone: true,
});
console.log("✅ Corporate contacts missing phone:", corporateIncomplete.length);

// Contacts worth following up (contactable, has notes, not recently contacted)
const followUpCandidates = filterContacts(contacts, {
    isContactable: true,
    hasNotes: true,
});
console.log("\n✅ Follow-up candidates (contactable with notes):");
for (const c of followUpCandidates) {
    console.log(`  - ${c.name}: "${c.notes}"`);
}

// ----------------------------------------------------------------
// Example 9: Using some/every with null checks
// ----------------------------------------------------------------

console.log("\n=== Collection Checks ===\n");

const hasAnyUncontactable = someContacts(contacts, {
    isContactable: false,
});
console.log("✅ Has uncontactable records:", hasAnyUncontactable);

const allHaveEmail = everyContact(contacts, {
    hasEmail: true,
});
console.log("✅ All contacts have email:", allHaveEmail);

const allContactable = everyContact(contacts, {
    isContactable: true,
});
console.log("✅ All contacts are contactable:", allContactable);

// ----------------------------------------------------------------
// Example 10: Real-world data cleanup scenario
// ----------------------------------------------------------------

console.log("\n=== Data Cleanup Recommendations ===\n");

const criticalMissing = filterContacts(contacts, {
    missingEmail: true,
    missingPhone: true,
    hasBeenContacted: false,
});

const minorMissing = filterContacts(contacts, {
    isContactable: true,
    missingFieldsCount: 2,
});

console.log("🔴 CRITICAL: No contact method");
for (const c of criticalMissing) {
    console.log(`  - ${c.name}`);
}

console.log("\n🟡 MINOR: Contactable but missing other fields");
for (const c of minorMissing) {
    const missing = [
        !c.address && "address",
        !c.company && "company",
        !c.notes && "notes",
    ].filter(Boolean);
    console.log(`  - ${c.name} (missing: ${missing.join(", ")})`);
}

console.log(
    `\n📊 Summary: ${criticalMissing.length} critical, ${minorMissing.length} minor issues`,
);
