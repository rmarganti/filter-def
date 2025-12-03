import { faker } from "@faker-js/faker";

export interface User {
    firstName: string;
    lastName: string;
    email: string;
    age: number;
    verified: boolean;
}

export const userFactory = (): User => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    age: faker.number.int({ min: 18, max: 65 }),
    verified: faker.datatype.boolean(),
});

export const generateUsers = (count: number): User[] =>
    Array.from({ length: count }, userFactory);
