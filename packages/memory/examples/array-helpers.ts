import { inMemoryFilter, makeFilterHelpers } from "@filter-def/memory";

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

interface Task {
    id: string;
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    completed: boolean;
    assigneeId: string | null;
    dueDate: Date;
}

// ----------------------------------------------------------------
// Sample data
// ----------------------------------------------------------------

const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

const tasks: Task[] = [
    {
        id: "1",
        title: "Fix bug in login",
        description: "Users cannot login with special characters",
        priority: "high",
        completed: false,
        assigneeId: "user-1",
        dueDate: tomorrow,
    },
    {
        id: "2",
        title: "Update documentation",
        description: "Add examples for new API endpoints",
        priority: "medium",
        completed: false,
        assigneeId: "user-2",
        dueDate: nextWeek,
    },
    {
        id: "3",
        title: "Refactor authentication",
        description: "Clean up auth code and add tests",
        priority: "low",
        completed: true,
        assigneeId: "user-1",
        dueDate: now,
    },
    {
        id: "4",
        title: "Design new dashboard",
        description: "Create mockups for dashboard redesign",
        priority: "medium",
        completed: false,
        assigneeId: null,
        dueDate: nextWeek,
    },
    {
        id: "5",
        title: "Security audit",
        description: "Review authentication and authorization",
        priority: "high",
        completed: false,
        assigneeId: "user-3",
        dueDate: tomorrow,
    },
];

// ----------------------------------------------------------------
// Filter definition
// ----------------------------------------------------------------

const taskFilter = inMemoryFilter<Task>().filterDef({
    id: { kind: "eq" },
    priority: { kind: "eq" },
    completed: { kind: "eq" },
    assigneeId: { kind: "eq" },
    titleContains: { kind: "contains", field: "title" },
    descriptionContains: { kind: "contains", field: "description" },

    // Custom filter for date comparison
    dueBefore: (task: Task, date: Date) => task.dueDate <= date,
});

// ----------------------------------------------------------------
// Create helper functions
// ----------------------------------------------------------------

const {
    filter: filterTasks,
    find: findTask,
    findIndex: findTaskIndex,
    some: someTasks,
    every: everyTask,
} = makeFilterHelpers(taskFilter);

// ----------------------------------------------------------------
// Examples using helpers
// ----------------------------------------------------------------

console.log("=== Using Helper Functions ===\n");

// filter: Get all matching items (multiple fields)
const urgentTasks = filterTasks(tasks, {
    priority: "high",
    completed: false,
});
console.log("✅ Urgent incomplete tasks:", urgentTasks.length);

// filter: Multiple criteria
const assignedIncompleteTasks = filterTasks(tasks, {
    completed: false,
    assigneeId: "user-1",
});
console.log("✅ User-1's incomplete tasks:", assignedIncompleteTasks);

// find: Get first matching item
const firstMediumPriorityTask = findTask(tasks, {
    priority: "medium",
});
console.log("✅ First medium priority task:", firstMediumPriorityTask?.title);

// find: Multiple fields
const specificTask = findTask(tasks, {
    titleContains: "login",
    completed: false,
});
console.log("✅ Incomplete login task:", specificTask?.title);

// findIndex: Get index of first match
const taskIndex = findTaskIndex(tasks, {
    id: "3",
});
console.log("✅ Index of task with id '3':", taskIndex);

// some: Check if any match exists (multiple fields)
const hasUnassignedHighPriority = someTasks(tasks, {
    priority: "high",
    assigneeId: null,
});
console.log(
    "✅ Has unassigned high priority tasks:",
    hasUnassignedHighPriority,
);

// some: Check with custom filter and other fields
const hasOverdueTasks = someTasks(tasks, {
    dueBefore: now,
    completed: false,
});
console.log("✅ Has overdue incomplete tasks:", hasOverdueTasks);

// every: Check if all match
const allTasksAssigned = everyTask(tasks, {
    assigneeId: "user-1",
});
console.log("✅ All tasks assigned to user-1:", allTasksAssigned);

// every: Multiple criteria
const allHighPriorityComplete = everyTask(
    filterTasks(tasks, { priority: "high" }),
    { completed: true },
);
console.log("✅ All high priority tasks complete:", allHighPriorityComplete);

// ----------------------------------------------------------------
// Comparison: Helpers vs Predicates
// ----------------------------------------------------------------

console.log("\n=== Helpers vs Predicates ===\n");

// Using helpers (concise)
const helperResult = filterTasks(tasks, {
    priority: "high",
    completed: false,
});

// Using predicates (flexible)
const predicate = taskFilter({
    priority: "high",
    completed: false,
});
const predicateResult = tasks.filter(predicate);

console.log("✅ Helper result count:", helperResult.length);
console.log("✅ Predicate result count:", predicateResult.length);
console.log("✅ Results are identical:", helperResult === predicateResult);

// Predicates allow composition with other array methods
const predicateTitles = tasks
    .filter(predicate)
    .map((task) => task.title)
    .sort();
console.log("✅ Predicate composability:", predicateTitles);

// ----------------------------------------------------------------
// Real-world usage: Filtering nested arrays
// ----------------------------------------------------------------

console.log("\n=== Nested Array Filtering ===\n");

interface Project {
    name: string;
    tasks: Task[];
}

const projects: Project[] = [
    {
        name: "Authentication System",
        tasks: tasks.slice(0, 3),
    },
    {
        name: "Dashboard Redesign",
        tasks: tasks.slice(3, 5),
    },
];

// Find projects with high priority tasks
const projectsWithUrgentTasks = projects.filter((project) =>
    someTasks(project.tasks, { priority: "high" }),
);
console.log(
    "✅ Projects with high priority tasks:",
    projectsWithUrgentTasks.map((p) => p.name),
);

// Find projects where all tasks are completed
const completedProjects = projects.filter((project) =>
    everyTask(project.tasks, { completed: true }),
);
console.log(
    "✅ Fully completed projects:",
    completedProjects.length === 0
        ? "None"
        : completedProjects.map((p) => p.name),
);

// Filter tasks within a specific project using multiple criteria
const authProjectUrgentTasks = filterTasks(projects[0].tasks, {
    priority: "high",
    completed: false,
});
console.log(
    `✅ Urgent tasks in ${projects[0].name}:`,
    authProjectUrgentTasks.length,
);
