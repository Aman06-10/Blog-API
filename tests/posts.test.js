import { describe, it, expect } from "vitest"
import { guest, newUser, makePost, makeComment, MISSING_ID } from "./helpers.js"
import Comment from "../src/models/commentModel.js"

const valid = { title: "A valid title", content: "long enough content here" }

describe("POST /api/posts", () => {
    it("creates a draft by default, with the author taken from the login", async () => {
        const user = await newUser()
        const res = await user.agent.post("/api/posts").send(valid)
        expect(res.status).toBe(201)
        expect(res.body.data.status).toBe("draft")
        expect(String(res.body.data.author)).toBe(user.id)
    })

    it("creates published and archived posts", async () => {
        const user = await newUser()
        expect((await user.agent.post("/api/posts").send({ ...valid, status: "published", tags: ["a"] })).status).toBe(201)
        expect((await user.agent.post("/api/posts").send({ ...valid, status: "archived" })).status).toBe(201)
    })

    it("requires a login", async () => {
        expect((await guest().post("/api/posts").send(valid)).status).toBe(401)
    })

    it("trims the title and content before storing", async () => {
        const user = await newUser()
        const res = await user.agent.post("/api/posts").send({ title: "  Padded title  ", content: "   padded content here   " })
        expect(res.body.data.title).toBe("Padded title")
        expect(res.body.data.content).toBe("padded content here")
    })

    it.each([
        ["missing title", { content: valid.content }],
        ["missing content", { title: valid.title }],
        ["title too short", { ...valid, title: "ab" }],
        ["title too long", { ...valid, title: "t".repeat(151) }],
        ["content too short", { ...valid, content: "short" }],
        ["invalid status", { ...valid, status: "invalid_status" }],
        ["tags not an array", { ...valid, tags: "node" }],
        ["author spoofing", { ...valid, author: "64b000000000000000000001" }],
    ])("rejects bad input: %s -> 400", async (_name, body) => {
        const user = await newUser()
        expect((await user.agent.post("/api/posts").send(body)).status).toBe(400)
    })
})

describe("GET /api/posts/:id (visibility)", () => {
    it("published posts are visible to everyone", async () => {
        const author = await newUser()
        const stranger = await newUser()
        const id = await makePost(author.agent, { status: "published" })
        expect((await guest().get(`/api/posts/${id}`)).status).toBe(200)
        expect((await stranger.agent.get(`/api/posts/${id}`)).status).toBe(200)
    })

    it.each(["draft", "archived"])("%s posts are hidden (404) from guests and strangers but visible to the author", async (status) => {
        const author = await newUser()
        const stranger = await newUser()
        const id = await makePost(author.agent, { status })
        expect((await guest().get(`/api/posts/${id}`)).status).toBe(404)
        expect((await stranger.agent.get(`/api/posts/${id}`)).status).toBe(404)
        expect((await author.agent.get(`/api/posts/${id}`)).status).toBe(200)
    })

    it("returns 400 for a malformed id and 404 for a missing one", async () => {
        expect((await guest().get("/api/posts/invalid-id-format")).status).toBe(400)
        expect((await guest().get(`/api/posts/${MISSING_ID}`)).status).toBe(404)
    })
})

describe("PATCH /api/posts/:id", () => {
    it("lets the author update title, content, tags and status", async () => {
        const author = await newUser()
        const id = await makePost(author.agent, { status: "draft" })
        const res = await author.agent.patch(`/api/posts/${id}`).send({ title: "New title", content: "new content that is long enough" })
        expect(res.status).toBe(200)
        expect(res.body.data.title).toBe("New title")
        expect((await author.agent.patch(`/api/posts/${id}`).send({ status: "published" })).body.data.status).toBe("published")
    })

    it("a status-only update leaves the other fields untouched", async () => {
        const author = await newUser()
        const id = await makePost(author.agent, { title: "Keep this title", tags: ["keep"], status: "draft" })
        const res = await author.agent.patch(`/api/posts/${id}`).send({ status: "published" })
        expect(res.body.data.title).toBe("Keep this title")
        expect(res.body.data.tags).toEqual(["keep"])
    })

    it("allows any status to change to any other", async () => {
        const author = await newUser()
        const id = await makePost(author.agent, { status: "draft" })
        for (const status of ["archived", "published", "draft", "published", "archived"]) {
            const res = await author.agent.patch(`/api/posts/${id}`).send({ status })
            expect(res.status).toBe(200)
            expect(res.body.data.status).toBe(status)
        }
    })

    it("gives a non-author 403 on a published post and 404 on a hidden one", async () => {
        const author = await newUser()
        const stranger = await newUser()
        const published = await makePost(author.agent, { status: "published" })
        const draft = await makePost(author.agent, { status: "draft" })
        expect((await stranger.agent.patch(`/api/posts/${published}`).send({ title: "hijacked" })).status).toBe(403)
        expect((await stranger.agent.patch(`/api/posts/${draft}`).send({ title: "hijacked" })).status).toBe(404)
    })

    it("requires a login", async () => {
        const author = await newUser()
        const id = await makePost(author.agent)
        expect((await guest().patch(`/api/posts/${id}`).send({ title: "no login" })).status).toBe(401)
    })

    it.each([
        ["empty body", {}],
        ["author change", { author: "64b000000000000000000001" }],
        ["title too short", { title: "ab" }],
        ["content too short", { content: "short" }],
        ["invalid status", { status: "deleted" }],
    ])("rejects bad input: %s -> 400", async (_name, body) => {
        const author = await newUser()
        const id = await makePost(author.agent)
        expect((await author.agent.patch(`/api/posts/${id}`).send(body)).status).toBe(400)
    })

    it("returns 404 for a missing post and 400 for a malformed id", async () => {
        const author = await newUser()
        expect((await author.agent.patch(`/api/posts/${MISSING_ID}`).send({ title: "new title" })).status).toBe(404)
        expect((await author.agent.patch("/api/posts/not-an-object-id").send({ title: "new title" })).status).toBe(400)
    })
})

describe("DELETE /api/posts/:id", () => {
    it("lets the author delete, and the post is gone afterwards", async () => {
        const author = await newUser()
        const id = await makePost(author.agent)
        expect((await author.agent.delete(`/api/posts/${id}`)).status).toBe(200)
        expect((await guest().get(`/api/posts/${id}`)).status).toBe(404)
    })

    it("requires a login, and a stranger gets 403 (published) or 404 (hidden)", async () => {
        const author = await newUser()
        const stranger = await newUser()
        const published = await makePost(author.agent, { status: "published" })
        const draft = await makePost(author.agent, { status: "draft" })
        expect((await guest().delete(`/api/posts/${published}`)).status).toBe(401)
        expect((await stranger.agent.delete(`/api/posts/${published}`)).status).toBe(403)
        expect((await stranger.agent.delete(`/api/posts/${draft}`)).status).toBe(404)
    })

    it("returns 400 for a malformed id and 404 for a missing post", async () => {
        const author = await newUser()
        expect((await author.agent.delete("/api/posts/not-an-id")).status).toBe(400)
        expect((await author.agent.delete(`/api/posts/${MISSING_ID}`)).status).toBe(404)
    })

    it("deletes the post's comments too, but only when the delete is allowed", async () => {
        const author = await newUser()
        const stranger = await newUser()
        const post = await makePost(author.agent)
        const other = await makePost(author.agent)
        for (let i = 0; i < 3; i++) await makeComment(stranger.agent, post, "c" + i)
        await makeComment(stranger.agent, other, "other post's comment")

        expect((await stranger.agent.delete(`/api/posts/${post}`)).status).toBe(403)
        expect(await Comment.countDocuments({ post })).toBe(3)

        expect((await author.agent.delete(`/api/posts/${post}`)).status).toBe(200)
        expect(await Comment.countDocuments({ post })).toBe(0)
        expect(await Comment.countDocuments({ post: other })).toBe(1)
    })

    it("deletes a post that has no comments", async () => {
        const author = await newUser()
        const id = await makePost(author.agent)
        expect((await author.agent.delete(`/api/posts/${id}`)).status).toBe(200)
    })
})
