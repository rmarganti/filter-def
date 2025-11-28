import { entity } from "@filter-def/memory";

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    inStock: boolean;
}

// ----------------------------------------------------------------
// Sample data
// ----------------------------------------------------------------

const products: Product[] = [
    {
        id: "1",
        name: "Laptop",
        price: 999,
        category: "electronics",
        inStock: true,
    },
    {
        id: "2",
        name: "Phone",
        price: 699,
        category: "electronics",
        inStock: true,
    },
    {
        id: "3",
        name: "Desk",
        price: 299,
        category: "furniture",
        inStock: false,
    },
    {
        id: "4",
        name: "Chair",
        price: 149,
        category: "furniture",
        inStock: true,
    },
    {
        id: "5",
        name: "Monitor",
        price: 399,
        category: "electronics",
        inStock: false,
    },
];

// ----------------------------------------------------------------
// Filter definition
// ----------------------------------------------------------------

const productFilter = entity<Product>().filterDef({
    // Field names match entity properties, so `field` is inferred
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
const inStockPredicate = productFilter({ inStock: true });
const inStockProducts = products.filter(inStockPredicate);
console.log("✅ In stock products:", inStockProducts.length);

// Multiple field filter (combined with AND logic)
const affordableElectronicsPredicate = productFilter({
    category: "electronics",
    maxPrice: 500,
    inStock: true,
});
const affordableElectronics = products.filter(affordableElectronicsPredicate);
console.log("✅ Affordable in-stock electronics:", affordableElectronics);

// Price range filter (multiple fields on same entity property)
const midRangePredicate = productFilter({
    minPrice: 200,
    maxPrice: 500,
});
const midRangeProducts = products.filter(midRangePredicate);
console.log("✅ Mid-range products ($200-$500):", midRangeProducts);

// Text search with other criteria
const searchPredicate = productFilter({
    nameContains: "o", // Products with "o" in name
    inStock: true,
    minPrice: 300,
});
const searchResults = products.filter(searchPredicate);
console.log('✅ In-stock products with "o" in name, over $300:', searchResults);

// Using with other array methods
const firstAffordableChair = products.find(
    productFilter({
        nameContains: "Chair",
        maxPrice: 200,
    }),
);
console.log("✅ First affordable chair:", firstAffordableChair);

const hasExpensiveElectronics = products.some(
    productFilter({
        category: "electronics",
        minPrice: 900,
    }),
);
console.log("✅ Has expensive electronics:", hasExpensiveElectronics);
