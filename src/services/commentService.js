import Comment from "../models/commentModel.js"
import Post from "../models/postModel.js"
import { ApiError } from "../utils/ApiError.js"
import { canViewPost } from "./postService.js"

export async function createComment(postId, viewerId, data) {
    const post = await Post.findById(postId)
    if (!post || !canViewPost(post, viewerId)) {
        throw new ApiError(404, "post not found")
    }
    const comment = await Comment.create({ ...data, post: postId, author: viewerId })
    return comment
}


export async function getComments(postId, viewerId, page, limit) {
    const post = await Post.findById(postId)
    if (!post || !canViewPost(post, viewerId)) {
        throw new ApiError(404, "post not found")
    }
    const skip = (page - 1) * limit
    const comments = await Comment.find({ post: postId }).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit)
    const commentsCount = await Comment.countDocuments({ post: postId })
    return { comments, commentsCount ,page,limit}
}

