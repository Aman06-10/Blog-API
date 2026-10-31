import { describe, it, expect } from "vitest"
import mongoose from "mongoose"
import { User } from "../src/models/userModel.js"
import { guest, newUser, newAdmin, setRole, signToken, withToken, makePost, makeComment } from "./helpers.js"

const valid = { username: "alice", email: "alice@test.com", password: "Passw0rd!x" }

describe("POST /api/auth/register", () => {
    it("registers a user, sets the login cookie and never returns the password", async () => {
        const res = await guest().post("/api/auth/register").send(valid)
        expect(res.status).toBe(201)
        expect(res.headers["set-cookie"].join(";")).toContain("token=")
        expect(JSON.stringify(res.body)).not.toContain("password")
    })

    it("normalizes the email (trim + lowercase)", async () => {
        const res = await guest().post("/api/auth/register").send({ ...valid, email: "  ALICE@Test.COM  " })
        expect(res.status).toBe(201)
        expect(await User.findOne({ email: "alice@test.com" })).not.toBeNull()
    })

    it("accepts the length boundaries", async () => {
        expect((await guest().post("/api/auth/register").send({ username: "abc", email: "a@t.com", password: "123456" })).status).toBe(201)
        expect((await guest().post("/api/auth/register").send({ username: "u".repeat(50), email: "b@t.com", password: "p".repeat(128) })).status).toBe(201)
    })

    it("rejects a duplicate username or email with 409", async () => {
        await guest().post("/api/auth/register").send(valid)
        expect((await guest().post("/api/auth/register").send({ ...valid, email: "other@test.com" })).status).toBe(409)
        expect((await guest().post("/api/auth/register").send({ ...valid, username: "other" })).status).toBe(409)
    })

    it.each([
        ["empty body", {}],
        ["missing username", { email: valid.email, password: valid.password }],
        ["missing email", { username: valid.username, password: valid.password }],
        ["missing password", { username: valid.username, email: valid.email }],
        ["username too short", { ...valid, username: "ab" }],
        ["username too long", { ...valid, username: "u".repeat(51) }],
        ["username not a string", { ...valid, username: 12345 }],
        ["invalid email", { ...valid, email: "not-an-email" }],
        ["email not a string", { ...valid, email: 98765 }],
        ["password too short", { ...valid, password: "12345" }],
        ["password too long", { ...valid, password: "p".repeat(129) }],
        ["password not a string", { ...valid, password: 123456 }],
        ["privilege escalation (role in body)", { ...valid, role: "admin" }],
    ])("rejects bad input: %s -> 400", async (_name, body) => {
        expect((await guest().post("/api/auth/register").send(body)).status).toBe(400)
    })

    it("rejects an array body with 400", async () => {
        expect((await guest().post("/api/auth/register").send([])).status).toBe(400)
    })
})

describe("POST /api/auth/login", () => {
    it("logs in with correct credentials, case-insensitive on the email", async () => {
        const user = await newUser()
        expect((await guest().post("/api/auth/login").send({ email: user.email, password: user.password })).status).toBe(200)
        expect((await guest().post("/api/auth/login").send({ email: user.email.toUpperCase(), password: user.password })).status).toBe(200)
    })

    it("gives 401 for a wrong password and for an unknown email", async () => {
        const user = await newUser()
        expect((await guest().post("/api/auth/login").send({ email: user.email, password: "wrong-password" })).status).toBe(401)
        expect((await guest().post("/api/auth/login").send({ email: "nobody@test.com", password: "Passw0rd!x" })).status).toBe(401)
    })

    it.each([
        ["missing email", { password: "Passw0rd!x" }],
        ["missing password", { email: "a@test.com" }],
        ["whitespace password", { email: "a@test.com", password: "      " }],
        ["extra field", { email: "a@test.com", password: "Passw0rd!x", username: "x" }],
    ])("rejects bad input: %s -> 400", async (_name, body) => {
        expect((await guest().post("/api/auth/login").send(body)).status).toBe(400)
    })
})

describe("POST /api/auth/logout", () => {
    it("works with and without a session", async () => {
        const user = await newUser()
        expect((await user.agent.post("/api/auth/logout")).status).toBe(200)
        expect((await guest().post("/api/auth/logout")).status).toBe(200)
    })
})

describe("GET /api/auth/me", () => {
    it("returns the current user without the password", async () => {
        const user = await newUser()
        const res = await user.agent.get("/api/auth/me")
        expect(res.status).toBe(200)
        expect(res.body.data.email).toBe(user.email)
        expect(res.body.data.role).toBe("user")
        expect(JSON.stringify(res.body)).not.toContain("password")
    })

    it("returns 401 without a cookie, with garbage, and with a forged signature", async () => {
        const user = await newUser()
        expect((await guest().get("/api/auth/me")).status).toBe(401)
        expect((await guest().get("/api/auth/me").set(withToken("garbage"))).status).toBe(401)
        const forged = signToken({ id: user.id }, "wrong-secret")
        expect((await guest().get("/api/auth/me").set(withToken(forged))).status).toBe(401)
    })

    it("returns 401 for a correctly signed token whose user does not exist", async () => {
        const ghost = signToken({ id: new mongoose.Types.ObjectId().toString() })
        expect((await guest().get("/api/auth/me").set(withToken(ghost))).status).toBe(401)
    })
})

describe("authorization uses the current database state, not the token", () => {
    it("a promoted user gets admin power with the same cookie, and loses it when demoted", async () => {
        const author = await newUser()
        const commenter = await newUser()
        const user = await newUser()
        const post = await makePost(author.agent)

        const first = await makeComment(commenter.agent, post)
        expect((await user.agent.delete(`/api/comments/${first}`)).status).toBe(403)

        await setRole(user.id, "admin")
        expect((await user.agent.get("/api/auth/me")).body.data.role).toBe("admin")
        expect((await user.agent.delete(`/api/comments/${first}`)).status).toBe(200)

        await setRole(user.id, "user")
        const second = await makeComment(commenter.agent, post)
        expect((await user.agent.delete(`/api/comments/${second}`)).status).toBe(403)
    })

    it("a token that claims role=admin does not make a regular user an admin", async () => {
        const author = await newUser()
        const commenter = await newUser()
        const regular = await newUser()
        const post = await makePost(author.agent)
        const comment = await makeComment(commenter.agent, post)
        const token = signToken({ id: regular.id, role: "admin" })
        expect((await guest().delete(`/api/comments/${comment}`).set(withToken(token))).status).toBe(403)
    })

    it("a deleted user is rejected on protected routes and treated as a guest on optional ones", async () => {
        const user = await newUser()
        const draft = await makePost(user.agent, { status: "draft" })
        expect((await user.agent.get(`/api/posts/${draft}`)).status).toBe(200)

        await User.deleteOne({ _id: user.id })
        expect((await user.agent.get("/api/auth/me")).status).toBe(401)
        expect((await user.agent.post("/api/posts").send({ title: "ghost post", content: "long enough content" })).status).toBe(401)
        expect((await user.agent.get(`/api/posts/${draft}`)).status).toBe(404)
        expect((await user.agent.get("/api/posts")).status).toBe(200)
    })
})

describe("unknown routes and bad JSON", () => {
    it("returns 404 for unknown routes and 400 for malformed JSON", async () => {
        expect((await guest().get("/api/nonexistent")).status).toBe(404)
        expect((await guest().post("/api/auth/unknown")).status).toBe(404)
        const res = await guest().post("/api/auth/login").set("Content-Type", "application/json").send("{bad json")
        expect(res.status).toBe(400)
    })

    it("health check responds", async () => {
        expect((await guest().get("/api/health")).status).toBe(200)
    })
})
