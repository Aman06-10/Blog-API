import { describe, it, expect } from "vitest"
import request from "supertest"
import app from "../src/app.js"
import { User } from "../src/models/userModel.js"
import { validUser } from "./helpers/testData.js"

describe("POST /api/auth/register", () => {
  it("registers a new user", async () => {
    const res = await request(app).post("/api/auth/register").send(validUser)
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.email).toBe(validUser.email)
    expect(res.body.data.password).toBeUndefined()

    const cookie = res.headers["set-cookie"][0]
    expect(cookie).toContain("token=")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Max-Age=604800")

    const user = await User.findOne({ email: validUser.email }).select("+password")
    expect(user).not.toBeNull()
    expect(user.password).not.toBe(validUser.password)
  })
  it("rejects a duplicate email and username",async () => {
    const first=await request(app).post("/api/auth/register").send(validUser)
    expect(first.status).toBe(201)
    const res=await request(app).post("/api/auth/register").send(validUser)
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("User or Email already exists")
    const origionalCount=await User.countDocuments({email:validUser.email})
    expect(origionalCount).toBe(1)
  })
  it("rejects a duplicate username",async()=>{
    const first=await request(app).post("/api/auth/register").send(validUser)
    expect(first.status).toBe(201)
    const secondUser={...validUser,email:"test12345@gmail.com",}
    const res=await request(app).post("/api/auth/register").send(secondUser)
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("User or Email already exists")
    const rejectedCount=await User.countDocuments({email:secondUser.email})
    const origionalCount=await User.countDocuments({email:validUser.email})
    expect(rejectedCount).toBe(0)
    expect(origionalCount).toBe(1)
  })
  it("rejects a duplicate email",async()=>{
    const first=await request(app).post("/api/auth/register").send(validUser)
    expect(first.status).toBe(201)
    const secondUser={...validUser,username:"testUser2",}
    const res=await request(app).post("/api/auth/register").send(secondUser)
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("User or Email already exists")
    const rejectedCount=await User.countDocuments({username:secondUser.username})
    const origionalCount=await User.countDocuments({username:validUser.username})
    expect(rejectedCount).toBe(0)
    expect(origionalCount).toBe(1)
  })
})