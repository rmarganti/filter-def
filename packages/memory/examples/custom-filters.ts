import { inMemoryFilter } from "@filter-def/memory";

// ----------------------------------------------------------------
// Models
// ----------------------------------------------------------------

interface BlogPost {
    id: string;
    title: string;
    content: string;
    author: string;
    tags: string[];
    publishedAt: Date;
    viewCount: number;
    likeCount: number;
    commentCount: number;
}

// ----------------------------------------------------------------
// Sample data
// ----------------------------------------------------------------

const now = new Date();
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

const posts: BlogPost[] = [
    {
        id: "1",
        title: "Getting Started with TypeScript",
        content: "TypeScript is a typed superset of JavaScript...",
        author: "Alice",
        tags: ["typescript", "javascript", "tutorial"],
        publishedAt: oneWeekAgo,
        viewCount: 1500,
        likeCount: 120,
        commentCount: 25,
    },
    {
        id: "2",
        title: "Advanced React Patterns",
        content: "Learn about advanced patterns in React...",
        author: "Bob",
        tags: ["react", "javascript", "advanced"],
        publishedAt: oneMonthAgo,
        viewCount: 3200,
        likeCount: 280,
        commentCount: 45,
    },
    {
        id: "3",
        title: "Building REST APIs",
        content: "A comprehensive guide to building REST APIs...",
        author: "Alice",
        tags: ["api", "backend", "tutorial"],
        publishedAt: twoMonthsAgo,
        viewCount: 980,
        likeCount: 75,
        commentCount: 12,
    },
    {
        id: "4",
        title: "Introduction to GraphQL",
        content: "GraphQL is a query language for APIs...",
        author: "Charlie",
        tags: ["graphql", "api", "tutorial"],
        publishedAt: oneWeekAgo,
        viewCount: 2100,
        likeCount: 190,
        commentCount: 38,
    },
    {
        id: "5",
        title: "CSS Grid Layout Guide",
        content: "Master CSS Grid with this comprehensive guide...",
        author: "Bob",
        tags: ["css", "frontend", "tutorial"],
        publishedAt: oneMonthAgo,
        viewCount: 1800,
        likeCount: 150,
        commentCount: 22,
    },
];

// ----------------------------------------------------------------
// Filter definition with custom filters
// ----------------------------------------------------------------

const postFilter = inMemoryFilter<BlogPost>().filterDef({
    // Standard primitive filters
    id: { kind: "eq" },
    author: { kind: "eq" },
    titleContains: { kind: "contains", field: "title" },

    // Custom filter: Check if post has any of the provided tags
    hasTag: (post: BlogPost, tag: string) => {
        return post.tags.includes(tag);
    },

    // Custom filter: Check if post has ALL of the provided tags
    hasAllTags: (post: BlogPost, tags: string[]) => {
        return tags.every((tag) => post.tags.includes(tag));
    },

    // Custom filter: Check if post was published within X days
    publishedWithinDays: (post: BlogPost, days: number) => {
        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        return post.publishedAt >= cutoffDate;
    },

    // Custom filter: Check if post was published between two dates
    publishedBetween: (post: BlogPost, range: { start: Date; end: Date }) => {
        return post.publishedAt >= range.start && post.publishedAt <= range.end;
    },

    // Custom filter: Engagement rate (likes + comments per view)
    minEngagementRate: (post: BlogPost, minRate: number) => {
        const engagementRate =
            (post.likeCount + post.commentCount) / post.viewCount;
        return engagementRate >= minRate;
    },

    // Custom filter: Popularity score (weighted calculation)
    minPopularityScore: (post: BlogPost, minScore: number) => {
        const score =
            post.viewCount * 1 + post.likeCount * 5 + post.commentCount * 10;
        return score >= minScore;
    },

    // Custom filter: Word count in content
    minWordCount: (post: BlogPost, minWords: number) => {
        const wordCount = post.content.split(/\s+/).length;
        return wordCount >= minWords;
    },

    // Custom filter: Title length
    titleLongerThan: (post: BlogPost, length: number) => {
        return post.title.length > length;
    },
});

// ----------------------------------------------------------------
// Examples: Single custom filters
// ----------------------------------------------------------------

console.log("=== Single Custom Filters ===\n");

// Find posts with a specific tag
const typescriptPosts = posts.filter(postFilter({ hasTag: "tutorial" }));
console.log("✅ Tutorial posts:", typescriptPosts.length);

// Find recent posts (within 14 days)
const recentPosts = posts.filter(postFilter({ publishedWithinDays: 14 }));
console.log("✅ Posts from last 14 days:", recentPosts.length);

// Find highly engaging posts
const engagingPosts = posts.filter(postFilter({ minEngagementRate: 0.1 }));
console.log("✅ Posts with >10% engagement rate:", engagingPosts.length);

// Find popular posts
const popularPosts = posts.filter(postFilter({ minPopularityScore: 5000 }));
console.log("✅ Popular posts (score > 5000):", popularPosts.length);

// ----------------------------------------------------------------
// Examples: Combining multiple custom filters
// ----------------------------------------------------------------

console.log("\n=== Multiple Custom Filters ===\n");

// Recent, engaging, and popular
const trendingPosts = posts.filter(
    postFilter({
        publishedWithinDays: 14,
        minEngagementRate: 0.08,
        minPopularityScore: 3000,
    }),
);
console.log("✅ Trending posts (recent + engaging + popular):", trendingPosts);

// Posts with multiple tags and minimum word count
const comprehensiveTutorials = posts.filter(
    postFilter({
        hasAllTags: ["tutorial", "javascript"],
        minWordCount: 5,
    }),
);
console.log(
    "✅ Comprehensive JavaScript tutorials:",
    comprehensiveTutorials.length,
);

// Date range with engagement requirements
const lastMonthHighQuality = posts.filter(
    postFilter({
        publishedBetween: {
            start: oneMonthAgo,
            end: now,
        },
        minEngagementRate: 0.1,
        minPopularityScore: 4000,
    }),
);
console.log(
    "✅ High quality posts from last month:",
    lastMonthHighQuality.length,
);

// ----------------------------------------------------------------
// Examples: Mixing custom and primitive filters
// ----------------------------------------------------------------

console.log("\n=== Custom + Primitive Filters ===\n");

// Specific author's recent popular posts
const alicePopularRecent = posts.filter(
    postFilter({
        author: "Alice",
        publishedWithinDays: 60,
        minPopularityScore: 2000,
    }),
);
console.log("✅ Alice's recent popular posts:", alicePopularRecent);

// Search by title with engagement requirements
const apiPosts = posts.filter(
    postFilter({
        titleContains: "API",
        minEngagementRate: 0.05,
        hasTag: "api",
    }),
);
console.log('✅ Engaging "API" posts:', apiPosts);

// Author's posts with specific characteristics
const bobTutorials = posts.filter(
    postFilter({
        author: "Bob",
        hasTag: "tutorial",
        minWordCount: 5,
        titleLongerThan: 15,
    }),
);
console.log("✅ Bob's detailed tutorials:", bobTutorials);

// ----------------------------------------------------------------
// Real-world scenario: Content recommendation
// ----------------------------------------------------------------

console.log("\n=== Content Recommendation ===\n");

// Recommend posts: recent, popular, specific tag, good engagement
const recommendedPosts = posts.filter(
    postFilter({
        publishedWithinDays: 30,
        hasTag: "tutorial",
        minEngagementRate: 0.08,
        minPopularityScore: 3000,
    }),
);

console.log("📚 Recommended posts for new users:");
recommendedPosts.forEach((post) => {
    const engagementRate = (
        ((post.likeCount + post.commentCount) / post.viewCount) *
        100
    ).toFixed(1);
    console.log(
        `  - "${post.title}" by ${post.author} (${engagementRate}% engagement)`,
    );
});

// ----------------------------------------------------------------
// Advanced: Custom filters with complex business logic
// ----------------------------------------------------------------

console.log("\n=== Advanced Custom Logic ===\n");

const advancedFilter = inMemoryFilter<BlogPost>().filterDef({
    // Complex custom filter: Check multiple conditions
    isFeaturedWorthy: (post: BlogPost, threshold: boolean) => {
        if (!threshold) return true;

        const isRecent =
            post.publishedAt >=
            new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const hasGoodEngagement =
            (post.likeCount + post.commentCount) / post.viewCount > 0.1;
        const isPopular = post.viewCount > 1000;
        const hasMultipleTags = post.tags.length >= 2;

        return isRecent && hasGoodEngagement && isPopular && hasMultipleTags;
    },

    // Custom filter: Computed score comparison
    betterThan: (post: BlogPost, otherPostId: string) => {
        const otherPost = posts.find((p) => p.id === otherPostId);
        if (!otherPost) return false;

        const thisScore =
            post.viewCount * 1 + post.likeCount * 5 + post.commentCount * 10;
        const otherScore =
            otherPost.viewCount * 1 +
            otherPost.likeCount * 5 +
            otherPost.commentCount * 10;

        return thisScore > otherScore;
    },
});

const featuredPosts = posts.filter(advancedFilter({ isFeaturedWorthy: true }));
console.log("✅ Posts worthy of featuring:", featuredPosts.length);

const betterThanPost3 = posts.filter(advancedFilter({ betterThan: "3" }));
console.log("✅ Posts performing better than post #3:", betterThanPost3.length);
