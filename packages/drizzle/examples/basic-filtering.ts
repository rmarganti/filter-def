import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";
import { drizzleFilter } from "../src";

// ----------------------------------------------------------------
// Table definition
// ----------------------------------------------------------------

const productsTable = pgTable("products", {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    price: integer("price").notNull(),
    category: text("category").notNull(),
    inStock: boolean("in_stock").notNull(),
});

// ----------------------------------------------------------------
// Filter definition
// ----------------------------------------------------------------

const productFilter = drizzleFilter(productsTable).filterDef({
    // Field names match column names, so `field` is inferred
    id: { kind: "eq" },
    category: { kind: "eq" },
    inStock: { kind: "eq" },

    // Explicit field names when filter key differs
    nameContains: { kind: "contains", field: "name" },
    minPrice: { kind: "gte", field: "price" },
    maxPrice: { kind: "lte", field: "price" },
});

// ----------------------------------------------------------------
// Examples
// ----------------------------------------------------------------

// Single field filter
const inStockWhere = productFilter({ inStock: true });
console.log("✅ In stock filter:", inStockWhere?.toString());
// Usage: await db.select().from(productsTable).where(inStockWhere);

// Multiple field filter (combined with AND logic)
const affordableElectronicsWhere = productFilter({
    category: "electronics",
    maxPrice: 500,
    inStock: true,
});
console.log(
    "✅ Affordable in-stock electronics filter:",
    affordableElectronicsWhere?.toString(),
);
// Usage: await db.select().from(productsTable).where(affordableElectronicsWhere);

// Price range filter (multiple fields on same column)
const midRangeWhere = productFilter({
    minPrice: 200,
    maxPrice: 500,
});
console.log(
    "✅ Mid-range products filter ($200-$500):",
    midRangeWhere?.toString(),
);
// Usage: await db.select().from(productsTable).where(midRangeWhere);

// Text search with other criteria
const searchWhere = productFilter({
    nameContains: "phone",
    inStock: true,
    minPrice: 300,
});
console.log(
    '✅ In-stock products with "phone" in name, over $300:',
    searchWhere?.toString(),
);
// Usage: await db.select().from(productsTable).where(searchWhere);

// Empty filter returns undefined
const emptyWhere = productFilter({});
console.log("✅ Empty filter returns:", emptyWhere);
// Usage: const where = productFilter(input); // where may be undefined
//        await db.select().from(productsTable).where(where);

// Undefined input returns undefined
const undefinedWhere = productFilter();
console.log("✅ Undefined input returns:", undefinedWhere);
