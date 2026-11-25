import request from "supertest"
import app from "../../src/app.js"
import { User } from "../../src/models/userModel.js"
import { validAdmin, validModerator } from "./testData.js"

export async function registerAgent(userData) {
    const agent = request.agent(app)
    const res = await agent.post("/api/auth/register").send(userData).expect(201)
    return { agent, user: res.body.data }
}

export async function registerModerator(modData = validModerator) {
    const { agent, user } = await registerAgent(modData)
    await User.findByIdAndUpdate(user._id, { role: "moderator" })
    return { agent, user: { ...user, role: "moderator" } }
}

export async function registerAdmin(adminData = validAdmin) {
    const { agent, user } = await registerAgent(adminData)
    await User.findByIdAndUpdate(user._id, { role: "admin" })
    return { agent, user: { ...user, role: "admin" } }
}