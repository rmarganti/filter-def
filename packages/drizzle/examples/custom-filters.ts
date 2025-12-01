import { and, eq, gte, lte, sql } from "drizzle-orm";
import {
    boolean,
    integer,
    pgTable,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { drizzleFilter } from "../src";

// ----------------------------------------------------------------
// Table definitions
// ----------------------------------------------------------------

const postsTable = pgTable("posts", {
    id: integer("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    authorId: integer("author_id").notNull(),
    viewCount: integer("view_count").notNull(),
    likeCount: integer("like_count").notNull(),
    commentCount: integer("comment_count").notNull(),
    publishedAt: timestamp("published_at").notNull(),
    isPublished: boolean("is_published").notNull(),
});

// ----------------------------------------------------------------
// Filter definition with custom filters
// ----------------------------------------------------------------

const postFilter = drizzleFilter(postsTable).filterDef({
    // Standard primitive filters
    id: { kind: "eq" },
    authorId: { kind: "eq" },
    titleContains: { kind: "contains", field: "title", caseInsensitive: true },
    isPublished: { kind: "eq" },

    // Custom filter: Check if view count is divisible by a number
    viewsDivisibleBy: (divisor: number) =>
        sql`${postsTable.viewCount} % ${divisor} = 0`,

    // Custom filter: Published within X days
    publishedWithinDays: (days: number) =>
        sql`${postsTable.publishedAt} >= NOW() - INTERVAL '${sql.raw(String(days))} days'`,

    // Custom filter: Published between two dates
    publishedBetween: (range: { start: Date; end: Date }) =>
        and(
            gte(postsTable.publishedAt, range.start),
            lte(postsTable.publishedAt, range.end),
        ),

    // Custom filter: Minimum engagement (likes + comments)
    minEngagement: (minTotal: number) =>
        sql`${postsTable.likeCount} + ${postsTable.commentCount} >= ${minTotal}`,

    // Custom filter: Popularity score threshold (weighted calculation)
    minPopularityScore: (minScore: number) =>
        sql`(${postsTable.viewCount} * 1 + ${postsTable.likeCount} * 5 + ${postsTable.commentCount} * 10) >= ${minScore}`,

    // Custom filter: Minimum word count in content
    minWordCount: (minWords: number) =>
        sql`array_length(regexp_split_to_array(${postsTable.content}, '\\s+'), 1) >= ${minWords}`,

    // Custom filter: Title longer than X characters
    titleLongerThan: (length: number) =>
        sql`length(${postsTable.title}) > ${length}`,

    // Custom filter that returns undefined to skip filtering
    optionalStatus: (status: "published" | "draft" | "all") =>
        status === "all"
            ? undefined
            : eq(postsTable.isPublished, status === "published"),
});

// ----------------------------------------------------------------
// Examples: Single custom filters
// ----------------------------------------------------------------

console.log("=== Single Custom Filters ===\n");

// Filter by views divisible by 100
const viewsWhere = postFilter({ viewsDivisibleBy: 100 });
console.log("✅ Views divisible by 100:", viewsWhere?.toString());
// Usage: await db.select().from(postsTable).where(viewsWhere);

// Filter by recent posts
const recentWhere = postFilter({ publishedWithinDays: 7 });
console.log("✅ Published within 7 days:", recentWhere?.toString());

// Filter by minimum engagement
const engagingWhere = postFilter({ minEngagement: 50 });
console.log("✅ Posts with 50+ engagement:", engagingWhere?.toString());

// Filter by popularity score
const popularWhere = postFilter({ minPopularityScore: 5000 });
console.log("✅ Popular posts (score >= 5000):", popularWhere?.toString());

// ----------------------------------------------------------------
// Examples: Combining multiple custom filters
// ----------------------------------------------------------------

console.log("\n=== Multiple Custom Filters ===\n");

// Recent, engaging, and popular
const trendingWhere = postFilter({
    publishedWithinDays: 14,
    minEngagement: 30,
    minPopularityScore: 3000,
});
console.log(
    "✅ Trending posts (recent + engaging + popular):",
    trendingWhere?.toString(),
);

// Date range with engagement requirements
const lastMonthHighQualityWhere = postFilter({
    publishedBetween: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
    },
    minEngagement: 100,
    minPopularityScore: 4000,
});
console.log(
    "✅ High quality posts from last month:",
    lastMonthHighQualityWhere?.toString(),
);

// ----------------------------------------------------------------
// Examples: Mixing custom and primitive filters
// ----------------------------------------------------------------

console.log("\n=== Custom + Primitive Filters ===\n");

// Specific author's recent popular posts
const authorPopularRecentWhere = postFilter({
    authorId: 123,
    publishedWithinDays: 60,
    minPopularityScore: 2000,
});
console.log(
    "✅ Author's recent popular posts:",
    authorPopularRecentWhere?.toString(),
);

// Search by title with engagement requirements
const titleSearchWhere = postFilter({
    titleContains: "TypeScript",
    minEngagement: 25,
    isPublished: true,
});
console.log('✅ Engaging "TypeScript" posts:', titleSearchWhere?.toString());

// Author's detailed posts
const detailedPostsWhere = postFilter({
    authorId: 456,
    minWordCount: 500,
    titleLongerThan: 20,
    isPublished: true,
});
console.log("✅ Author's detailed posts:", detailedPostsWhere?.toString());

// ----------------------------------------------------------------
// Examples: Optional/conditional filters
// ----------------------------------------------------------------

console.log("\n=== Optional Filters ===\n");

// Optional status filter - "all" returns undefined, skipping the filter
const allPostsWhere = postFilter({ optionalStatus: "all" });
console.log("✅ All posts (status=all):", allPostsWhere);

const publishedOnlyWhere = postFilter({ optionalStatus: "published" });
console.log(
    "✅ Published only (status=published):",
    publishedOnlyWhere?.toString(),
);

const draftOnlyWhere = postFilter({ optionalStatus: "draft" });
console.log("✅ Drafts only (status=draft):", draftOnlyWhere?.toString());
