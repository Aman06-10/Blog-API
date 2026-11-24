import request from "supertest"
import app from "../../src/app.js"

export async function registerAgent(userData) {
    const agent = request.agent(app)
    const res = await agent.post("/api/auth/register").send(userData).expect(201)
    return { agent, user: res.body.data }
}
import { User } from "../../src/models/userModel.js"
import { validAdmin } from "./testData.js"

export async function registerAdmin(adminData = validAdmin) {
    const { agent, user } = await registerAgent(adminData)
    await User.findByIdAndUpdate(user._id, { role: "admin" })
    return { agent, user: { ...user, role: "admin" } }
}
