import { describe, it, expect } from "vitest"
import { newUser, makePost } from "./helpers.js"

const base = { title: "Tag test post", content: "long enough content here" }
const tagsOf = (n) => Array.from({ length: n }, (_, i) => "t" + i)

describe("tag rules on create", () => {
    it("normalizes: trims, lowercases and removes duplicates", async () => {
        const user = await newUser()
        const res = await user.agent.post("/api/posts").send({ ...base, tags: ["Node", " node ", "NODE"] })
        expect(res.status).toBe(201)
        expect(res.body.data.tags).toEqual(["node"])
        const other = await user.agent.post("/api/posts").send({ ...base, tags: ["  Express  ", "MongoDB"] })
        expect(other.body.data.tags).toEqual(["express", "mongodb"])
    })

    it("allows at most 10 tags, counted before duplicates are removed", async () => {
        const user = await newUser()
        expect((await user.agent.post("/api/posts").send({ ...base, tags: tagsOf(10) })).status).toBe(201)
        const eleven = await user.agent.post("/api/posts").send({ ...base, tags: tagsOf(11) })
        expect(eleven.status).toBe(400)
        expect(JSON.stringify(eleven.body)).toContain("at most 10")
        expect((await user.agent.post("/api/posts").send({ ...base, tags: Array(11).fill("node") })).status).toBe(400)
    })

    it("limits a tag to 30 characters, judged after trimming", async () => {
        const user = await newUser()
        expect((await user.agent.post("/api/posts").send({ ...base, tags: ["a".repeat(30)] })).status).toBe(201)
        expect((await user.agent.post("/api/posts").send({ ...base, tags: ["  " + "a".repeat(30) + "  "] })).status).toBe(201)
        const long = await user.agent.post("/api/posts").send({ ...base, tags: ["a".repeat(31)] })
        expect(long.status).toBe(400)
        expect(JSON.stringify(long.body)).toContain("at most 30")
    })

    it("accepts no tags and an empty array", async () => {
        const user = await newUser()
        const none = await user.agent.post("/api/posts").send(base)
        expect(none.status).toBe(201)
        expect(none.body.data.tags).toEqual([])
        expect((await user.agent.post("/api/posts").send({ ...base, tags: [] })).body.data.tags).toEqual([])
    })

    it.each([
        ["only spaces", ["   "]],
        ["empty string", [""]],
        ["a number", [5]],
        ["null", [null]],
        ["a string instead of an array", "node"],
    ])("rejects bad tags: %s -> 400 (never a 500)", async (_name, tags) => {
        const user = await newUser()
        expect((await user.agent.post("/api/posts").send({ ...base, tags })).status).toBe(400)
    })
})

describe("tag rules on update", () => {
    it("normalizes and removes duplicates", async () => {
        const user = await newUser()
        const id = await makePost(user.agent)
        const res = await user.agent.patch(`/api/posts/${id}`).send({ tags: ["Redis", " redis", "REDIS ", "Cache"] })
        expect(res.status).toBe(200)
        expect(res.body.data.tags).toEqual(["redis", "cache"])
    })

    it("enforces the count and length limits", async () => {
        const user = await newUser()
        const id = await makePost(user.agent)
        expect((await user.agent.patch(`/api/posts/${id}`).send({ tags: tagsOf(11) })).status).toBe(400)
        expect((await user.agent.patch(`/api/posts/${id}`).send({ tags: ["b".repeat(31)] })).status).toBe(400)
    })

    it("clears the tags with an empty array", async () => {
        const user = await newUser()
        const id = await makePost(user.agent, { tags: ["keep"] })
        const res = await user.agent.patch(`/api/posts/${id}`).send({ tags: [] })
        expect(res.status).toBe(200)
        expect(res.body.data.tags).toEqual([])
    })
})
