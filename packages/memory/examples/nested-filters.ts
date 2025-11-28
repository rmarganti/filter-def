import { faker } from "@faker-js/faker";
import { entity, makeFilterHelpers } from "@filter-def/memory";

// ----------------------------------------------------------------
// Models
// ----------------------------------------------------------------

interface User {
    id: string;
    name: string;
    email: string;
    age: number;
    posts: Post[];
}

interface Post {
    id: string;
    title: string;
    content: string;
    authorId: string;
}

// ----------------------------------------------------------------
// Factories
// ----------------------------------------------------------------

const userFactory = (): User => {
    const userId = faker.string.uuid();

    return {
        id: userId,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        age: faker.number.int({ min: 18, max: 65 }),
        posts: Array.from(
            { length: faker.number.int({ min: 1, max: 5 }) },
            () => postFactory(userId),
        ),
    };
};

const postFactory = (authorId: string): Post => ({
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraph(),
    authorId,
});

// ----------------------------------------------------------------
// Filters
// ----------------------------------------------------------------

const postFilter = entity<Post>().filterDef({
    id: { kind: "eq" },
    title: { kind: "eq" },
    authorId: { kind: "eq" },
    contentContains: {
        kind: "contains",
        field: "content",
        caseInsensitive: true,
    },
});

const { some: somePosts } = makeFilterHelpers(postFilter);

const userFilter = entity<User>().filterDef({
    id: { kind: "eq" },
    name: { kind: "eq" },
    email: { kind: "eq" },
    olderThan: { kind: "gte", field: "age" },
    wrotePostId: (user: User, postId: string) => {
        return somePosts(user.posts, { id: postId });
    },
});

const { find: findUser } = makeFilterHelpers(userFilter);

// ----------------------------------------------------------------
// Generate data
// ----------------------------------------------------------------

const users = Array.from({ length: 10 }, userFactory);

// Find a random post, nested within a random user
const randomUser = users[Math.floor(Math.random() * users.length)];
const randomPost =
    randomUser.posts[Math.floor(Math.random() * randomUser.posts.length)];

// ----------------------------------------------------------------
// Execute
// ----------------------------------------------------------------

// Find a user who wrote a specific post
const userWhoWrotePost = findUser(users, { wrotePostId: randomPost.id });

console.log(
    `✅ Found user who wrote post with id '${randomPost.id}':`,
    userWhoWrotePost,
);
