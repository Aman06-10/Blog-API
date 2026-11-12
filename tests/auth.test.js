import { describe, it, expect } from "vitest"
import request from "supertest"
import app from "../src/app.js"
import { User } from "../src/models/userModel.js"
import { validLoginData, validUser } from "./helpers/testData.js"

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
  it("rejects a duplicate email and username", async () => {
    const first = await request(app).post("/api/auth/register").send(validUser)
    expect(first.status).toBe(201)
    const res = await request(app).post("/api/auth/register").send(validUser)
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("User or Email already exists")
    const originalCount = await User.countDocuments({ email: validUser.email })
    expect(originalCount).toBe(1)
  })
  it("rejects a duplicate username", async () => {
    const first = await request(app).post("/api/auth/register").send(validUser)
    expect(first.status).toBe(201)
    const secondUser = { ...validUser, email: "test12345@gmail.com", }
    const res = await request(app).post("/api/auth/register").send(secondUser)
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("User or Email already exists")
    const rejectedCount = await User.countDocuments({ email: secondUser.email })
    const originalCount = await User.countDocuments({ email: validUser.email })
    expect(rejectedCount).toBe(0)
    expect(originalCount).toBe(1)
  })
  it("rejects a duplicate email", async () => {
    const first = await request(app).post("/api/auth/register").send(validUser)
    expect(first.status).toBe(201)
    const secondUser = { ...validUser, username: "testUser2", }
    const res = await request(app).post("/api/auth/register").send(secondUser)
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("User or Email already exists")
    const rejectedCount = await User.countDocuments({ username: secondUser.username })
    const originalCount = await User.countDocuments({ username: validUser.username })
    expect(rejectedCount).toBe(0)
    expect(originalCount).toBe(1)
  })
  it("missing username field", async () => {
    const user = { ...validUser, username: undefined }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("username field is required")
    const rejectedCount = await User.countDocuments({ email: user.email })
    expect(rejectedCount).toBe(0)
  })
  it("missing email field", async () => {
    const user = { ...validUser, email: undefined }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("email field is required")
    const rejectedCount = await User.countDocuments({ username: user.username })
    expect(rejectedCount).toBe(0)
  })
  it("missing password field", async () => {
    const user = { ...validUser, password: undefined }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("password field is required")
    const rejectedCount = await User.countDocuments({ username: user.username })
    expect(rejectedCount).toBe(0)
  })
  it("empty username", async () => {
    const user = { ...validUser, username: " " }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("username length must be between 3 and 50 characters")
    const rejectedCount = await User.countDocuments({ email: user.email })
    expect(rejectedCount).toBe(0)
  })
  it("empty email", async () => {
    const user = { ...validUser, email: " " }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("invalid email")
    const rejectedCount = await User.countDocuments({ username: user.username })
    expect(rejectedCount).toBe(0)
  })
  it("empty password", async () => {
    const user = { ...validUser, password: " " }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("password length must be between 6 and 128 characters")
    const rejectedCount = await User.countDocuments({ email: user.email })
    expect(rejectedCount).toBe(0)
  })
  it("invalid username type", async () => {
    const user = { ...validUser, username: 123 }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("username must be a string")
    const rejectedCount = await User.countDocuments({ email: user.email })
    expect(rejectedCount).toBe(0)
  })
  it("invalid email type", async () => {
    const user = { ...validUser, email: 1234 }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("email must be a string")
    const rejectedCount = await User.countDocuments({ username: user.username })
    expect(rejectedCount).toBe(0)
  })
  it("invalid password type", async () => {
    const user = { ...validUser, password: 1234 }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("password must be a string")
    const rejectedCount = await User.countDocuments({ email: user.email })
    expect(rejectedCount).toBe(0)
  })
  it("username length too short", async () => {
    const user = { ...validUser, username: "ab" }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("username length must be between 3 and 50 characters")
    const rejectedCount = await User.countDocuments({ email: user.email })
    expect(rejectedCount).toBe(0)
  })
  it("username length too long", async () => {
    const user = { ...validUser, username: "a".repeat(100) }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("username length must be between 3 and 50 characters")
    const rejectedCount = await User.countDocuments({ email: user.email })
    expect(rejectedCount).toBe(0)
  })
  it("invalid email format", async () => {
    const user = { ...validUser, email: "test123gmail.in" }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("invalid email")
    const rejectedCount = await User.countDocuments({ username: user.username })
    expect(rejectedCount).toBe(0)
  })
  it("password length too short", async () => {
    const user = { ...validUser, password: "123" }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("password length must be between 6 and 128 characters")
    const rejectedCount = await User.countDocuments({ username: user.username })
    expect(rejectedCount).toBe(0)
  })
  it("password length too long", async () => {
    const user = { ...validUser, password: "a".repeat(130) }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("password length must be between 6 and 128 characters")
    const rejectedCount = await User.countDocuments({ username: user.username })
    expect(rejectedCount).toBe(0)
  })
  it("reject extra fields", async () => {
    const user = { ...validUser, address: "47A- Street vinland" }
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("invalid register data")
    expect(res.body.errors).toContain("address field is not allowed")
    const rejectedCount = await User.countDocuments({ username: user.username })
    expect(rejectedCount).toBe(0)
  })
  it("normalizes email to lowercase and trims whitespace", async () => {
    const user = { username: "  PaddedUser  ",email: "  PaddedEmail@GMAIL.COM  ",password: validUser.password}
    const res = await request(app).post("/api/auth/register").send(user)
    expect(res.status).toBe(201)
    expect(res.body.data.username).toBe("PaddedUser")
    expect(res.body.data.email).toBe("paddedemail@gmail.com")
    const saved = await User.findOne({ email: "paddedemail@gmail.com" })
    expect(saved).not.toBeNull()
    expect(saved.username).toBe("PaddedUser")
  })
  it("rejects registration with role escalation attempt", async () => {
    const res = await request(app).post("/api/auth/register").send({ ...validUser, role: "admin" })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.errors).toContain("role field is not allowed")
  })
})

describe("POST /api/auth/login", () => {
  it("logs in a registered user", async () => {
    const register = await request(app).post("/api/auth/register").send(validUser)
    expect(register.status).toBe(201)
    const login = await request(app).post("/api/auth/login").send(validLoginData)
    expect(login.status).toBe(200)
    expect(login.body.success).toBe(true)
    expect(login.body.data.email).toBe(validUser.email)
    expect(login.body.data.password).toBeUndefined()
    const cookie = login.headers["set-cookie"][0]
    expect(cookie).toContain("token=")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Max-Age=604800")
  })
  it("rejects an extra field", async () => {
    const login = await request(app).post("/api/auth/login").send({...validLoginData,username:"pawan"})
    expect(login.status).toBe(400)
    expect(login.body.success).toBe(false)
    expect(login.body.message).toBe("invalid login data")
    expect(login.body.errors).toContain("username field is not allowed")
    expect(login.headers["set-cookie"]).toBeUndefined()
  })
  it("rejects an unregistered email", async () => {
    const login = await request(app).post("/api/auth/login").send(validLoginData)
    expect(login.status).toBe(401)
    expect(login.body.success).toBe(false)
    expect(login.body.message).toBe("Invalid Email Or Password")
    expect(login.headers["set-cookie"]).toBeUndefined()
  })
  it("rejects an invalid email type",async()=>{
    const login = await request(app).post("/api/auth/login").send({...validLoginData,email:1234567})
    expect(login.status).toBe(400)
    expect(login.body.success).toBe(false)
    expect(login.body.message).toBe("invalid login data")
    expect(login.body.errors).toContain("email must be a string")
    expect(login.headers["set-cookie"]).toBeUndefined()
  })
  it("rejects an invalid password type",async()=>{
    const login = await request(app).post("/api/auth/login").send({...validLoginData,password:1234567})
    expect(login.status).toBe(400)
    expect(login.body.success).toBe(false)
    expect(login.body.message).toBe("invalid login data")
    expect(login.body.errors).toContain("password must be a string")
    expect(login.headers["set-cookie"]).toBeUndefined()
  })
  it("rejects an empty email",async()=>{
    const login = await request(app).post("/api/auth/login").send({...validLoginData,email:""})
    expect(login.status).toBe(400)
    expect(login.body.success).toBe(false)
    expect(login.body.message).toBe("invalid login data")
    expect(login.body.errors).toContain("invalid email")
    expect(login.headers["set-cookie"]).toBeUndefined()
  })
  it("rejects an empty password",async()=>{
    const login = await request(app).post("/api/auth/login").send({...validLoginData,password:""})
    expect(login.status).toBe(400)
    expect(login.body.success).toBe(false)
    expect(login.body.message).toBe("invalid login data")
    expect(login.body.errors).toContain("password cannot be empty")
    expect(login.headers["set-cookie"]).toBeUndefined()
  })
  it("rejects a wrong password",async()=>{
    const register = await request(app).post("/api/auth/register").send(validUser)
    expect(register.status).toBe(201)
    const login = await request(app).post("/api/auth/login").send({...validLoginData,password:"1232ww23"})
    expect(login.status).toBe(401)
    expect(login.body.success).toBe(false)
    expect(login.body.message).toBe("Invalid Email Or Password")
    expect(login.headers["set-cookie"]).toBeUndefined()
  })
  it("rejects a wrong email",async()=>{
    const register = await request(app).post("/api/auth/register").send(validUser)
    expect(register.status).toBe(201)
    const login = await request(app).post("/api/auth/login").send({...validLoginData,email:"123@gmail.com"})
    expect(login.status).toBe(401)
    expect(login.body.success).toBe(false)
    expect(login.body.message).toBe("Invalid Email Or Password")
    expect(login.headers["set-cookie"]).toBeUndefined()
  })
  it("rejects a missing password",async()=>{
    const login = await request(app).post("/api/auth/login").send({...validLoginData,password:undefined})
    expect(login.status).toBe(400)
    expect(login.body.success).toBe(false)
    expect(login.body.message).toBe("invalid login data")
    expect(login.body.errors).toContain("password field is required")
    expect(login.headers["set-cookie"]).toBeUndefined()
  })
  it("rejects a missing email",async()=>{
    const login = await request(app).post("/api/auth/login").send({...validLoginData,email:undefined})
    expect(login.status).toBe(400)
    expect(login.body.success).toBe(false)
    expect(login.body.message).toBe("invalid login data")
    expect(login.body.errors).toContain("email field is required")
    expect(login.headers["set-cookie"]).toBeUndefined()
  })
  it("rejects an invalid email format",async()=>{
    const login = await request(app).post("/api/auth/login").send({...validLoginData,email:"testgmail.com"})
    expect(login.status).toBe(400)
    expect(login.body.success).toBe(false)
    expect(login.body.message).toBe("invalid login data")
    expect(login.body.errors).toContain("invalid email")
    expect(login.headers["set-cookie"]).toBeUndefined()
  })
  it("logs in with email case-insensitively and with whitespace", async () => {
    const register = await request(app).post("/api/auth/register").send(validUser)
    expect(register.status).toBe(201)

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "  TEST@GMAIL.COM  ", password: validUser.password })
    expect(login.status).toBe(200)
    expect(login.body.success).toBe(true)
    expect(login.body.data.email).toBe(validUser.email.toLowerCase())
  })
})

describe("POST /api/auth/logout", () => {
  it("logs out a user and clears the auth cookie", async () => {
    const res = await request(app).post("/api/auth/logout")
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toBe("Logged Out Successfully")
    const cookie = res.headers["set-cookie"]?.[0]
    expect(cookie).toBeDefined()
    expect(cookie).toMatch(/token=;/)
  })
})

describe("GET /api/auth/me", () => {
  it("returns current user profile when valid token cookie is provided", async () => {
    const register = await request(app).post("/api/auth/register").send(validUser)
    expect(register.status).toBe(201)
    const cookie = register.headers["set-cookie"]
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.email).toBe(validUser.email.toLowerCase())
    expect(res.body.data.username).toBe(validUser.username)
    expect(res.body.data.role).toBe("user")
    expect(res.body.data.password).toBeUndefined()
  })
  it("rejects request without token cookie", async () => {
    const res = await request(app).get("/api/auth/me")
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("Unauthorized")
  })
  it("rejects request with invalid or tampered token cookie", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", ["token=invalid-jwt-token"])
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("Unauthorized")
  })
  it("rejects request if the user was deleted after token was issued", async () => {
    const register = await request(app).post("/api/auth/register").send(validUser)
    expect(register.status).toBe(201)
    const cookie = register.headers["set-cookie"]
    await User.deleteMany({})
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie)
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("Unauthorized")
  })
})
