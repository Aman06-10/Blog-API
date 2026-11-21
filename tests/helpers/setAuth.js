import request from "supertest"
import app from "../../src/app.js"

export async function registerAgent(userData) {
    const agent = request.agent(app)
    const res = await agent.post("/api/auth/register").send(userData).expect(201)
    return { agent, user: res.body.data }
}