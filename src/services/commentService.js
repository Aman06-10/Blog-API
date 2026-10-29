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

export async function editComment(commentId,viewerId,data){
    const comment=await Comment.findById({_id:commentId})
    if(comment){
        const post=await Post.findById(comment.post)
        if(!post || !canViewPost(post,viewerId)){
            throw new ApiError(404,"comment not found")
        }
        if(comment.author.toString()===viewerId.toString()){
            const updatedContent=data.content.trim()
            if(updatedContent===comment.content){
                return comment
            }
            const updatedComment=await Comment.findByIdAndUpdate(commentId,{content:updatedContent,editedAt:new Date()},{ returnDocument: "after", runValidators: true })
            return updatedComment
        }
        else{
            throw new ApiError(403,"you cannot modify this comment")
        }
    }
    throw new ApiError(404,"comment not found")
}

export async function delComment(commentId,viewerId,viewerRole){
    const comment=await Comment.findById({_id:commentId})
    if(comment){
        const post=await Post.findById(comment.post)
        if((!post || !canViewPost(post,viewerId)) && viewerRole!=="admin"){
            throw new ApiError(404,"comment not found")
        }
        if(comment.author.toString()===viewerId.toString() || post?.author.toString()===viewerId.toString() || viewerRole==="admin"){
            await Comment.findByIdAndDelete(commentId)
            return comment
        }
        else{
          throw new ApiError(403,"you cannot delete this comment")
        }
    }
    throw new ApiError(404,"comment not found")
}