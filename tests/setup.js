import { beforeAll, afterEach, afterAll } from "vitest"
import mongoose from "mongoose"
import { MongoMemoryServer } from "mongodb-memory-server"

process.env.NODE_ENV = "test"
process.env.JWT_SECRET = "test-secret"

let mongoServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

afterEach(async () => {
  let collections=Object.values(mongoose.connection.collections)
  for(const collection of collections){
    await collection.deleteMany({})
  }
})

afterAll(async () => {
  await mongoose.disconnect()
  if (mongoServer) {
    await mongoServer.stop()
  }
})