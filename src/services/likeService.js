import Post from "../models/postModel.js"
import { canViewPost } from "./postService.js"
import Like from "../models/likeModel.js"
import { ApiError } from "../utils/ApiError.js"


export async function likePost(postId,userId){
    const post=await Post.findById(postId)
    if(!post || !canViewPost(post,userId)){
        throw new ApiError(404, "Post Not Found")
    }
    const like={user:userId,targetType:"Post",target:postId}
    try {
        await Like.updateOne(like, { $setOnInsert: like }, { upsert: true })
    } catch (error) {
        if (error.code !== 11000){
            throw error
        }
    }
    const likesCount = await Like.countDocuments({ targetType: "Post", target: postId })
    return { liked: true, likesCount }
}

export async function unlikePost(postId,userId) {
    const post=await Post.findById(postId)
    if(!post || !canViewPost(post,userId)){
        throw new ApiError(404, "Post Not Found")
    }
    const like={user:userId,targetType:"Post",target:postId}
    await Like.deleteOne(like)
    const likesCount = await Like.countDocuments({ targetType: "Post", target: postId })
    return {liked:false,likesCount}
}