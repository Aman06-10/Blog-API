import mongoose from "mongoose";
import Post from "../models/postModel.js";
import { ApiError } from "../utils/ApiError.js";

export function createPost(data, authorId) {
    return Post.create({ ...data, author: authorId })
}

export async function getPosts() {
    const posts = await Post.find({ status: "published" }).sort({ createdAt: -1 })
    return posts;
}

export async function getPostById(postId, viewerId) {
    const post = await Post.findById(postId)
    if (post) {
        if (post.status === "published" || (post.author.toString()) === (viewerId?.toString())) {
            return post
        }
    }
    throw new ApiError(404, "Post Not Found")
}

export async function updatePost(postId, data, user) {
    const post = await Post.findById(postId)
    if (!post) {
        throw new ApiError(404, "Post not found")
    }
    if (post.author.toString() !== user.id && user.role !== "admin") {
        throw new ApiError(403, "Forbidden: you can only update your own posts")
    }
    const allowedFields = ["title", "content", "tags", "status"]
    for (const field of allowedFields) {
        if (data[field] !== undefined) {
            post[field] = data[field]
        }
    }
    await post.save()
    return post;
}

export async function deletePost(postId, user) {
    const post = await Post.findById(postId)
    if (!post) {
        throw new ApiError(404, "Post not found")
    }
    if (post.author.toString() !== user.id && user.role !== "admin") {
        throw new ApiError(403, "Forbidden: you can only delete your own posts")
    }
    await post.deleteOne()
    return post;
}

