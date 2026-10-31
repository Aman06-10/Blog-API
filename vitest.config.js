import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        setupFiles: ["./tests/setup.js"],
        hookTimeout: 120000,
        testTimeout: 30000,
        env: {
            MONGODB_URL: "mongodb://127.0.0.1:27017/unused",
            JWT_SECRET: "test-secret",
            NODE_ENV: "test"
        }
    }
})
