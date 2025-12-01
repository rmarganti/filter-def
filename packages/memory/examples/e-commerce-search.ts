import { inMemoryFilter, makeFilterHelpers } from "@filter-def/memory";

// ----------------------------------------------------------------
// Models
// ----------------------------------------------------------------

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    originalPrice: number;
    category: string;
    brand: string;
    inStock: boolean;
    rating: number;
    reviewCount: number;
    tags: string[];
    color: string;
    size: string;
    createdAt: Date;
}

// ----------------------------------------------------------------
// Sample data
// ----------------------------------------------------------------

const now = new Date();
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

const products: Product[] = [
    {
        id: "1",
        name: "Wireless Bluetooth Headphones",
        description:
            "Premium noise-canceling headphones with 30-hour battery life",
        price: 149.99,
        originalPrice: 199.99,
        category: "electronics",
        brand: "AudioTech",
        inStock: true,
        rating: 4.5,
        reviewCount: 328,
        tags: ["wireless", "bluetooth", "noise-canceling"],
        color: "black",
        size: "one-size",
        createdAt: oneWeekAgo,
    },
    {
        id: "2",
        name: "Running Shoes",
        description: "Lightweight athletic shoes for daily training",
        price: 89.99,
        originalPrice: 89.99,
        category: "shoes",
        brand: "SportFit",
        inStock: true,
        rating: 4.2,
        reviewCount: 156,
        tags: ["sports", "running", "athletic"],
        color: "blue",
        size: "10",
        createdAt: oneMonthAgo,
    },
    {
        id: "3",
        name: "Leather Wallet",
        description: "Handcrafted genuine leather bifold wallet",
        price: 45.0,
        originalPrice: 65.0,
        category: "accessories",
        brand: "CraftCo",
        inStock: false,
        rating: 4.8,
        reviewCount: 89,
        tags: ["leather", "handmade", "gift"],
        color: "brown",
        size: "standard",
        createdAt: oneMonthAgo,
    },
    {
        id: "4",
        name: "Smart Watch",
        description: "Fitness tracking smartwatch with heart rate monitor",
        price: 199.99,
        originalPrice: 249.99,
        category: "electronics",
        brand: "TechWear",
        inStock: true,
        rating: 4.3,
        reviewCount: 412,
        tags: ["smartwatch", "fitness", "health"],
        color: "silver",
        size: "adjustable",
        createdAt: oneWeekAgo,
    },
    {
        id: "5",
        name: "Yoga Mat",
        description: "Eco-friendly non-slip yoga mat with carrying strap",
        price: 34.99,
        originalPrice: 34.99,
        category: "sports",
        brand: "ZenFit",
        inStock: true,
        rating: 4.6,
        reviewCount: 203,
        tags: ["yoga", "fitness", "eco-friendly"],
        color: "purple",
        size: "standard",
        createdAt: oneMonthAgo,
    },
    {
        id: "6",
        name: "Wireless Earbuds",
        description: "Compact true wireless earbuds with charging case",
        price: 79.99,
        originalPrice: 99.99,
        category: "electronics",
        brand: "AudioTech",
        inStock: true,
        rating: 4.1,
        reviewCount: 267,
        tags: ["wireless", "bluetooth", "compact"],
        color: "white",
        size: "one-size",
        createdAt: oneWeekAgo,
    },
    {
        id: "7",
        name: "Cotton T-Shirt",
        description: "Soft organic cotton t-shirt in classic fit",
        price: 24.99,
        originalPrice: 29.99,
        category: "clothing",
        brand: "EcoWear",
        inStock: true,
        rating: 4.4,
        reviewCount: 145,
        tags: ["cotton", "organic", "casual"],
        color: "navy",
        size: "L",
        createdAt: oneMonthAgo,
    },
    {
        id: "8",
        name: "Stainless Steel Water Bottle",
        description: "Insulated water bottle keeps drinks cold for 24 hours",
        price: 29.99,
        originalPrice: 39.99,
        category: "accessories",
        brand: "HydroLife",
        inStock: false,
        rating: 4.7,
        reviewCount: 534,
        tags: ["insulated", "eco-friendly", "sports"],
        color: "black",
        size: "750ml",
        createdAt: oneWeekAgo,
    },
];

// ----------------------------------------------------------------
// Filter definition
// ----------------------------------------------------------------

const productFilter = inMemoryFilter<Product>().filterDef({
    // Exact match filters
    id: { kind: "eq" },
    category: { kind: "eq" },
    brand: { kind: "eq" },
    inStock: { kind: "eq" },
    color: { kind: "eq" },
    size: { kind: "eq" },

    // Text search filters
    searchTerm: {
        kind: "or",
        conditions: [
            { kind: "contains", field: "name" },
            { kind: "contains", field: "description" },
        ],
    },
    nameContains: { kind: "contains", field: "name" },

    // Price range filters
    minPrice: { kind: "gte", field: "price" },
    maxPrice: { kind: "lte", field: "price" },

    // Rating filters
    minRating: { kind: "gte", field: "rating" },

    // Array filters
    categories: { kind: "inArray", field: "category" },
    brands: { kind: "inArray", field: "brand" },

    // Custom filter: Check if product has discount
    onSale: (product: Product, isOnSale: boolean) => {
        const hasDiscount = product.price < product.originalPrice;
        return isOnSale ? hasDiscount : !hasDiscount;
    },

    // Custom filter: Discount percentage
    minDiscountPercent: (product: Product, minPercent: number) => {
        const discount =
            ((product.originalPrice - product.price) / product.originalPrice) *
            100;
        return discount >= minPercent;
    },

    // Custom filter: Popular products (high rating + many reviews)
    isPopular: (product: Product, threshold: boolean) => {
        if (!threshold) return true;
        return product.rating >= 4.5 && product.reviewCount >= 200;
    },

    // Custom filter: New arrivals
    newArrival: (product: Product, daysThreshold: number) => {
        const cutoffDate = new Date(
            now.getTime() - daysThreshold * 24 * 60 * 60 * 1000,
        );
        return product.createdAt >= cutoffDate;
    },

    // Custom filter: Has specific tag
    hasTag: (product: Product, tag: string) => {
        return product.tags.includes(tag);
    },

    // Custom filter: Value for money (rating / price ratio)
    minValueScore: (product: Product, minScore: number) => {
        const valueScore = product.rating / product.price;
        return valueScore >= minScore;
    },
});

const { filter: filterProducts, some: someProducts } =
    makeFilterHelpers(productFilter);

// ----------------------------------------------------------------
// Example 1: Basic search with multiple criteria
// ----------------------------------------------------------------

console.log("=== Basic Product Search ===\n");

const basicSearchResults = filterProducts(products, {
    category: "electronics",
    inStock: true,
    minRating: 4.0,
});

console.log(
    "✅ In-stock electronics with rating ≥4.0:",
    basicSearchResults.length,
);
for (const p of basicSearchResults) {
    console.log(`  - ${p.name} (${p.rating}⭐)`);
}

// ----------------------------------------------------------------
// Example 2: Price range filtering
// ----------------------------------------------------------------

console.log("\n=== Price Range Search ===\n");

const affordableProducts = filterProducts(products, {
    minPrice: 20,
    maxPrice: 50,
    inStock: true,
});

console.log("✅ Products between $20-$50 in stock:", affordableProducts.length);
for (const p of affordableProducts) {
    console.log(`  - ${p.name}: $${p.price.toFixed(2)}`);
}

// ----------------------------------------------------------------
// Example 3: Multi-field text search
// ----------------------------------------------------------------

console.log("\n=== Text Search ===\n");

const wirelessProducts = filterProducts(products, {
    searchTerm: "wireless",
    inStock: true,
});

console.log('✅ In-stock products with "wireless" in name/description:');
for (const p of wirelessProducts) {
    console.log(`  - ${p.name}`);
}

// ----------------------------------------------------------------
// Example 4: Sale/Discount filtering
// ----------------------------------------------------------------

console.log("\n=== Sale Items ===\n");

const saleItems = filterProducts(products, {
    onSale: true,
    minDiscountPercent: 20,
    inStock: true,
});

console.log("✅ Sale items with ≥20% discount (in stock):", saleItems.length);
for (const p of saleItems) {
    const discount = (
        ((p.originalPrice - p.price) / p.originalPrice) *
        100
    ).toFixed(0);
    console.log(
        `  - ${p.name}: $${p.price} (${discount}% off, was $${p.originalPrice})`,
    );
}

// ----------------------------------------------------------------
// Example 5: Category + Brand filtering
// ----------------------------------------------------------------

console.log("\n=== Brand Search ===\n");

const audioTechProducts = filterProducts(products, {
    brand: "AudioTech",
    category: "electronics",
    inStock: true,
    minRating: 4.0,
});

console.log("✅ AudioTech electronics in stock with rating ≥4.0:");
for (const p of audioTechProducts) {
    console.log(`  - ${p.name} ($${p.price})`);
}

// ----------------------------------------------------------------
// Example 6: Popular products
// ----------------------------------------------------------------

console.log("\n=== Popular Products ===\n");

const popularProducts = filterProducts(products, {
    isPopular: true,
    inStock: true,
});

console.log("✅ Popular in-stock products (rating ≥4.5, reviews ≥200):");
for (const p of popularProducts) {
    console.log(`  - ${p.name}: ${p.rating}⭐ (${p.reviewCount} reviews)`);
}

// ----------------------------------------------------------------
// Example 7: New arrivals with filters
// ----------------------------------------------------------------

console.log("\n=== New Arrivals ===\n");

const newProducts = filterProducts(products, {
    newArrival: 14,
    inStock: true,
    minRating: 4.0,
});

console.log("✅ New arrivals (last 14 days, in stock, rating ≥4.0):");
for (const p of newProducts) {
    console.log(`  - ${p.name}`);
}

// ----------------------------------------------------------------
// Example 8: Advanced multi-criteria search
// ----------------------------------------------------------------

console.log("\n=== Advanced Search ===\n");

const premiumDeals = filterProducts(products, {
    categories: ["electronics", "accessories"],
    minRating: 4.5,
    onSale: true,
    inStock: true,
    maxPrice: 200,
});

console.log("✅ Premium deals (electronics/accessories on sale):");
premiumDeals.forEach((p) => {
    const discount = (
        ((p.originalPrice - p.price) / p.originalPrice) *
        100
    ).toFixed(0);
    console.log(`  - ${p.name}: $${p.price} (${discount}% off, ${p.rating}⭐)`);
});

// ----------------------------------------------------------------
// Example 9: Best value products
// ----------------------------------------------------------------

console.log("\n=== Best Value Products ===\n");

const bestValue = filterProducts(products, {
    minValueScore: 0.05,
    inStock: true,
    minRating: 4.0,
});

console.log("✅ Best value products (high rating/price ratio):");
bestValue.forEach((p) => {
    const valueScore = (p.rating / p.price).toFixed(3);
    console.log(`  - ${p.name}: $${p.price} (value score: ${valueScore})`);
});

// ----------------------------------------------------------------
// Example 10: Tag-based filtering with other criteria
// ----------------------------------------------------------------

console.log("\n=== Tag-Based Search ===\n");

const ecoFriendlyProducts = filterProducts(products, {
    hasTag: "eco-friendly",
    inStock: true,
    maxPrice: 50,
});

console.log("✅ Eco-friendly products under $50 (in stock):");
for (const p of ecoFriendlyProducts) {
    console.log(`  - ${p.name}: $${p.price}`);
}

// ----------------------------------------------------------------
// Example 11: Complex real-world scenario
// ----------------------------------------------------------------

console.log("\n=== Personalized Recommendations ===\n");

// User preferences: fitness enthusiast, budget-conscious, values ratings
const recommendations = filterProducts(products, {
    searchTerm: "fitness",
    maxPrice: 100,
    minRating: 4.2,
    inStock: true,
});

console.log("✅ Recommended for fitness enthusiast (budget-friendly):");
for (const p of recommendations) {
    console.log(
        `  - ${p.name}: $${p.price} (${p.rating}⭐, ${p.reviewCount} reviews)`,
    );
}

// ----------------------------------------------------------------
// Example 12: Using filter results for analytics
// ----------------------------------------------------------------

console.log("\n=== Product Analytics ===\n");

const allElectronics = filterProducts(products, {
    category: "electronics",
});

const inStockElectronics = filterProducts(products, {
    category: "electronics",
    inStock: true,
});

const onSaleElectronics = filterProducts(products, {
    category: "electronics",
    onSale: true,
});

console.log("📊 Electronics Category Stats:");
console.log(`  - Total products: ${allElectronics.length}`);
console.log(`  - In stock: ${inStockElectronics.length}`);
console.log(`  - On sale: ${onSaleElectronics.length}`);

const avgPrice =
    allElectronics.reduce((sum, p) => sum + p.price, 0) / allElectronics.length;
console.log(`  - Average price: $${avgPrice.toFixed(2)}`);

// Check if any electronics meet specific criteria
const hasAffordablePremium = someProducts(products, {
    category: "electronics",
    maxPrice: 150,
    minRating: 4.5,
    inStock: true,
});

console.log(
    `  - Has affordable premium options: ${hasAffordablePremium ? "Yes" : "No"}`,
);
