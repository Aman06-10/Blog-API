import Post from "../models/postModel.js";
import Comment from "../models/commentModel.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeTags } from "../utils/tags.js";
import Like from "../models/likeModel.js";

async function ownershipCheck(postId, userId) {
    const post = await Post.findOne({ _id: postId })
    if (!post) {
        throw new ApiError(404, "Post Not Found")
    }
    if ((userId.toString() !== post.author.toString())) {
        if (post.status === "published") {
            throw new ApiError(403, "You cannot modify this post")
        }
        else {
            throw new ApiError(404, "Post Not Found")
        }
    }
    return post
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function buildQuery(base, filters = {}) {
    const query = {}
    if (filters.tags) query.tags = { $all: filters.tags }
    if (filters.author) query.author = filters.author
    if (filters.status) query.status = filters.status
    if (filters.search) {
        query.title = { $regex: escapeRegex(filters.search), $options: "i" }
    }
    return { ...query, ...base } 
}

function buildSort(filters = {}) {
    const dir = filters.sort === "oldest" ? 1 : -1
    return { createdAt: dir, _id: dir }
}

export function canViewPost(post, viewerId) {
    return post.status === "published" || post.author.toString() === viewerId?.toString()
}

export function createPost(data, authorId) {
    const post = { ...data, author: authorId }
    if (post.tags) post.tags = normalizeTags(post.tags)
    return Post.create(post)
}

export async function getPosts(page, limit, filters) {
    const skip = (page - 1) * limit
    const query = buildQuery({ status: "published" }, filters)
    const posts = await Post.find(query).sort(buildSort(filters)).skip(skip).limit(limit)
    const postsCount = await Post.countDocuments(query)
    return { posts, postsCount, page, limit }
}

export async function getPostById(postId, viewerId) {
    const post = await Post.findById(postId)
    if (!post || !canViewPost(post, viewerId)) {
        throw new ApiError(404, "Post Not Found")
    }
    return post
}

export async function updatePost(postId, userId, data) {
    await ownershipCheck(postId, userId)
    let updateData = {}
    const allowed = ['title', 'content', 'status', 'tags']
    for (const key of allowed) {
        if (key in data) {
            updateData[key] = data[key]
        }
    }
    if (updateData.tags) updateData.tags = normalizeTags(updateData.tags)
    const updatedPost = await Post.findByIdAndUpdate(postId, updateData, { returnDocument: "after", runValidators: true })
    return updatedPost
}

export async function deletePost(postId, userId) {
    const post = await ownershipCheck(postId, userId)
    const comments = await Comment.find({ post: postId }).select("_id")
    const commentIds = comments.map((comment) => comment._id)
    await Like.deleteMany({
        $or: [
            { targetType: "Post", target: postId },
            { targetType: "Comment", target: { $in: commentIds } },
        ],
    })
    await Comment.deleteMany({ post: postId })
    await Post.findByIdAndDelete(postId)
    return post
}

export async function getMyPosts(userId, page, limit, filters) {
    const skip = (page - 1) * limit
    const query = buildQuery({ author: userId }, filters)
    const posts = await Post.find(query).sort(buildSort(filters)).skip(skip).limit(limit)
    const postsCount = await Post.countDocuments(query)
    return { posts, postsCount, page, limit }
}