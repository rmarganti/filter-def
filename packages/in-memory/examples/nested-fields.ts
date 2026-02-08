import { inMemoryFilter } from "@filter-def/in-memory";

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

interface Employee {
    name: { first: string; last: string };
    department: string;
    address: { city: string; geo: { lat: number; lng: number } };
}

// ----------------------------------------------------------------
// Sample data
// ----------------------------------------------------------------

const employees: Employee[] = [
    {
        name: { first: "Alice", last: "Chen" },
        department: "engineering",
        address: { city: "Portland", geo: { lat: 45.5, lng: -122.7 } },
    },
    {
        name: { first: "Bob", last: "Smith" },
        department: "design",
        address: { city: "Seattle", geo: { lat: 47.6, lng: -122.3 } },
    },
    {
        name: { first: "Carol", last: "Chen" },
        department: "engineering",
        address: { city: "San Francisco", geo: { lat: 37.8, lng: -122.4 } },
    },
];

// ----------------------------------------------------------------
// Filter definition
// ----------------------------------------------------------------

const employeeFilter = inMemoryFilter<Employee>().def({
    firstName: { kind: "eq", field: "name.first" },
    lastName: { kind: "eq", field: "name.last" },
    department: { kind: "eq" },
    cityContains: {
        kind: "contains",
        field: "address.city",
        caseInsensitive: true,
    },
    minLatitude: { kind: "gte", field: "address.geo.lat" },
});

// ----------------------------------------------------------------
// Examples
// ----------------------------------------------------------------

// Filter by nested name field
const chenEmployees = employees.filter(employeeFilter({ lastName: "Chen" }));
console.log("Employees with last name Chen:", chenEmployees.length);

// Combine nested and flat fields
const chenEngineers = employees.filter(
    employeeFilter({ lastName: "Chen", department: "engineering" }),
);
console.log("Chen engineers:", chenEngineers.length);

// Search nested string field
const portlandArea = employees.filter(employeeFilter({ cityContains: "port" }));
console.log("Employees in cities containing 'port':", portlandArea.length);

// Filter on deeply nested numeric field
const northernEmployees = employees.filter(employeeFilter({ minLatitude: 46 }));
console.log("Employees above 46° latitude:", northernEmployees.length);
