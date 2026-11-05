import Post from "../models/postModel.js"
import { canViewPost } from "./postService.js"
import Like from "../models/likeModel.js"
import { ApiError } from "../utils/ApiError.js"
import Comment from "../models/commentModel.js"

export async function likePost(postId, userId) {
    const post = await Post.findById(postId)
    if (!post || !canViewPost(post, userId)) {
        throw new ApiError(404, "Post Not Found")
    }
    const like = { user: userId, targetType: "Post", target: postId }
    try {
        await Like.updateOne(like, { $setOnInsert: like }, { upsert: true })
    } catch (error) {
        if (error.code !== 11000) {
            throw error
        }
    }
    const likesCount = await Like.countDocuments({ targetType: "Post", target: postId })
    return { liked: true, likesCount }
}

export async function unlikePost(postId, userId) {
    const post = await Post.findById(postId)
    if (!post || !canViewPost(post, userId)) {
        throw new ApiError(404, "Post Not Found")
    }
    const like = { user: userId, targetType: "Post", target: postId }
    await Like.deleteOne(like)
    const likesCount = await Like.countDocuments({ targetType: "Post", target: postId })
    return { liked: false, likesCount }
}

export async function likeComment(commentId, userId) {
    const comment = await Comment.findById(commentId)
    if (comment) {
        const post = await Post.findById(comment.post)
        if (!post || !canViewPost(post, userId)){
            throw new ApiError(404, "comment not found")
        }
        const like = { user: userId, targetType: "Comment", target: commentId }
        try {
            await Like.updateOne(like, { $setOnInsert: like }, { upsert: true })
        } catch (error) {
            if (error.code !== 11000) {
                throw error
            }
        }
        const likesCount = await Like.countDocuments({ targetType: "Comment", target: commentId })
        return { liked: true, likesCount }

    }
    throw new ApiError(404, "comment not found")
}

export async function unlikeComment(commentId, userId) {
    const comment = await Comment.findById(commentId)
    if (comment) {
        const post = await Post.findById(comment.post)
        if (!post || !canViewPost(post, userId)){
            throw new ApiError(404, "comment not found")
        }
        const like = { user: userId, targetType: "Comment", target: commentId }
        await Like.deleteOne(like)
        const likesCount = await Like.countDocuments({ targetType: "Comment", target: commentId })
        return { liked: false, likesCount }

    }
    throw new ApiError(404, "comment not found")
}