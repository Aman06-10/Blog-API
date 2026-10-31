import { beforeAll, afterEach, afterAll } from "vitest"
import mongoose from "mongoose"

let mongod

beforeAll(async () => {
    if (process.env.TEST_MONGO_URI) {
        const dbName = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        await mongoose.connect(`${process.env.TEST_MONGO_URI}/${dbName}`)
    } else {
        const { MongoMemoryServer } = await import("mongodb-memory-server")
        mongod = await MongoMemoryServer.create()
        await mongoose.connect(mongod.getUri())
    }
    // Wait for unique indexes (email, username, ...) to exist before any test runs.
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()))
})

afterEach(async () => {
    for (const collection of Object.values(mongoose.connection.collections)) {
        await collection.deleteMany({})
    }
})

afterAll(async () => {
    if (mongod) {
        await mongoose.disconnect()
        await mongod.stop()
    } else {
        await mongoose.connection.dropDatabase()
        await mongoose.disconnect()
    }
})
