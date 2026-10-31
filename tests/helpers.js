import request from "supertest"
import jwt from "jsonwebtoken"
import app from "../src/app.js"
import { User } from "../src/models/userModel.js"

let counter = 0

export const guest = () => request(app)

export async function newUser(overrides = {}) {
    counter++
    const credentials = {
        username: `user${counter}`,
        email: `user${counter}@test.com`,
        password: "Passw0rd!x",
        ...overrides,
    }
    const agent = request.agent(app)
    const res = await agent.post("/api/auth/register").send(credentials)
    if (res.status !== 201) {
        throw new Error(`newUser failed: ${res.status} ${JSON.stringify(res.body)}`)
    }
    const user = await User.findOne({ email: credentials.email.toLowerCase() })
    return { agent, id: String(user._id), email: credentials.email, password: credentials.password }
}


export async function newAdmin() {
    const user = await newUser()
    await setRole(user.id, "admin")
    return user
}

export const setRole = (userId, role) => User.updateOne({ _id: userId }, { $set: { role } })

export async function makePost(agent, fields = {}) {
    const res = await agent.post("/api/posts").send({
        title: "A test post",
        content: "long enough content here",
        status: "published",
        ...fields,
    })
    if (res.status !== 201) {
        throw new Error(`makePost failed: ${res.status} ${JSON.stringify(res.body)}`)
    }
    return res.body.data._id
}

export async function makeComment(agent, postId, content = "a comment") {
    const res = await agent.post(`/api/posts/${postId}/comments`).send({ content })
    if (res.status !== 201) {
        throw new Error(`makeComment failed: ${res.status} ${JSON.stringify(res.body)}`)
    }
    return res.body.data._id
}


export const withToken = (token) => ({ Cookie: `token=${token}` })
export const signToken = (payload, secret = "test-secret") => jwt.sign(payload, secret)

export const MISSING_ID = "64b000000000000000000000"
