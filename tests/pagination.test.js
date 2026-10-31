import { describe, it, expect } from "vitest"
import { guest, newUser, makePost } from "./helpers.js"
import Post from "../src/models/postModel.js"

const bulk = (count, author, status = "published", prefix = "bulk") =>
    Post.insertMany(Array.from({ length: count }, (_, i) => ({
        title: `${prefix} ${i}`, content: "long enough content", status, author,
    })))

describe("GET /api/posts (public feed)", () => {
    it("returns only published posts, with count and page info", async () => {
        const user = await newUser()
        await bulk(7, user.id)
        await bulk(2, user.id, "draft", "draft")
        await bulk(1, user.id, "archived", "archived")
        const res = await guest().get("/api/posts")
        expect(res.status).toBe(200)
        const { posts, postsCount, page, totalPages } = res.body.data
        expect(posts).toHaveLength(7)
        expect(posts.every((p) => p.status === "published")).toBe(true)
        expect(postsCount).toBe(7)
        expect(page).toBe(1)
        expect(totalPages).toBe(1)
    })

    it("pages through everything exactly once, newest first", async () => {
        const user = await newUser()
        await bulk(23, user.id)
        const page2 = await guest().get("/api/posts?page=2&limit=5")
        expect(page2.body.data.posts).toHaveLength(5)
        expect(page2.body.data.page).toBe(2)
        expect(page2.body.data.totalPages).toBe(5)

        const seen = []
        const times = []
        for (let p = 1; p <= 5; p++) {
            const res = await guest().get(`/api/posts?page=${p}&limit=5`)
            for (const post of res.body.data.posts) {
                seen.push(post._id)
                times.push(new Date(post.createdAt).getTime())
            }
        }
        expect(seen).toHaveLength(23)
        expect(new Set(seen).size).toBe(23)
        expect(times.every((t, i) => i === 0 || times[i - 1] >= t)).toBe(true)
    })

    it("returns an empty list past the last page, with the count intact", async () => {
        const user = await newUser()
        await bulk(10, user.id)
        const res = await guest().get("/api/posts?page=99&limit=5")
        expect(res.status).toBe(200)
        expect(res.body.data.posts).toEqual([])
        expect(res.body.data.postsCount).toBe(10)
    })

    it("caps limit at 50 and falls back to defaults for bad queries", async () => {
        const user = await newUser()
        await bulk(60, user.id)
        expect((await guest().get("/api/posts?limit=1000")).body.data.posts).toHaveLength(50)
        for (const query of ["?page=abc&limit=-5", "?page=0", "?limit=0", "?page=2.5", "?page=1&page=2"]) {
            const res = await guest().get(`/api/posts${query}`)
            expect(res.status).toBe(200)
            expect(res.body.data.page).toBeGreaterThanOrEqual(1)
            expect(Number.isFinite(res.body.data.totalPages)).toBe(true)
        }
    })

    it("walks 62 posts in pages of 5 without skipping or repeating any", async () => {
        const user = await newUser()
        await bulk(62, user.id)
        const seen = []
        for (let p = 1; p <= 13; p++) {
            seen.push(...(await guest().get(`/api/posts?page=${p}&limit=5`)).body.data.posts.map((x) => x._id))
        }
        expect(seen).toHaveLength(62)
        expect(new Set(seen).size).toBe(62)
    })
})

describe("GET /api/posts/mine", () => {
    it("requires a login", async () => {
        expect((await guest().get("/api/posts/mine")).status).toBe(401)
    })

    it("returns all of the user's own posts, drafts and archived included, and none of anyone else's", async () => {
        const ann = await newUser()
        const bo = await newUser()
        await bulk(7, ann.id, "published", "ann pub")
        await bulk(2, ann.id, "draft", "ann draft")
        await bulk(1, ann.id, "archived", "ann archived")
        await bulk(3, bo.id, "published", "bo pub")
        await bulk(1, bo.id, "draft", "bo draft")

        const mine = await ann.agent.get("/api/posts/mine")
        expect(mine.status).toBe(200)
        expect(mine.body.data.postsCount).toBe(10)
        expect(mine.body.data.posts).toHaveLength(10)
        const statuses = new Set(mine.body.data.posts.map((p) => p.status))
        expect(statuses.has("draft") && statuses.has("archived")).toBe(true)

        const boPosts = await bo.agent.get("/api/posts/mine")
        expect(boPosts.body.data.postsCount).toBe(4)
        expect(boPosts.body.data.posts.every((p) => p.title.startsWith("bo"))).toBe(true)
    })

    it("pages one post at a time through the whole list", async () => {
        const ann = await newUser()
        await bulk(10, ann.id)
        const first = await ann.agent.get("/api/posts/mine?limit=1")
        expect(first.body.data.totalPages).toBe(10)
        const seen = []
        for (let p = 1; p <= 10; p++) {
            seen.push(...(await ann.agent.get(`/api/posts/mine?page=${p}&limit=1`)).body.data.posts.map((x) => x._id))
        }
        expect(new Set(seen).size).toBe(10)
    })

    it("returns an empty list, not an error, for a user with no posts", async () => {
        const user = await newUser()
        const res = await user.agent.get("/api/posts/mine")
        expect(res.status).toBe(200)
        expect(res.body.data.posts).toEqual([])
        expect(res.body.data.postsCount).toBe(0)
        expect(res.body.data.totalPages).toBe(0)
    })
})
