import { describe, it, expect } from "vitest"
import request from "supertest"
import mongoose from "mongoose"
import app from "../src/app.js"
import Post from "../src/models/postModel.js"
import Comment from "../src/models/commentModel.js"
import Like from "../src/models/likeModel.js"
import { validLoginData, validUser, validUser2, validPost1, validPost2 } from "./helpers/testData.js"
import { registerAgent, registerAdmin } from "./helpers/setAuth.js"

describe("POST /api/posts", () => {
    it("create a post successfully with explicit login cookie (end-to-end)", async () => {
        const register = await request(app).post("/api/auth/register").send(validUser)
        expect(register.status).toBe(201)
        const login = await request(app).post("/api/auth/login").send(validLoginData)
        expect(login.status).toBe(200)
        const cookie = login.headers["set-cookie"][0].split(";")[0]
        expect(cookie).toContain("token=")
        const res = await request(app).post("/api/posts").set("Cookie", cookie).send(validPost1)
        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.message).toBe("Post added successfully")
        const post = await Post.findOne({ title: validPost1.title })
        expect(post).not.toBeNull()
        expect(post.content).toBe(validPost1.content)
    })
    it("rejects post creation without a token", async () => {
        const res = await request(app).post("/api/posts").send(validPost1)
        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
    })
    it("rejects post creation with an invalid token", async () => {
        const res = await request(app).post("/api/posts").set("Cookie", "token=not.a.real.jwt").send(validPost1)
        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
    })
    it("creates a post using an agent (cookie persists)", async () => {
        const {agent,user} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send(validPost1)
        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        const post = await Post.findOne({ title: validPost1.title })
        expect(post).not.toBeNull()
        expect(post.author.toString()).toBe(user._id.toString())
        expect(post.content).toBe(validPost1.content)
    })
    it("rejects post creation with empty postData", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({})
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("title field is required")
        expect(res.body.errors).toContain("content field is required")
        const rejectedCount = await Post.countDocuments()
        expect(rejectedCount).toBe(0)
    })
    it("rejects post creation with title missing", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, title: undefined })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("title field is required")
        const rejectedCount = await Post.countDocuments({ content: validPost1.content })
        expect(rejectedCount).toBe(0)
    })
    it("rejects post creation with content missing", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, content: undefined })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("content field is required")
        const rejectedCount = await Post.countDocuments({ title: validPost1.title })
        expect(rejectedCount).toBe(0)
    })
    it("rejects post creation with extra field", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, blog: "api" })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("blog field is not allowed")
        const rejectedCount = await Post.countDocuments({ title: validPost1.title })
        expect(rejectedCount).toBe(0)
    })
    it("rejects post creation with title empty", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, title: " " })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("title length should be between 3 and 150")
        const rejectedCount = await Post.countDocuments({ content: validPost1.content })
        expect(rejectedCount).toBe(0)
    })
    it("rejects post creation with content empty", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, content: " " })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("content is too short")
        const rejectedCount = await Post.countDocuments({ title: validPost1.title })
        expect(rejectedCount).toBe(0)
    })
    it("rejects post creation with invalid title data type", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, title: 12345 })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("title must be a string")
        const rejectedCount = await Post.countDocuments({ content: validPost1.content })
        expect(rejectedCount).toBe(0)
    })
    it("rejects post creation with invalid content data type", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, content: 12345 })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("content must be a string")
        const rejectedCount = await Post.countDocuments({ title: validPost1.title })
        expect(rejectedCount).toBe(0)
    })
    it("rejects post creation with invalid status data type", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, status: 12345 })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("status must be a string")
        const rejectedCount = await Post.countDocuments({ title: validPost1.title })
        expect(rejectedCount).toBe(0)
    })
    it("rejects post creation with invalid tags data type", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, tags: "test" })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("tags must be an array")
        const rejectedCount = await Post.countDocuments({ title: validPost1.title })
        expect(rejectedCount).toBe(0)
    })
    it("rejects post creation with title too short", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, title: "ab" })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("title length should be between 3 and 150")
        const rejectedCount = await Post.countDocuments({ title: "ab" })
        expect(rejectedCount).toBe(0)
    })
    it("rejects post creation with title too long", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, title: "a".repeat(151) })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("title length should be between 3 and 150")
        const rejectedCount = await Post.countDocuments({ title: "a".repeat(151) })
        expect(rejectedCount).toBe(0)
    })
    it("rejects post creation with content too short", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, content: "short" })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("content is too short")
        const rejectedCount = await Post.countDocuments({ title: validPost1.title })
        expect(rejectedCount).toBe(0)
    })
    it("rejects post creation with invalid status value", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, status: "pending" })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post data")
        expect(res.body.errors).toContain("status can only be draft, published or archived")
        const rejectedCount = await Post.countDocuments({ title: validPost1.title })
        expect(rejectedCount).toBe(0)
    })
    it("creates a post successfully with multiple tags", async () => {
        const {agent,user} = await registerAgent(validUser)
        const postData = {...validPost1,tags: ["nodejs", "mongodb", "backend"]}
        const res = await agent.post("/api/posts").send(postData)
        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        const post = await Post.findOne({ title: postData.title })
        expect(post).not.toBeNull()
        expect(post.tags).toEqual(["nodejs", "mongodb", "backend"])
        expect(post.author.toString()).toBe(user._id.toString())
    })
    it("normalizes tags to lowercase on create", async () => {
        const { agent } = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, tags: ["NodeJS", "MongoDB"] })
        expect(res.status).toBe(201)
        const post = await Post.findOne({ title: validPost1.title })
        expect([...post.tags]).toEqual(["nodejs", "mongodb"])
    })
    it("rejects post creation if tags exceed 10 items", async () => {
        const {agent} = await registerAgent(validUser)
        const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`)
        const res = await agent.post("/api/posts").send({ ...validPost1, tags })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.errors).toContain("a post can have at most 10 tags")
    })
    it("rejects post creation if a tag exceeds 30 characters", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, tags: ["a".repeat(31)] })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.errors).toContain("each tag can be at most 30 characters")
    })
    it("rejects post creation if tag contains empty strings", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.post("/api/posts").send({ ...validPost1, tags: ["valid", "   "] })
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.errors).toContain("tags must contain non-empty strings only")
    })
})

describe("GET /api/posts", () => {
    it("returns empty array when no published posts exist", async () => {
        const res = await request(app).get("/api/posts")
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.posts).toEqual([])
        expect(res.body.data.postsCount).toBe(0)
        expect(res.body.data.page).toBe(1)
        expect(res.body.data.totalPages).toBe(0)
    })
    it("returns only published posts and excludes drafts or archived", async () => {
        const {agent} = await registerAgent(validUser)
        await agent.post("/api/posts").send({ ...validPost1, status: "published" })
        await agent.post("/api/posts").send({ ...validPost2, status: "draft" })
        await agent.post("/api/posts").send({ title: "Archived Post", content: "Content for archived post", status: "archived" })

        const res = await request(app).get("/api/posts")
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.postsCount).toBe(1)
        expect(res.body.data.posts.length).toBe(1)
        expect(res.body.data.posts[0].title).toBe(validPost1.title)
    })
    it("returns posts sorted newest first by default and paginates with exact title matching", async () => {
        const { user } = await registerAgent(validUser)
        const baseTime = new Date("2026-01-01T00:00:00Z").getTime()
        for (let i = 1; i <= 5; i++) {
            await Post.create({
                title: `Post Item ${i}`,
                content: `Content for post item ${i}`,
                status: "published",
                author: user._id,
                createdAt: new Date(baseTime + i * 10000),
                updatedAt: new Date(baseTime + i * 10000)
            })
        }

        const resPage1 = await request(app).get("/api/posts?page=1&limit=2")
        expect(resPage1.status).toBe(200)
        expect(resPage1.body.data.postsCount).toBe(5)
        expect(resPage1.body.data.totalPages).toBe(3)
        expect(resPage1.body.data.posts.map(p => p.title)).toEqual(["Post Item 5", "Post Item 4"])

        const resPage2 = await request(app).get("/api/posts?page=2&limit=2")
        expect(resPage2.status).toBe(200)
        expect(resPage2.body.data.page).toBe(2)
        expect(resPage2.body.data.posts.map(p => p.title)).toEqual(["Post Item 3", "Post Item 2"])
    })
    it("filters posts by tags", async () => {
        const {agent} = await registerAgent(validUser)
        await agent.post("/api/posts").send({ ...validPost1, tags: ["tech", "node"], status: "published" })
        await agent.post("/api/posts").send({ ...validPost2, tags: ["tech", "react"], status: "published" })

        const res = await request(app).get("/api/posts?tags=node")
        expect(res.status).toBe(200)
        expect(res.body.data.postsCount).toBe(1)
        expect(res.body.data.posts[0].title).toBe(validPost1.title)
    })
    it("filters posts by author id", async () => {
        const {agent: agent1, user: user1} = await registerAgent(validUser)
        const {agent: agent2} = await registerAgent(validUser2)
        await agent1.post("/api/posts").send({ ...validPost1, status: "published" })
        await agent2.post("/api/posts").send({ ...validPost2, status: "published" })

        const res = await request(app).get(`/api/posts?author=${user1._id}`)
        expect(res.status).toBe(200)
        expect(res.body.data.postsCount).toBe(1)
        expect(res.body.data.posts[0].title).toBe(validPost1.title)
    })
    it("searches posts by title regex", async () => {
        const {agent} = await registerAgent(validUser)
        await agent.post("/api/posts").send({ title: "Unique Apple Topic", content: "Some content here for test", status: "published" })
        await agent.post("/api/posts").send({ title: "Banana Discussion", content: "Some content here for test", status: "published" })

        const res = await request(app).get("/api/posts?search=apple")
        expect(res.status).toBe(200)
        expect(res.body.data.postsCount).toBe(1)
        expect(res.body.data.posts[0].title).toBe("Unique Apple Topic")
    })
    it("search is case-insensitive", async () => {
        const { agent } = await registerAgent(validUser)
        await agent.post("/api/posts").send({ title: "Unique Apple Topic", content: "Some content here for test", status: "published" })
        await agent.post("/api/posts").send({ title: "Banana Discussion", content: "Some content here for test", status: "published" })

        const res = await request(app).get("/api/posts?search=APPLE")
        expect(res.status).toBe(200)
        expect(res.body.data.postsCount).toBe(1)
        expect(res.body.data.posts[0].title).toBe("Unique Apple Topic")
    })
    it("sorts posts oldest to newest with distinct timestamps", async () => {
        const { user } = await registerAgent(validUser)
        const baseTime = new Date("2026-01-01T00:00:00Z").getTime()
        await Post.create({
            title: "First Post Created",
            content: "Content for first post",
            status: "published",
            author: user._id,
            createdAt: new Date(baseTime),
            updatedAt: new Date(baseTime)
        })
        await Post.create({
            title: "Second Post Created",
            content: "Content for second post",
            status: "published",
            author: user._id,
            createdAt: new Date(baseTime + 10000),
            updatedAt: new Date(baseTime + 10000)
        })

        const res = await request(app).get("/api/posts?sort=oldest")
        expect(res.status).toBe(200)
        expect(res.body.data.posts[0].title).toBe("First Post Created")
        expect(res.body.data.posts[1].title).toBe("Second Post Created")
    })
    it("rejects invalid query parameters", async () => {
        const res = await request(app).get("/api/posts?status=draft")
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid query data")
        expect(res.body.errors).toContain("status field is not allowed")
    })
    it("rejects invalid author id in query", async () => {
        const res = await request(app).get("/api/posts?author=invalid-id")
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.errors).toContain("author must be a valid id")
    })
    it("rejects invalid sort value in query", async () => {
        const res = await request(app).get("/api/posts?sort=invalid")
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.errors).toContain("sort must be one of: newest, oldest")
    })
    it("escapes special regex characters in search parameter to prevent regex injection or crashes", async () => {
        const { agent } = await registerAgent(validUser)
        await agent.post("/api/posts").send({ title: "Title with (parentheses)", content: "Content test 123", status: "published" })
        await agent.post("/api/posts").send({ title: "Regular Title Here", content: "Content test 123", status: "published" })

        const resParen = await request(app).get("/api/posts?search=(")
        expect(resParen.status).toBe(200)
        expect(resParen.body.data.postsCount).toBe(1)
        expect(resParen.body.data.posts[0].title).toBe("Title with (parentheses)")

        const resWildcard = await request(app).get("/api/posts?search=.*")
        expect(resWildcard.status).toBe(200)
        expect(resWildcard.body.data.postsCount).toBe(0)
    })
})

describe("GET /api/posts/mine", () => {
    it("rejects unauthenticated request", async () => {
        const res = await request(app).get("/api/posts/mine")
        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
    })
    it("returns user posts including draft and published", async () => {
        const {agent} = await registerAgent(validUser)
        await agent.post("/api/posts").send({ ...validPost1, status: "published" })
        await agent.post("/api/posts").send({ ...validPost2, status: "draft" })

        const res = await agent.get("/api/posts/mine")
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.postsCount).toBe(2)
        expect(res.body.data.posts.length).toBe(2)
    })
    it("does not return another user's posts", async () => {
        const {agent: agent1} = await registerAgent(validUser)
        const {agent: agent2} = await registerAgent(validUser2)
        await agent1.post("/api/posts").send({ ...validPost1, status: "published" })
        await agent2.post("/api/posts").send({ ...validPost2, status: "published" })

        const res = await agent1.get("/api/posts/mine")
        expect(res.status).toBe(200)
        expect(res.body.data.postsCount).toBe(1)
        expect(res.body.data.posts[0].title).toBe(validPost1.title)
    })
    it("filters own posts by status", async () => {
        const {agent} = await registerAgent(validUser)
        await agent.post("/api/posts").send({ ...validPost1, status: "published" })
        await agent.post("/api/posts").send({ ...validPost2, status: "draft" })

        const res = await agent.get("/api/posts/mine?status=draft")
        expect(res.status).toBe(200)
        expect(res.body.data.postsCount).toBe(1)
        expect(res.body.data.posts[0].title).toBe(validPost2.title)
    })
    it("rejects author query parameter in /mine", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.get("/api/posts/mine?author=123")
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.errors).toContain("author field is not allowed")
    })
    it("supports pagination on /mine with page and limit, verifying titles", async () => {
        const { agent, user } = await registerAgent(validUser)
        const baseTime = new Date("2026-01-01T00:00:00Z").getTime()
        for (let i = 1; i <= 5; i++) {
            await Post.create({
                title: `My Own Post ${i}`,
                content: `Content for my own post ${i}`,
                status: "draft",
                author: user._id,
                createdAt: new Date(baseTime + i * 10000),
                updatedAt: new Date(baseTime + i * 10000)
            })
        }
        const res = await agent.get("/api/posts/mine?page=2&limit=2")
        expect(res.status).toBe(200)
        expect(res.body.data.postsCount).toBe(5)
        expect(res.body.data.page).toBe(2)
        expect(res.body.data.totalPages).toBe(3)
        expect(res.body.data.posts.map(p => p.title)).toEqual(["My Own Post 3", "My Own Post 2"])
    })
    it("rejects invalid status query parameter on /mine", async () => {
        const { agent } = await registerAgent(validUser)
        const res = await agent.get("/api/posts/mine?status=invalid_status")
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.errors).toContain("status must be one of: draft, published, archived")
    })
})

describe("GET /api/posts/:id", () => {
    it("rejects invalid post id format", async () => {
        const res = await request(app).get("/api/posts/invalid-id")
        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("invalid post id")
    })
    it("returns 404 if post does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId()
        const res = await request(app).get(`/api/posts/${nonExistentId}`)
        expect(res.status).toBe(404)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("Post Not Found")
    })
    it("returns a published post for unauthenticated visitor", async () => {
        const {agent} = await registerAgent(validUser)
        const created = await agent.post("/api/posts").send({ ...validPost1, status: "published" })
        const postId = created.body.data._id

        const res = await request(app).get(`/api/posts/${postId}`)
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.title).toBe(validPost1.title)
    })
    it("returns 404 for unauthenticated visitor on draft post", async () => {
        const {agent} = await registerAgent(validUser)
        const created = await agent.post("/api/posts").send({ ...validPost1, status: "draft" })
        const postId = created.body.data._id

        const res = await request(app).get(`/api/posts/${postId}`)
        expect(res.status).toBe(404)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("Post Not Found")
    })
    it("allows author to view their own draft post", async () => {
        const {agent} = await registerAgent(validUser)
        const created = await agent.post("/api/posts").send({ ...validPost1, status: "draft" })
        const postId = created.body.data._id

        const res = await agent.get(`/api/posts/${postId}`)
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.title).toBe(validPost1.title)
    })
    it("returns 404 for another logged-in user on draft post", async () => {
        const {agent: authorAgent} = await registerAgent(validUser)
        const {agent: otherAgent} = await registerAgent(validUser2)
        const created = await authorAgent.post("/api/posts").send({ ...validPost1, status: "draft" })
        const postId = created.body.data._id

        const res = await otherAgent.get(`/api/posts/${postId}`)
        expect(res.status).toBe(404)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toBe("Post Not Found")
    })
    it("returns 404 for non-author on archived post", async () => {
        const { agent: authorAgent } = await registerAgent(validUser)
        const created = await authorAgent.post("/api/posts").send({ ...validPost1, status: "archived" })
        const postId = created.body.data._id

        const guestRes = await request(app).get(`/api/posts/${postId}`)
        expect(guestRes.status).toBe(404)
        expect(guestRes.body.message).toBe("Post Not Found")

        const { agent: otherAgent } = await registerAgent(validUser2)
        const otherRes = await otherAgent.get(`/api/posts/${postId}`)
        expect(otherRes.status).toBe(404)
        expect(otherRes.body.message).toBe("Post Not Found")
    })
    it("returns 404 when an admin attempts to view someone else's draft post", async () => {
        const { agent: authorAgent } = await registerAgent(validUser)
        const createdDraft = await authorAgent.post("/api/posts").send({ ...validPost1, status: "draft" })
        const draftId = createdDraft.body.data._id

        const { agent: adminAgent } = await registerAdmin()
        const res = await adminAgent.get(`/api/posts/${draftId}`)
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("Post Not Found")
    })
    it("returns 404 when an admin attempts to view someone else's archived post", async () => {
        const { agent: authorAgent } = await registerAgent(validUser)
        const createdArchived = await authorAgent.post("/api/posts").send({ ...validPost1, status: "archived" })
        const archivedId = createdArchived.body.data._id

        const { agent: adminAgent } = await registerAdmin()
        const res = await adminAgent.get(`/api/posts/${archivedId}`)
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("Post Not Found")
    })
})

describe("PATCH /api/posts/:id", () => {
    it("rejects update without token", async () => {
        const nonExistentId = new mongoose.Types.ObjectId()
        const res = await request(app).patch(`/api/posts/${nonExistentId}`).send({ title: "Updated Title" })
        expect(res.status).toBe(401)
    })
    it("rejects invalid post id", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.patch("/api/posts/invalid-id").send({ title: "Updated Title" })
        expect(res.status).toBe(400)
        expect(res.body.message).toBe("invalid post id")
    })
    it("rejects empty update body", async () => {
        const {agent} = await registerAgent(validUser)
        const created = await agent.post("/api/posts").send(validPost1)
        const postId = created.body.data._id

        const res = await agent.patch(`/api/posts/${postId}`).send({})
        expect(res.status).toBe(400)
        expect(res.body.message).toBe("Nothing to update")
    })
    it("rejects update with extra disallowed fields and leaves post unchanged", async () => {
        const {agent} = await registerAgent(validUser)
        const created = await agent.post("/api/posts").send(validPost1)
        const postId = created.body.data._id

        const res = await agent.patch(`/api/posts/${postId}`).send({ unknownField: "test" })
        expect(res.status).toBe(400)
        expect(res.body.errors).toContain("unknownField field is not allowed")

        const postInDb = await Post.findById(postId)
        expect(postInDb.title).toBe(validPost1.title)
        expect(postInDb.content).toBe(validPost1.content)
    })
    it("updates post successfully when user is the author", async () => {
        const {agent} = await registerAgent(validUser)
        const created = await agent.post("/api/posts").send(validPost1)
        const postId = created.body.data._id

        const updateData = {
            title: "Updated Post Title",
            content: "Updated content for test post",
            status: "archived",
            tags: ["updatedTag"]
        }
        const res = await agent.patch(`/api/posts/${postId}`).send(updateData)
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.message).toBe("Post updated successfully")
        expect(res.body.data.title).toBe("Updated Post Title")
        expect(res.body.data.status).toBe("archived")

        const postInDb = await Post.findById(postId)
        expect(postInDb.title).toBe("Updated Post Title")
        expect(postInDb.status).toBe("archived")
        expect(postInDb.tags).toEqual(["updatedtag"])
    })
    it("enforces title validation parity on PATCH and confirms post is unchanged", async () => {
        const { agent } = await registerAgent(validUser)
        const created = await agent.post("/api/posts").send(validPost1)
        const postId = created.body.data._id

        const resType = await agent.patch(`/api/posts/${postId}`).send({ title: 12345 })
        expect(resType.status).toBe(400)
        expect(resType.body.errors).toContain("title must be a string")

        const resShort = await agent.patch(`/api/posts/${postId}`).send({ title: "ab" })
        expect(resShort.status).toBe(400)
        expect(resShort.body.errors).toContain("title length should be between 3 and 150")

        const resLong = await agent.patch(`/api/posts/${postId}`).send({ title: "a".repeat(151) })
        expect(resLong.status).toBe(400)
        expect(resLong.body.errors).toContain("title length should be between 3 and 150")

        const postInDb = await Post.findById(postId)
        expect(postInDb.title).toBe(validPost1.title)
    })
    it("enforces content validation parity on PATCH and confirms post is unchanged", async () => {
        const { agent } = await registerAgent(validUser)
        const created = await agent.post("/api/posts").send(validPost1)
        const postId = created.body.data._id

        const resType = await agent.patch(`/api/posts/${postId}`).send({ content: 12345 })
        expect(resType.status).toBe(400)
        expect(resType.body.errors).toContain("content must be a string")

        const resShort = await agent.patch(`/api/posts/${postId}`).send({ content: "short" })
        expect(resShort.status).toBe(400)
        expect(resShort.body.errors).toContain("content is too short")

        const postInDb = await Post.findById(postId)
        expect(postInDb.content).toBe(validPost1.content)
    })
    it("enforces tags and status validation parity on PATCH and confirms post is unchanged", async () => {
        const { agent } = await registerAgent(validUser)
        const created = await agent.post("/api/posts").send(validPost1)
        const postId = created.body.data._id

        const before = await Post.findById(postId)
        const statusBefore = before.status
        const tagsBefore = [...before.tags]

        const resStatus = await agent.patch(`/api/posts/${postId}`).send({ status: "invalid" })
        expect(resStatus.status).toBe(400)
        expect(resStatus.body.errors).toContain("status can only be draft, published or archived")

        const resTagsType = await agent.patch(`/api/posts/${postId}`).send({ tags: "not-an-array" })
        expect(resTagsType.status).toBe(400)
        expect(resTagsType.body.errors).toContain("tags must be an array")

        const resTagsMax = await agent.patch(`/api/posts/${postId}`).send({ tags: Array.from({ length: 11 }, (_, i) => `t${i}`) })
        expect(resTagsMax.status).toBe(400)
        expect(resTagsMax.body.errors).toContain("a post can have at most 10 tags")

        const after = await Post.findById(postId)
        expect(after.status).toBe(statusBefore)
        expect([...after.tags]).toEqual(tagsBefore)
    })
    it("rejects update if user is not author (403 for published post)", async () => {
        const {agent: authorAgent} = await registerAgent(validUser)
        const {agent: otherAgent} = await registerAgent(validUser2)
        const created = await authorAgent.post("/api/posts").send({ ...validPost1, status: "published" })
        const postId = created.body.data._id

        const res = await otherAgent.patch(`/api/posts/${postId}`).send({ title: "Hacked Title" })
        expect(res.status).toBe(403)
        expect(res.body.message).toBe("You cannot modify this post")
    })
    it("returns 404 when updating non-author draft post", async () => {
        const {agent: authorAgent} = await registerAgent(validUser)
        const {agent: otherAgent} = await registerAgent(validUser2)
        const created = await authorAgent.post("/api/posts").send({ ...validPost1, status: "draft" })
        const postId = created.body.data._id

        const res = await otherAgent.patch(`/api/posts/${postId}`).send({ title: "Hacked Title" })
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("Post Not Found")
    })
    it("returns 404 when non-author attempts to PATCH an archived post", async () => {
        const { agent: authorAgent } = await registerAgent(validUser)
        const created = await authorAgent.post("/api/posts").send({ ...validPost1, status: "archived" })
        const postId = created.body.data._id

        const { agent: otherAgent } = await registerAgent(validUser2)
        const res = await otherAgent.patch(`/api/posts/${postId}`).send({ title: "Hijack Attempt" })
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("Post Not Found")
    })
    it("rejects admin attempting to PATCH someone else's post (admins only have post:update:own)", async () => {
        const { agent: authorAgent } = await registerAgent(validUser)
        const created = await authorAgent.post("/api/posts").send({ ...validPost1, status: "published" })
        const postId = created.body.data._id

        const { agent: adminAgent } = await registerAdmin()
        const res = await adminAgent.patch(`/api/posts/${postId}`).send({ title: "Admin Edit Attempt" })
        expect(res.status).toBe(403)
        expect(res.body.message).toBe("You cannot modify this post")

        const postInDb = await Post.findById(postId)
        expect(postInDb.title).toBe(validPost1.title)
    })
    it("returns 404 when updating non-existent post", async () => {
        const {agent} = await registerAgent(validUser)
        const nonExistentId = new mongoose.Types.ObjectId()
        const res = await agent.patch(`/api/posts/${nonExistentId}`).send({ title: "Updated Title" })
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("Post Not Found")
    })
})

describe("DELETE /api/posts/:id", () => {
    it("rejects delete without token", async () => {
        const nonExistentId = new mongoose.Types.ObjectId()
        const res = await request(app).delete(`/api/posts/${nonExistentId}`)
        expect(res.status).toBe(401)
    })
    it("rejects delete with invalid post id", async () => {
        const {agent} = await registerAgent(validUser)
        const res = await agent.delete("/api/posts/invalid-id")
        expect(res.status).toBe(400)
        expect(res.body.message).toBe("invalid post id")
    })
    it("author deletes their own post successfully and cascades comments and likes", async () => {
        const {agent} = await registerAgent(validUser)
        const created = await agent.post("/api/posts").send(validPost1)
        const postId = created.body.data._id

        const commentRes = await agent.post(`/api/posts/${postId}/comments`).send({ content: "Nice post!" })
        const commentId = commentRes.body.data._id

        await agent.post(`/api/posts/${postId}/like`)
        await agent.post(`/api/comments/${commentId}/like`)

        expect(await Comment.countDocuments({ post: postId })).toBe(1)
        expect(await Like.countDocuments({ targetType: "Post", target: postId })).toBe(1)
        expect(await Like.countDocuments({ targetType: "Comment", target: commentId })).toBe(1)

        const res = await agent.delete(`/api/posts/${postId}`)
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.message).toBe("Post deleted successfully")

        expect(await Post.findById(postId)).toBeNull()
        expect(await Comment.countDocuments({ post: postId })).toBe(0)
        expect(await Like.countDocuments({ targetType: "Post", target: postId })).toBe(0)
        expect(await Like.countDocuments({ targetType: "Comment", target: commentId })).toBe(0)
    })
    it("rejects delete when user is not author (403 for published post)", async () => {
        const {agent: authorAgent} = await registerAgent(validUser)
        const {agent: otherAgent} = await registerAgent(validUser2)
        const created = await authorAgent.post("/api/posts").send({ ...validPost1, status: "published" })
        const postId = created.body.data._id

        const res = await otherAgent.delete(`/api/posts/${postId}`)
        expect(res.status).toBe(403)
        expect(res.body.message).toBe("You cannot modify this post")
        expect(await Post.findById(postId)).not.toBeNull()
    })
    it("returns 404 when non-author attempts to delete an archived post", async () => {
        const { agent: authorAgent } = await registerAgent(validUser)
        const created = await authorAgent.post("/api/posts").send({ ...validPost1, status: "archived" })
        const postId = created.body.data._id

        const { agent: otherAgent } = await registerAgent(validUser2)
        const res = await otherAgent.delete(`/api/posts/${postId}`)
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("Post Not Found")
        expect(await Post.findById(postId)).not.toBeNull()
    })
    it("returns 404 when regular user deletes non-existent post", async () => {
        const {agent} = await registerAgent(validUser)
        const nonExistentId = new mongoose.Types.ObjectId()
        const res = await agent.delete(`/api/posts/${nonExistentId}`)
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("Post Not Found")
    })
    it("admin can delete any published post (scope: any)", async () => {
        const {agent: authorAgent} = await registerAgent(validUser)
        const created = await authorAgent.post("/api/posts").send({ ...validPost1, status: "published" })
        const postId = created.body.data._id

        const {agent: adminAgent} = await registerAdmin()
        const res = await adminAgent.delete(`/api/posts/${postId}`)
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.message).toBe("Post deleted successfully")
        expect(await Post.findById(postId)).toBeNull()
    })
    it("admin deleting someone else's draft post returns 404 because deletePost guards with canViewPost", async () => {
        const {agent: authorAgent} = await registerAgent(validUser)
        const createdDraft = await authorAgent.post("/api/posts").send({ ...validPost1, status: "draft" })
        const draftId = createdDraft.body.data._id

        const {agent: adminAgent} = await registerAdmin()
        const res = await adminAgent.delete(`/api/posts/${draftId}`)
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("Post Not Found")
        expect(await Post.findById(draftId)).not.toBeNull()
    })
    it("admin deleting someone else's archived post returns 404 because deletePost guards with canViewPost", async () => {
        const {agent: authorAgent} = await registerAgent(validUser)
        const createdArchived = await authorAgent.post("/api/posts").send({ ...validPost1, status: "archived" })
        const archivedId = createdArchived.body.data._id

        const {agent: adminAgent} = await registerAdmin()
        const res = await adminAgent.delete(`/api/posts/${archivedId}`)
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("Post Not Found")
        expect(await Post.findById(archivedId)).not.toBeNull()
    })
})