import { describe, it, expect } from "vitest"
import request from "supertest"
import mongoose from "mongoose"
import app from "../src/app.js"
import Comment from "../src/models/commentModel.js"
import Like from "../src/models/likeModel.js"
import { validUser, validUser2, validUser3, validPost1, validPost2 } from "./helpers/testData.js"
import { registerAgent, registerAdmin, registerModerator } from "./helpers/setAuth.js"

describe("POST /api/posts/:id/comments", () => {
    it("creates a comment on a published post and trims whitespace", async () => {
        const { agent: authorAgent } = await registerAgent(validUser)
        const { agent: commenterAgent, user: commenter } = await registerAgent(validUser2)
        const postRes = await authorAgent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id

        const res = await commenterAgent.post(`/api/posts/${postId}/comments`).send({ content: "  Great post!  " })
        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.message).toBe("comment created successfully")
        expect(res.body.data.content).toBe("Great post!")
        expect(res.body.data.post).toBe(postId)
        expect(res.body.data.author).toBe(commenter._id)
        expect(res.body.data.editedAt).toBeNull()

        const saved = await Comment.findById(res.body.data._id)
        expect(saved).not.toBeNull()
        expect(saved.content).toBe("Great post!")
    })

    it("accepts exact boundary lengths of 1 and 500 characters", async () => {
        const { agent } = await registerAgent(validUser)
        const postRes = await agent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id

        const minRes = await agent.post(`/api/posts/${postId}/comments`).send({ content: "a" })
        expect(minRes.status).toBe(201)
        expect(minRes.body.data.content).toBe("a")

        const maxContent = "a".repeat(500)
        const maxRes = await agent.post(`/api/posts/${postId}/comments`).send({ content: maxContent })
        expect(maxRes.status).toBe(201)
        expect(maxRes.body.data.content).toBe(maxContent)
    })

    it("rejects comment creation without authentication", async () => {
        const nonExistentId = new mongoose.Types.ObjectId()
        const res = await request(app).post(`/api/posts/${nonExistentId}/comments`).send({ content: "Hello" })
        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
    })

    it("rejects invalid post id", async () => {
        const { agent } = await registerAgent(validUser)
        const res = await agent.post("/api/posts/invalid-id/comments").send({ content: "Hello" })
        expect(res.status).toBe(400)
        expect(res.body.message).toBe("invalid post id")
    })

    it("returns 404 when commenting on a non-existent post", async () => {
        const { agent } = await registerAgent(validUser)
        const nonExistentId = new mongoose.Types.ObjectId()
        const res = await agent.post(`/api/posts/${nonExistentId}/comments`).send({ content: "Hello" })
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("post not found")
    })

    it("allows author to comment on their own draft post", async () => {
        const { agent } = await registerAgent(validUser)
        const postRes = await agent.post("/api/posts").send({ ...validPost1, status: "draft" })
        const postId = postRes.body.data._id

        const res = await agent.post(`/api/posts/${postId}/comments`).send({ content: "Draft note" })
        expect(res.status).toBe(201)
        expect(res.body.data.content).toBe("Draft note")
    })

    it("returns 404 when another user tries to comment on a draft or archived post", async () => {
        const { agent: authorAgent } = await registerAgent(validUser)
        const { agent: otherAgent } = await registerAgent(validUser2)

        const draftRes = await authorAgent.post("/api/posts").send({ ...validPost1, status: "draft" })
        const resDraft = await otherAgent.post(`/api/posts/${draftRes.body.data._id}/comments`).send({ content: "Hi" })
        expect(resDraft.status).toBe(404)
        expect(resDraft.body.message).toBe("post not found")

        const archivedRes = await authorAgent.post("/api/posts").send({ ...validPost2, status: "archived" })
        const resArchived = await otherAgent.post(`/api/posts/${archivedRes.body.data._id}/comments`).send({ content: "Hi" })
        expect(resArchived.status).toBe(404)
        expect(resArchived.body.message).toBe("post not found")
    })

    it("rejects non-object, missing, empty, non-string, too-long, and extra fields", async () => {
        const { agent } = await registerAgent(validUser)
        const postRes = await agent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id

        const resArray = await agent.post(`/api/posts/${postId}/comments`).send([])
        expect(resArray.status).toBe(400)
        expect(resArray.body.message).toBe("content is required")

        const resMissing = await agent.post(`/api/posts/${postId}/comments`).send({})
        expect(resMissing.status).toBe(400)
        expect(resMissing.body.message).toBe("invalid comment Data")
        expect(resMissing.body.errors).toContain("content field is required")

        const resEmpty = await agent.post(`/api/posts/${postId}/comments`).send({ content: "   " })
        expect(resEmpty.status).toBe(400)
        expect(resEmpty.body.errors).toContain("content length should be between 1 and 500")

        const resType = await agent.post(`/api/posts/${postId}/comments`).send({ content: 12345 })
        expect(resType.status).toBe(400)
        expect(resType.body.errors).toContain("content must be string")

        const resLong = await agent.post(`/api/posts/${postId}/comments`).send({ content: "a".repeat(501) })
        expect(resLong.status).toBe(400)
        expect(resLong.body.errors).toContain("content length should be between 1 and 500")

        const resExtra = await agent.post(`/api/posts/${postId}/comments`).send({ content: "Valid", extra: "nope" })
        expect(resExtra.status).toBe(400)
        expect(resExtra.body.errors).toContain("extra field is not allowed")

        expect(await Comment.countDocuments({ post: postId })).toBe(0)
    })
})

describe("GET /api/posts/:id/comments", () => {
    it("returns empty array when a published post has no comments", async () => {
        const { agent } = await registerAgent(validUser)
        const postRes = await agent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id

        const res = await request(app).get(`/api/posts/${postId}/comments`)
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.message).toBe("comments fetched successfully")
        expect(res.body.data.comments).toEqual([])
        expect(res.body.data.commentsCount).toBe(0)
        expect(res.body.data.page).toBe(1)
        expect(res.body.data.totalPages).toBe(0)
    })

    it("returns comments sorted newest first with pagination", async () => {
        const { agent, user } = await registerAgent(validUser)
        const postRes = await agent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id

        const baseTime = new Date("2026-01-01T00:00:00Z").getTime()
        for (let i = 1; i <= 5; i++) {
            await Comment.create({
                content: `Comment ${i}`,
                post: postId,
                author: user._id,
                createdAt: new Date(baseTime + i * 10000),
                updatedAt: new Date(baseTime + i * 10000)
            })
        }

        const page1 = await request(app).get(`/api/posts/${postId}/comments?page=1&limit=2`)
        expect(page1.status).toBe(200)
        expect(page1.body.data.commentsCount).toBe(5)
        expect(page1.body.data.totalPages).toBe(3)
        expect(page1.body.data.comments.map(c => c.content)).toEqual(["Comment 5", "Comment 4"])

        const page2 = await request(app).get(`/api/posts/${postId}/comments?page=2&limit=2`)
        expect(page2.status).toBe(200)
        expect(page2.body.data.page).toBe(2)
        expect(page2.body.data.comments.map(c => c.content)).toEqual(["Comment 3", "Comment 2"])
    })

    it("only returns comments belonging to the requested post", async () => {
        const { agent } = await registerAgent(validUser)
        const postA = await agent.post("/api/posts").send(validPost1)
        const postB = await agent.post("/api/posts").send(validPost2)

        await agent.post(`/api/posts/${postA.body.data._id}/comments`).send({ content: "Comment on A" })
        await agent.post(`/api/posts/${postB.body.data._id}/comments`).send({ content: "Comment on B" })

        const res = await request(app).get(`/api/posts/${postA.body.data._id}/comments`)
        expect(res.status).toBe(200)
        expect(res.body.data.commentsCount).toBe(1)
        expect(res.body.data.comments[0].content).toBe("Comment on A")
    })

    it("falls back to defaults on invalid pagination params and clamps limit to 50", async () => {
        const { agent, user } = await registerAgent(validUser)
        const postRes = await agent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id

        const docs = Array.from({ length: 51 }, (_, i) => ({
            content: `Bulk comment ${i + 1}`,
            post: postId,
            author: user._id
        }))
        await Comment.insertMany(docs)

        const invalidRes = await request(app).get(`/api/posts/${postId}/comments?page=-1&limit=abc`)
        expect(invalidRes.status).toBe(200)
        expect(invalidRes.body.data.page).toBe(1)
        expect(invalidRes.body.data.comments.length).toBe(10)
        expect(invalidRes.body.data.totalPages).toBe(6)

        const clampedRes = await request(app).get(`/api/posts/${postId}/comments?page=1&limit=100`)
        expect(clampedRes.status).toBe(200)
        expect(clampedRes.body.data.comments.length).toBe(50)
        expect(clampedRes.body.data.totalPages).toBe(2)
    })

    it("falls back to guest and returns comments on a published post when cookie token is invalid", async () => {
        const { agent } = await registerAgent(validUser)
        const postRes = await agent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id
        await agent.post(`/api/posts/${postId}/comments`).send({ content: "Public comment" })

        const res = await request(app)
            .get(`/api/posts/${postId}/comments`)
            .set("Cookie", "token=invalid.jwt.token")
        expect(res.status).toBe(200)
        expect(res.body.data.commentsCount).toBe(1)
    })

    it("allows author to list comments on their own draft post, but returns 404 to guests and other users", async () => {
        const { agent: authorAgent } = await registerAgent(validUser)
        const { agent: otherAgent } = await registerAgent(validUser2)
        const postRes = await authorAgent.post("/api/posts").send({ ...validPost1, status: "draft" })
        const postId = postRes.body.data._id
        await authorAgent.post(`/api/posts/${postId}/comments`).send({ content: "Private comment" })

        const authorRes = await authorAgent.get(`/api/posts/${postId}/comments`)
        expect(authorRes.status).toBe(200)
        expect(authorRes.body.data.commentsCount).toBe(1)

        const guestRes = await request(app).get(`/api/posts/${postId}/comments`)
        expect(guestRes.status).toBe(404)
        expect(guestRes.body.message).toBe("post not found")

        const otherRes = await otherAgent.get(`/api/posts/${postId}/comments`)
        expect(otherRes.status).toBe(404)
        expect(otherRes.body.message).toBe("post not found")
    })

    it("allows author to list comments on their own archived post, but returns 404 to guests and other users", async () => {
        const { agent: authorAgent } = await registerAgent(validUser)
        const { agent: otherAgent } = await registerAgent(validUser2)
        const postRes = await authorAgent.post("/api/posts").send({ ...validPost1, status: "archived" })
        const postId = postRes.body.data._id
        await authorAgent.post(`/api/posts/${postId}/comments`).send({ content: "Archived note" })

        const authorRes = await authorAgent.get(`/api/posts/${postId}/comments`)
        expect(authorRes.status).toBe(200)
        expect(authorRes.body.data.commentsCount).toBe(1)

        const guestRes = await request(app).get(`/api/posts/${postId}/comments`)
        expect(guestRes.status).toBe(404)
        expect(guestRes.body.message).toBe("post not found")

        const otherRes = await otherAgent.get(`/api/posts/${postId}/comments`)
        expect(otherRes.status).toBe(404)
        expect(otherRes.body.message).toBe("post not found")
    })

    it("rejects invalid post id and returns 404 for non-existent post", async () => {
        const badRes = await request(app).get("/api/posts/invalid-id/comments")
        expect(badRes.status).toBe(400)
        expect(badRes.body.message).toBe("invalid post id")

        const missingRes = await request(app).get(`/api/posts/${new mongoose.Types.ObjectId()}/comments`)
        expect(missingRes.status).toBe(404)
        expect(missingRes.body.message).toBe("post not found")
    })
})

describe("PATCH /api/comments/:id", () => {
    it("updates comment content and sets editedAt when author edits", async () => {
        const { agent } = await registerAgent(validUser)
        const postRes = await agent.post("/api/posts").send(validPost1)
        const commentRes = await agent.post(`/api/posts/${postRes.body.data._id}/comments`).send({ content: "Original" })
        const commentId = commentRes.body.data._id

        const res = await agent.patch(`/api/comments/${commentId}`).send({ content: "  Updated content  " })
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.message).toBe("comment updated successfully")
        expect(res.body.data.content).toBe("Updated content")
        expect(res.body.data.editedAt).not.toBeNull()

        const updatedInDb = await Comment.findById(commentId)
        expect(updatedInDb.content).toBe("Updated content")
        expect(updatedInDb.editedAt).not.toBeNull()
    })

    it("leaves editedAt null when updated content is identical after trimming", async () => {
        const { agent } = await registerAgent(validUser)
        const postRes = await agent.post("/api/posts").send(validPost1)
        const commentRes = await agent.post(`/api/posts/${postRes.body.data._id}/comments`).send({ content: "Same text" })
        const commentId = commentRes.body.data._id

        const res = await agent.patch(`/api/comments/${commentId}`).send({ content: "  Same text  " })
        expect(res.status).toBe(200)
        expect(res.body.data.content).toBe("Same text")
        expect(res.body.data.editedAt).toBeNull()
    })

    it("accepts exact boundary lengths of 1 and 500 characters on PATCH", async () => {
        const { agent } = await registerAgent(validUser)
        const postRes = await agent.post("/api/posts").send(validPost1)
        const commentRes = await agent.post(`/api/posts/${postRes.body.data._id}/comments`).send({ content: "Initial" })
        const commentId = commentRes.body.data._id

        const minRes = await agent.patch(`/api/comments/${commentId}`).send({ content: "b" })
        expect(minRes.status).toBe(200)
        expect(minRes.body.data.content).toBe("b")

        const maxContent = "b".repeat(500)
        const maxRes = await agent.patch(`/api/comments/${commentId}`).send({ content: maxContent })
        expect(maxRes.status).toBe(200)
        expect(maxRes.body.data.content).toBe(maxContent)
    })

    it("enforces validation parity on PATCH and leaves comment unchanged", async () => {
        const { agent } = await registerAgent(validUser)
        const postRes = await agent.post("/api/posts").send(validPost1)
        const commentRes = await agent.post(`/api/posts/${postRes.body.data._id}/comments`).send({ content: "Original" })
        const commentId = commentRes.body.data._id

        const resArray = await agent.patch(`/api/comments/${commentId}`).send([])
        expect(resArray.status).toBe(400)
        expect(resArray.body.message).toBe("content is required")

        const resEmptyObj = await agent.patch(`/api/comments/${commentId}`).send({})
        expect(resEmptyObj.status).toBe(400)
        expect(resEmptyObj.body.errors).toContain("content field is required")

        const resWhitespace = await agent.patch(`/api/comments/${commentId}`).send({ content: "   " })
        expect(resWhitespace.status).toBe(400)
        expect(resWhitespace.body.errors).toContain("content length should be between 1 and 500")

        const resType = await agent.patch(`/api/comments/${commentId}`).send({ content: 123 })
        expect(resType.status).toBe(400)
        expect(resType.body.errors).toContain("content must be string")

        const resLong = await agent.patch(`/api/comments/${commentId}`).send({ content: "a".repeat(501) })
        expect(resLong.status).toBe(400)
        expect(resLong.body.errors).toContain("content length should be between 1 and 500")

        const resExtra = await agent.patch(`/api/comments/${commentId}`).send({ content: "Valid", extra: true })
        expect(resExtra.status).toBe(400)
        expect(resExtra.body.errors).toContain("extra field is not allowed")

        const unchanged = await Comment.findById(commentId)
        expect(unchanged.content).toBe("Original")
        expect(unchanged.editedAt).toBeNull()
    })

    it("rejects unauthenticated edit, invalid id, and non-existent comment", async () => {
        const fakeId = new mongoose.Types.ObjectId()
        const unauthRes = await request(app).patch(`/api/comments/${fakeId}`).send({ content: "Edit" })
        expect(unauthRes.status).toBe(401)

        const { agent } = await registerAgent(validUser)
        const invalidRes = await agent.patch("/api/comments/invalid-id").send({ content: "Edit" })
        expect(invalidRes.status).toBe(400)
        expect(invalidRes.body.message).toBe("invalid comment id")

        const missingRes = await agent.patch(`/api/comments/${fakeId}`).send({ content: "Edit" })
        expect(missingRes.status).toBe(404)
        expect(missingRes.body.message).toBe("comment not found")
    })

    it("rejects edit by post author, moderator, or admin on someone else's comment (403)", async () => {
        const { agent: postAuthorAgent } = await registerAgent(validUser)
        const { agent: commenterAgent } = await registerAgent(validUser2)
        const { agent: modAgent } = await registerModerator()
        const { agent: adminAgent } = await registerAdmin()

        const postRes = await postAuthorAgent.post("/api/posts").send(validPost1)
        const commentRes = await commenterAgent.post(`/api/posts/${postRes.body.data._id}/comments`).send({ content: "My comment" })
        const commentId = commentRes.body.data._id

        const postAuthorEdit = await postAuthorAgent.patch(`/api/comments/${commentId}`).send({ content: "Hijack" })
        expect(postAuthorEdit.status).toBe(403)
        expect(postAuthorEdit.body.message).toBe("you cannot modify this comment")

        const modEdit = await modAgent.patch(`/api/comments/${commentId}`).send({ content: "Mod edit" })
        expect(modEdit.status).toBe(403)
        expect(modEdit.body.message).toBe("you cannot modify this comment")

        const adminEdit = await adminAgent.patch(`/api/comments/${commentId}`).send({ content: "Admin edit" })
        expect(adminEdit.status).toBe(403)
        expect(adminEdit.body.message).toBe("you cannot modify this comment")

        const unchanged = await Comment.findById(commentId)
        expect(unchanged.content).toBe("My comment")
    })

    it("returns 404 when commenter tries to edit their comment after the post is archived", async () => {
        const { agent: postAuthorAgent } = await registerAgent(validUser)
        const { agent: commenterAgent } = await registerAgent(validUser2)

        const postRes = await postAuthorAgent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id
        const commentRes = await commenterAgent.post(`/api/posts/${postId}/comments`).send({ content: "Early comment" })
        const commentId = commentRes.body.data._id

        await postAuthorAgent.patch(`/api/posts/${postId}`).send({ status: "archived" })

        const res = await commenterAgent.patch(`/api/comments/${commentId}`).send({ content: "Late edit" })
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("comment not found")
    })

    it("returns 404 instead of 403 when a bystander tries to edit a comment on an archived post", async () => {
        const { agent: postAuthorAgent } = await registerAgent(validUser)
        const { agent: commenterAgent } = await registerAgent(validUser2)
        const { agent: bystanderAgent } = await registerAgent(validUser3)

        const postRes = await postAuthorAgent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id
        const commentRes = await commenterAgent.post(`/api/posts/${postId}/comments`).send({ content: "Comment" })

        await postAuthorAgent.patch(`/api/posts/${postId}`).send({ status: "archived" })

        const res = await bystanderAgent.patch(`/api/comments/${commentRes.body.data._id}`).send({ content: "Hijack" })
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("comment not found")
    })
})

describe("DELETE /api/comments/:id", () => {
    it("allows comment author to delete their own comment and cascades only its likes", async () => {
        const { agent } = await registerAgent(validUser)
        const postRes = await agent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id

        const c1 = await agent.post(`/api/posts/${postId}/comments`).send({ content: "Delete me" })
        const c2 = await agent.post(`/api/posts/${postId}/comments`).send({ content: "Keep me" })

        await agent.post(`/api/posts/${postId}/like`)
        await agent.post(`/api/comments/${c1.body.data._id}/like`)
        await agent.post(`/api/comments/${c2.body.data._id}/like`)

        const res = await agent.delete(`/api/comments/${c1.body.data._id}`)
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.message).toBe("comment deleted successfully")

        expect(await Comment.findById(c1.body.data._id)).toBeNull()
        expect(await Like.countDocuments({ targetType: "Comment", target: c1.body.data._id })).toBe(0)
        expect(await Like.countDocuments({ targetType: "Comment", target: c2.body.data._id })).toBe(1)
        expect(await Like.countDocuments({ targetType: "Post", target: postId })).toBe(1)
    })

    it("allows post author to delete another user's comment on their post", async () => {
        const { agent: postAuthorAgent } = await registerAgent(validUser)
        const { agent: commenterAgent } = await registerAgent(validUser2)

        const postRes = await postAuthorAgent.post("/api/posts").send(validPost1)
        const commentRes = await commenterAgent.post(`/api/posts/${postRes.body.data._id}/comments`).send({ content: "Spam" })
        const commentId = commentRes.body.data._id

        const res = await postAuthorAgent.delete(`/api/comments/${commentId}`)
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(await Comment.findById(commentId)).toBeNull()
    })

    it("allows post author to delete another user's comment even after archiving the post", async () => {
        const { agent: postAuthorAgent } = await registerAgent(validUser)
        const { agent: commenterAgent } = await registerAgent(validUser2)

        const postRes = await postAuthorAgent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id
        const commentRes = await commenterAgent.post(`/api/posts/${postId}/comments`).send({ content: "Comment" })
        const commentId = commentRes.body.data._id

        await postAuthorAgent.patch(`/api/posts/${postId}`).send({ status: "archived" })

        const res = await postAuthorAgent.delete(`/api/comments/${commentId}`)
        expect(res.status).toBe(200)
        expect(res.body.message).toBe("comment deleted successfully")
        expect(await Comment.findById(commentId)).toBeNull()
    })

    it("rejects deletion by an unrelated regular user (403)", async () => {
        const { agent: postAuthorAgent } = await registerAgent(validUser)
        const { agent: commenterAgent } = await registerAgent(validUser2)
        const { agent: bystanderAgent } = await registerAgent(validUser3)

        const postRes = await postAuthorAgent.post("/api/posts").send(validPost1)
        const commentRes = await commenterAgent.post(`/api/posts/${postRes.body.data._id}/comments`).send({ content: "Keep me" })
        const commentId = commentRes.body.data._id

        const res = await bystanderAgent.delete(`/api/comments/${commentId}`)
        expect(res.status).toBe(403)
        expect(res.body.message).toBe("you cannot delete this comment")
        expect(await Comment.findById(commentId)).not.toBeNull()
    })

    it("allows moderator and admin to delete any comment on a published post (scope: any)", async () => {
        const { agent: postAuthorAgent } = await registerAgent(validUser)
        const { agent: commenterAgent } = await registerAgent(validUser2)
        const { agent: modAgent } = await registerModerator()
        const { agent: adminAgent } = await registerAdmin()

        const postRes = await postAuthorAgent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id

        const c1 = await commenterAgent.post(`/api/posts/${postId}/comments`).send({ content: "Mod target" })
        const modRes = await modAgent.delete(`/api/comments/${c1.body.data._id}`)
        expect(modRes.status).toBe(200)
        expect(await Comment.findById(c1.body.data._id)).toBeNull()

        const c2 = await commenterAgent.post(`/api/posts/${postId}/comments`).send({ content: "Admin target" })
        const adminRes = await adminAgent.delete(`/api/comments/${c2.body.data._id}`)
        expect(adminRes.status).toBe(200)
        expect(await Comment.findById(c2.body.data._id)).toBeNull()
    })

    it("returns 404 when moderator or admin tries to delete a comment on someone else's draft or archived post", async () => {
        const { agent: postAuthorAgent } = await registerAgent(validUser)
        const { agent: modAgent } = await registerModerator()
        const { agent: adminAgent } = await registerAdmin()

        const draftPost = await postAuthorAgent.post("/api/posts").send({ ...validPost1, status: "draft" })
        const draftComment = await postAuthorAgent.post(`/api/posts/${draftPost.body.data._id}/comments`).send({ content: "Draft note" })

        const modRes = await modAgent.delete(`/api/comments/${draftComment.body.data._id}`)
        expect(modRes.status).toBe(404)
        expect(modRes.body.message).toBe("comment not found")
        expect(await Comment.findById(draftComment.body.data._id)).not.toBeNull()

        await postAuthorAgent.patch(`/api/posts/${draftPost.body.data._id}`).send({ status: "archived" })

        const adminRes = await adminAgent.delete(`/api/comments/${draftComment.body.data._id}`)
        expect(adminRes.status).toBe(404)
        expect(adminRes.body.message).toBe("comment not found")
        expect(await Comment.findById(draftComment.body.data._id)).not.toBeNull()
    })

    it("returns 404 when commenter tries to delete their comment after the post is archived", async () => {
        const { agent: postAuthorAgent } = await registerAgent(validUser)
        const { agent: commenterAgent } = await registerAgent(validUser2)

        const postRes = await postAuthorAgent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id
        const commentRes = await commenterAgent.post(`/api/posts/${postId}/comments`).send({ content: "Early comment" })
        const commentId = commentRes.body.data._id

        await postAuthorAgent.patch(`/api/posts/${postId}`).send({ status: "archived" })

        const res = await commenterAgent.delete(`/api/comments/${commentId}`)
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("comment not found")
        expect(await Comment.findById(commentId)).not.toBeNull()
    })

    it("returns 404 instead of 403 when a bystander tries to delete a comment on an archived post", async () => {
        const { agent: postAuthorAgent } = await registerAgent(validUser)
        const { agent: commenterAgent } = await registerAgent(validUser2)
        const { agent: bystanderAgent } = await registerAgent(validUser3)

        const postRes = await postAuthorAgent.post("/api/posts").send(validPost1)
        const postId = postRes.body.data._id
        const commentRes = await commenterAgent.post(`/api/posts/${postId}/comments`).send({ content: "Comment" })
        const commentId = commentRes.body.data._id

        await postAuthorAgent.patch(`/api/posts/${postId}`).send({ status: "archived" })

        const res = await bystanderAgent.delete(`/api/comments/${commentId}`)
        expect(res.status).toBe(404)
        expect(res.body.message).toBe("comment not found")
        expect(await Comment.findById(commentId)).not.toBeNull()
    })

    it("rejects unauthenticated delete, invalid id, and non-existent comment", async () => {
        const fakeId = new mongoose.Types.ObjectId()
        const unauthRes = await request(app).delete(`/api/comments/${fakeId}`)
        expect(unauthRes.status).toBe(401)

        const { agent } = await registerAgent(validUser)
        const invalidRes = await agent.delete("/api/comments/invalid-id")
        expect(invalidRes.status).toBe(400)
        expect(invalidRes.body.message).toBe("invalid comment id")

        const missingRes = await agent.delete(`/api/comments/${fakeId}`)
        expect(missingRes.status).toBe(404)
        expect(missingRes.body.message).toBe("comment not found")
    })
})
