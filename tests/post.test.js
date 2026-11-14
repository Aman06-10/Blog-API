import { describe, it, expect } from "vitest"
import request from "supertest"
import app from "../src/app.js"
import Post from "../src/models/postModel.js"
import { validLoginData, validUser, validUser2, validPost1, validPost2 } from "./helpers/testData.js"

describe("Post /api/posts", () => {
    it("create a post successfully", async () => {
        const register = await request(app).post("/api/auth/register").send(validUser)
        expect(register.status).toBe(201)
        const login = await request(app).post("/api/auth/login").send(validLoginData)
        expect(login.status).toBe(200)
        const cookie = login.headers["set-cookie"][0].split(";")[0]
        expect(cookie).toContain("token=")
        const res = await request(app).post("/api/posts").set("Cookie", cookie).send(validPost1)
        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.message).toBe("Post added successfully")
    })
    it("rejects post creation without a token", async () => {
        const res = await request(app).post("/api/posts").send(validPost1)
        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
    })
    it("rejects post creation with an invalid token", async () => {
        const res = await request(app).post("/api/posts").set("Cookie", "token=not.a.real.jwt").send(validPost1)
        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
    })
    it("creates a post using an agent (cookie persists)", async () => {
        const agent = request.agent(app)
        await agent.post("/api/auth/register").send(validUser).expect(201)
        await agent.post("/api/auth/login").send(validLoginData).expect(200)
        const res = await agent.post("/api/posts").send(validPost1)
        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
    })
})