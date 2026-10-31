import { describe, it, expect } from "vitest"
import { guest, newUser, newAdmin, makePost, makeComment, MISSING_ID } from "./helpers.js"
import Comment from "../src/models/commentModel.js"

// Rules under test:
//  - A post is visible if it is published, or the viewer is its author.
//  - Commenting and listing comments need the post to be visible; a hidden post gives 404.
//  - Edit: only the comment's author.
//  - Delete: the comment's author, the post's author, or an admin.

describe("POST /api/posts/:id/comments", () => {
    it("lets a logged-in user comment on a published post", async () => {
        const author = await newUser()
        const commenter = await newUser()
        const post = await makePost(author.agent)
        const res = await commenter.agent.post(`/api/posts/${post}/comments`).send({ content: "first!" })
        expect(res.status).toBe(201)
        expect(res.body.data.editedAt).toBeNull()
        expect(String(res.body.data.author)).toBe(commenter.id)
        expect(String(res.body.data.post)).toBe(post)
    })

    it.each(["draft", "archived"])("hides a %s post from strangers (404) but lets its author comment", async (status) => {
        const author = await newUser()
        const stranger = await newUser()
        const post = await makePost(author.agent, { status })
        expect((await stranger.agent.post(`/api/posts/${post}/comments`).send({ content: "nope" })).status).toBe(404)
        expect((await author.agent.post(`/api/posts/${post}/comments`).send({ content: "my note" })).status).toBe(201)
    })

    it("requires a login", async () => {
        const author = await newUser()
        const post = await makePost(author.agent)
        expect((await guest().post(`/api/posts/${post}/comments`).send({ content: "guest" })).status).toBe(401)
    })

    it("accepts 1 and 500 characters", async () => {
        const author = await newUser()
        const post = await makePost(author.agent)
        expect((await author.agent.post(`/api/posts/${post}/comments`).send({ content: "x" })).status).toBe(201)
        expect((await author.agent.post(`/api/posts/${post}/comments`).send({ content: "x".repeat(500) })).status).toBe(201)
    })

    it.each([
        ["whitespace only", { content: "   " }],
        ["empty body", {}],
        ["501 characters", { content: "x".repeat(501) }],
        ["numeric content", { content: 123 }],
        ["null content", { content: null }],
        ["extra key (post)", { content: "hi", post: "64b000000000000000000001" }],
        ["forged author", { content: "hi", author: "64b000000000000000000001" }],
    ])("rejects bad input: %s -> 400", async (_name, body) => {
        const author = await newUser()
        const post = await makePost(author.agent)
        expect((await author.agent.post(`/api/posts/${post}/comments`).send(body)).status).toBe(400)
    })

    it("names the offending field when an extra key is sent", async () => {
        const author = await newUser()
        const post = await makePost(author.agent)
        const res = await author.agent.post(`/api/posts/${post}/comments`).send({ content: "hi", post: "x" })
        expect(JSON.stringify(res.body)).toContain("post field is not allowed")
    })

    it("returns 400 for a malformed post id, 404 for a missing post, 400 for malformed JSON", async () => {
        const user = await newUser()
        expect((await user.agent.post("/api/posts/not-an-id/comments").send({ content: "hi" })).status).toBe(400)
        expect((await user.agent.post(`/api/posts/${MISSING_ID}/comments`).send({ content: "hi" })).status).toBe(404)
        const res = await user.agent.post(`/api/posts/${MISSING_ID}/comments`).set("Content-Type", "application/json").send("{bad")
        expect(res.status).toBe(400)
    })
})

describe("GET /api/posts/:id/comments", () => {
    it("lets a guest list comments on a published post, with pagination info", async () => {
        const author = await newUser()
        const post = await makePost(author.agent)
        await makeComment(author.agent, post, "one")
        await makeComment(author.agent, post, "two")
        const res = await guest().get(`/api/posts/${post}/comments`)
        expect(res.status).toBe(200)
        const { comments, commentsCount, page, totalPages } = res.body.data
        expect(comments).toHaveLength(2)
        expect(commentsCount).toBe(2)
        expect(page).toBe(1)
        expect(totalPages).toBe(1)
    })

    it("returns an empty list (not an error) for a post with no comments", async () => {
        const author = await newUser()
        const post = await makePost(author.agent)
        const res = await guest().get(`/api/posts/${post}/comments`)
        expect(res.status).toBe(200)
        expect(res.body.data.comments).toEqual([])
        expect(res.body.data.commentsCount).toBe(0)
        expect(res.body.data.totalPages).toBe(0)
    })

    it("hides the comments of a draft from guests and strangers, shows them to the author", async () => {
        const author = await newUser()
        const stranger = await newUser()
        const post = await makePost(author.agent, { status: "draft" })
        await makeComment(author.agent, post, "my note")
        expect((await guest().get(`/api/posts/${post}/comments`)).status).toBe(404)
        expect((await stranger.agent.get(`/api/posts/${post}/comments`)).status).toBe(404)
        const res = await author.agent.get(`/api/posts/${post}/comments`)
        expect(res.status).toBe(200)
        expect(res.body.data.commentsCount).toBe(1)
    })

    it("returns 400 for a malformed id and 404 for a missing post", async () => {
        expect((await guest().get("/api/posts/nope/comments")).status).toBe(400)
        expect((await guest().get(`/api/posts/${MISSING_ID}/comments`)).status).toBe(404)
    })

    it("pages newest first, with every comment appearing exactly once", async () => {
        const author = await newUser()
        const post = await makePost(author.agent)
        // Created straight in the database so many share the same timestamp (tests the tie-break).
        await Comment.insertMany(Array.from({ length: 60 }, (_, i) => ({ content: "c" + i, post, author: author.id })))

        const page2 = await guest().get(`/api/posts/${post}/comments?page=2&limit=5`)
        expect(page2.body.data.comments).toHaveLength(5)
        expect(page2.body.data.page).toBe(2)
        expect(page2.body.data.totalPages).toBe(12)

        const seen = []
        for (let p = 1; p <= 12; p++) {
            const res = await guest().get(`/api/posts/${post}/comments?page=${p}&limit=5`)
            seen.push(...res.body.data.comments.map((c) => c._id))
        }
        expect(seen).toHaveLength(60)
        expect(new Set(seen).size).toBe(60)
    })

    it("caps limit at 50 and falls back to defaults for bad queries", async () => {
        const author = await newUser()
        const post = await makePost(author.agent)
        await Comment.insertMany(Array.from({ length: 60 }, (_, i) => ({ content: "c" + i, post, author: author.id })))
        expect((await guest().get(`/api/posts/${post}/comments?limit=1000`)).body.data.comments).toHaveLength(50)
        for (const query of ["?page=abc&limit=-5", "?page=0", "?limit=0", "?page=2.5", "?page=1&page=2"]) {
            const res = await guest().get(`/api/posts/${post}/comments${query}`)
            expect(res.status).toBe(200)
            expect(res.body.data.page).toBeGreaterThanOrEqual(1)
            expect(Number.isFinite(res.body.data.totalPages)).toBe(true)
        }
    })
})

describe("PATCH /api/comments/:id", () => {
    it("lets the author edit: content is trimmed and editedAt is set", async () => {
        const author = await newUser()
        const commenter = await newUser()
        const post = await makePost(author.agent)
        const id = await makeComment(commenter.agent, post, "original")
        const res = await commenter.agent.patch(`/api/comments/${id}`).send({ content: "  edited text  " })
        expect(res.status).toBe(200)
        expect(res.body.data.content).toBe("edited text")
        expect(Date.parse(res.body.data.editedAt)).not.toBeNaN()
        expect(String(res.body.data.post)).toBe(post)
    })

    it("does not count an unchanged edit as an edit", async () => {
        const author = await newUser()
        const post = await makePost(author.agent)
        const id = await makeComment(author.agent, post, "same text")
        const unchanged = await author.agent.patch(`/api/comments/${id}`).send({ content: "  same text  " })
        expect(unchanged.status).toBe(200)
        expect(unchanged.body.data.editedAt).toBeNull()

        const edited = await author.agent.patch(`/api/comments/${id}`).send({ content: "changed" })
        const again = await author.agent.patch(`/api/comments/${id}`).send({ content: " changed " })
        expect(again.body.data.editedAt).toBe(edited.body.data.editedAt)
    })

    it("only the comment's author may edit: the post's author and strangers get 403", async () => {
        const postAuthor = await newUser()
        const commenter = await newUser()
        const stranger = await newUser()
        const post = await makePost(postAuthor.agent)
        const id = await makeComment(commenter.agent, post, "mine")
        expect((await postAuthor.agent.patch(`/api/comments/${id}`).send({ content: "rewrite" })).status).toBe(403)
        expect((await stranger.agent.patch(`/api/comments/${id}`).send({ content: "rewrite" })).status).toBe(403)
        expect((await Comment.findById(id)).content).toBe("mine")
    })

    it("requires a login", async () => {
        const author = await newUser()
        const post = await makePost(author.agent)
        const id = await makeComment(author.agent, post)
        expect((await guest().patch(`/api/comments/${id}`).send({ content: "guest" })).status).toBe(401)
    })

    it.each([
        ["empty body", {}],
        ["whitespace only", { content: "   " }],
        ["501 characters", { content: "y".repeat(501) }],
        ["numeric content", { content: 5 }],
        ["forged author and editedAt", { content: "ok", author: "64b000000000000000000001", editedAt: null }],
    ])("rejects bad input: %s -> 400", async (_name, body) => {
        const author = await newUser()
        const post = await makePost(author.agent)
        const id = await makeComment(author.agent, post)
        expect((await author.agent.patch(`/api/comments/${id}`).send(body)).status).toBe(400)
    })

    it("returns 404 for a missing comment and 400 for a malformed id", async () => {
        const user = await newUser()
        expect((await user.agent.patch(`/api/comments/${MISSING_ID}`).send({ content: "x" })).status).toBe(404)
        expect((await user.agent.patch("/api/comments/not-an-id").send({ content: "x" })).status).toBe(400)
    })

    it("gives 404 when the post is no longer visible to the commenter", async () => {
        const postAuthor = await newUser()
        const commenter = await newUser()
        const post = await makePost(postAuthor.agent)
        const id = await makeComment(commenter.agent, post)
        await postAuthor.agent.patch(`/api/posts/${post}`).send({ status: "draft" })
        expect((await commenter.agent.patch(`/api/comments/${id}`).send({ content: "still here?" })).status).toBe(404)
    })

    it("lets the post's author edit their own comment on their own draft", async () => {
        const author = await newUser()
        const post = await makePost(author.agent, { status: "draft" })
        const id = await makeComment(author.agent, post, "note")
        const res = await author.agent.patch(`/api/comments/${id}`).send({ content: "note v2" })
        expect(res.status).toBe(200)
        expect(res.body.data.content).toBe("note v2")
    })
})

describe("DELETE /api/comments/:id", () => {
    it("lets the comment's author delete it", async () => {
        const postAuthor = await newUser()
        const commenter = await newUser()
        const post = await makePost(postAuthor.agent)
        const id = await makeComment(commenter.agent, post)
        const res = await commenter.agent.delete(`/api/comments/${id}`)
        expect(res.status).toBe(200)
        expect(res.body.data._id).toBe(id)
        expect(await Comment.findById(id)).toBeNull()
    })

    it("lets the post's author delete someone else's comment", async () => {
        const postAuthor = await newUser()
        const commenter = await newUser()
        const post = await makePost(postAuthor.agent)
        const id = await makeComment(commenter.agent, post)
        expect((await postAuthor.agent.delete(`/api/comments/${id}`)).status).toBe(200)
    })

    it("lets an admin delete any comment", async () => {
        const postAuthor = await newUser()
        const commenter = await newUser()
        const admin = await newAdmin()
        const post = await makePost(postAuthor.agent)
        const id = await makeComment(commenter.agent, post)
        expect((await admin.agent.delete(`/api/comments/${id}`)).status).toBe(200)
    })

    it("gives a stranger 403 and a guest 401, and the comment survives", async () => {
        const postAuthor = await newUser()
        const commenter = await newUser()
        const stranger = await newUser()
        const post = await makePost(postAuthor.agent)
        const id = await makeComment(commenter.agent, post)
        expect((await stranger.agent.delete(`/api/comments/${id}`)).status).toBe(403)
        expect((await guest().delete(`/api/comments/${id}`)).status).toBe(401)
        expect(await Comment.findById(id)).not.toBeNull()
    })

    it("a second delete of the same comment gives 404", async () => {
        const author = await newUser()
        const post = await makePost(author.agent)
        const id = await makeComment(author.agent, post)
        await author.agent.delete(`/api/comments/${id}`)
        expect((await author.agent.delete(`/api/comments/${id}`)).status).toBe(404)
    })

    it("handles comments under a hidden post: admin may delete, a stranger gets 404", async () => {
        const postAuthor = await newUser()
        const stranger = await newUser()
        const admin = await newAdmin()
        const draft = await makePost(postAuthor.agent, { status: "draft" })
        const a = await makeComment(postAuthor.agent, draft, "note 1")
        const b = await makeComment(postAuthor.agent, draft, "note 2")
        expect((await stranger.agent.delete(`/api/comments/${a}`)).status).toBe(404)
        expect((await admin.agent.delete(`/api/comments/${b}`)).status).toBe(200)
    })

    it("a commenter loses access once the post is hidden, but the post's author can still delete", async () => {
        const postAuthor = await newUser()
        const commenter = await newUser()
        const post = await makePost(postAuthor.agent)
        const id = await makeComment(commenter.agent, post)
        await postAuthor.agent.patch(`/api/posts/${post}`).send({ status: "draft" })
        expect((await commenter.agent.delete(`/api/comments/${id}`)).status).toBe(404)
        expect((await postAuthor.agent.delete(`/api/comments/${id}`)).status).toBe(200)
    })

    it("returns 404 for a missing comment and 400 for a malformed id", async () => {
        const user = await newUser()
        expect((await user.agent.delete(`/api/comments/${MISSING_ID}`)).status).toBe(404)
        expect((await user.agent.delete("/api/comments/not-an-id")).status).toBe(400)
    })

    it("lowers the comment count of the post", async () => {
        const author = await newUser()
        const post = await makePost(author.agent)
        const ids = []
        for (let i = 0; i < 4; i++) ids.push(await makeComment(author.agent, post, "n" + i))
        await author.agent.delete(`/api/comments/${ids[0]}`)
        await author.agent.delete(`/api/comments/${ids[1]}`)
        expect((await guest().get(`/api/posts/${post}/comments`)).body.data.commentsCount).toBe(2)
    })
})
