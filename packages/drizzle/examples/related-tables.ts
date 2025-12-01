import { and, eq, exists, gt, ilike, sql } from "drizzle-orm";
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

const usersTable = pgTable("users", {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    isActive: boolean("is_active").notNull(),
});

const postsTable = pgTable("posts", {
    id: integer("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    authorId: integer("author_id").notNull(),
    publishedAt: timestamp("published_at"),
    viewCount: integer("view_count").notNull().default(0),
});

const commentsTable = pgTable("comments", {
    id: integer("id").primaryKey(),
    postId: integer("post_id").notNull(),
    authorId: integer("author_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull(),
});

const tagsTable = pgTable("tags", {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
});

const postTagsTable = pgTable("post_tags", {
    postId: integer("post_id").notNull(),
    tagId: integer("tag_id").notNull(),
});

// ----------------------------------------------------------------
// Why EXISTS subqueries?
// ----------------------------------------------------------------
//
// The drizzle adapter generates WHERE clauses, not JOIN clauses.
// Trying to filter by related table data with JOINs would require:
// 1. Adding the JOIN to the query builder
// 2. Coordinating between filter logic and query structure
// 3. Handling potential duplicate rows from one-to-many relationships
//
// EXISTS subqueries solve this elegantly:
// - No JOIN needed in the main query
// - Properly handles one-to-many without duplicates
// - Can express complex conditions on related data
// - Works with any level of relationship nesting
//
// ----------------------------------------------------------------

// ----------------------------------------------------------------
// User filter with related posts
// ----------------------------------------------------------------

// Note: Custom filters that use EXISTS need access to a db instance
// to construct the subquery. This is typically done by creating the
// filter inside a function that receives the db.

const createUserFilter = (db: any) =>
    drizzleFilter(usersTable).filterDef({
        // Primitive filters
        name: { kind: "eq" },
        email: { kind: "contains" },
        isActive: { kind: "eq" },

        // Has any posts
        hasPosts: (required: boolean) =>
            required
                ? exists(
                      db
                          .select()
                          .from(postsTable)
                          .where(eq(postsTable.authorId, usersTable.id)),
                  )
                : undefined,

        // Has a post with specific title
        hasPostWithTitle: (title: string) =>
            exists(
                db
                    .select()
                    .from(postsTable)
                    .where(
                        and(
                            eq(postsTable.authorId, usersTable.id),
                            ilike(postsTable.title, `%${title}%`),
                        ),
                    ),
            ),

        // Has a published post
        hasPublishedPost: (required: boolean) =>
            required
                ? exists(
                      db
                          .select()
                          .from(postsTable)
                          .where(
                              and(
                                  eq(postsTable.authorId, usersTable.id),
                                  sql`${postsTable.publishedAt} IS NOT NULL`,
                              ),
                          ),
                  )
                : undefined,

        // Has a popular post (view count threshold)
        hasPopularPost: (minViews: number) =>
            exists(
                db
                    .select()
                    .from(postsTable)
                    .where(
                        and(
                            eq(postsTable.authorId, usersTable.id),
                            gt(postsTable.viewCount, minViews),
                        ),
                    ),
            ),

        // Has commented on any post
        hasCommented: (required: boolean) =>
            required
                ? exists(
                      db
                          .select()
                          .from(commentsTable)
                          .where(eq(commentsTable.authorId, usersTable.id)),
                  )
                : undefined,

        // Has commented on a specific post
        hasCommentedOnPost: (postId: number) =>
            exists(
                db
                    .select()
                    .from(commentsTable)
                    .where(
                        and(
                            eq(commentsTable.authorId, usersTable.id),
                            eq(commentsTable.postId, postId),
                        ),
                    ),
            ),
    });

// ----------------------------------------------------------------
// Post filter with related data
// ----------------------------------------------------------------

const createPostFilter = (db: any) =>
    drizzleFilter(postsTable).filterDef({
        // Primitive filters
        id: { kind: "eq" },
        authorId: { kind: "eq" },
        titleContains: {
            kind: "contains",
            field: "title",
            caseInsensitive: true,
        },
        minViews: { kind: "gte", field: "viewCount" },

        // Author is active
        authorIsActive: (required: boolean) =>
            required
                ? exists(
                      db
                          .select()
                          .from(usersTable)
                          .where(
                              and(
                                  eq(usersTable.id, postsTable.authorId),
                                  eq(usersTable.isActive, true),
                              ),
                          ),
                  )
                : undefined,

        // Author name contains
        authorNameContains: (name: string) =>
            exists(
                db
                    .select()
                    .from(usersTable)
                    .where(
                        and(
                            eq(usersTable.id, postsTable.authorId),
                            ilike(usersTable.name, `%${name}%`),
                        ),
                    ),
            ),

        // Has comments
        hasComments: (required: boolean) =>
            required
                ? exists(
                      db
                          .select()
                          .from(commentsTable)
                          .where(eq(commentsTable.postId, postsTable.id)),
                  )
                : undefined,

        // Has comment from specific user
        hasCommentFrom: (userId: number) =>
            exists(
                db
                    .select()
                    .from(commentsTable)
                    .where(
                        and(
                            eq(commentsTable.postId, postsTable.id),
                            eq(commentsTable.authorId, userId),
                        ),
                    ),
            ),

        // Has a specific tag (many-to-many through post_tags)
        hasTag: (tagName: string) =>
            exists(
                db
                    .select()
                    .from(postTagsTable)
                    .innerJoin(tagsTable, eq(tagsTable.id, postTagsTable.tagId))
                    .where(
                        and(
                            eq(postTagsTable.postId, postsTable.id),
                            ilike(tagsTable.name, tagName),
                        ),
                    ),
            ),
    });

// ----------------------------------------------------------------
// Example usage
// ----------------------------------------------------------------

console.log("=== Related Tables with EXISTS Subqueries ===\n");

// This demonstrates the pattern - in real usage, you'd have a db instance
async function exampleUsage(db: any) {
    const userFilter = createUserFilter(db);
    const postFilter = createPostFilter(db);

    // Find active users who have written about TypeScript
    const typeScriptAuthors = await db
        .select()
        .from(usersTable)
        .where(
            userFilter({
                isActive: true,
                hasPostWithTitle: "TypeScript",
            }),
        );
    console.log("TypeScript authors:", typeScriptAuthors);

    // Find users who have popular posts and have commented
    const engagedAuthors = await db
        .select()
        .from(usersTable)
        .where(
            userFilter({
                hasPopularPost: 1000,
                hasCommented: true,
            }),
        );
    console.log("Engaged authors:", engagedAuthors);

    // Find posts by active authors that have comments
    const discussedPosts = await db
        .select()
        .from(postsTable)
        .where(
            postFilter({
                authorIsActive: true,
                hasComments: true,
                minViews: 100,
            }),
        );
    console.log("Discussed posts:", discussedPosts);

    // Find posts with a specific tag by author name
    const taggedPosts = await db
        .select()
        .from(postsTable)
        .where(
            postFilter({
                hasTag: "tutorial",
                authorNameContains: "John",
            }),
        );
    console.log("Tagged posts by John:", taggedPosts);
}

// ----------------------------------------------------------------
// Benefits of EXISTS pattern
// ----------------------------------------------------------------

console.log("Benefits of EXISTS subqueries for related table filtering:\n");
console.log("1. No JOIN duplication - each parent row returned once");
console.log("2. Clean query structure - filter logic stays in WHERE");
console.log("3. Composable - combine multiple related table conditions");
console.log("4. Nestable - can traverse multiple levels of relationships");
console.log("5. Performant - database optimizers handle EXISTS efficiently");
console.log("");

// ----------------------------------------------------------------
// Alternative: NOT EXISTS for exclusion
// ----------------------------------------------------------------

const createUserFilterWithExclusions = (db: any) =>
    drizzleFilter(usersTable).filterDef({
        name: { kind: "eq" },

        // Users WITHOUT any posts
        hasNoPosts: (required: boolean) =>
            required
                ? sql`NOT EXISTS (
                    SELECT 1 FROM ${postsTable}
                    WHERE ${postsTable.authorId} = ${usersTable.id}
                  )`
                : undefined,

        // Users who haven't commented recently
        noRecentComments: (daysSince: number) =>
            sql`NOT EXISTS (
                SELECT 1 FROM ${commentsTable}
                WHERE ${commentsTable.authorId} = ${usersTable.id}
                AND ${commentsTable.createdAt} > NOW() - INTERVAL '${sql.raw(String(daysSince))} days'
            )`,
    });

console.log("NOT EXISTS can be used for exclusion filters:");
console.log("- Find users without posts");
console.log("- Find users who haven't commented recently");
console.log("- Find posts without comments");
