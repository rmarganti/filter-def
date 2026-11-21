import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/postgres.ts", "src/mysql.ts", "src/bigquery.ts"],
    dts: true,
    exports: true,
    format: ["cjs", "esm"],
});
