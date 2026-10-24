import Post from "../models/postModel.js";
import commentModel from "../models/commentModel.js";
import { ApiError } from "../utils/ApiError.js";

async function ownershipCheck(postId,userId){
    const post= await Post.findOne({_id:postId})
    if(!post){
        throw new ApiError(404, "Post Not Found")
    }
    if((userId.toString()!==post.author.toString())){
        if(post.status==="published"){
            throw new ApiError(403, "You cannot modify this post")
        }
        else{
            throw new ApiError(404, "Post Not Found")
        }
    }
    return post
}

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

export async function updatePost(postId,userId,data){
    await ownershipCheck(postId,userId)
    let updateData={}
    const allowed=['title','content','status','tags']
    for(const key of allowed){
        if(key in data){
            updateData[key]=data[key]
        }
    }
    const updatedPost=await Post.findByIdAndUpdate(postId,updateData,{ new: true, runValidators: true })
    return updatedPost
}

export async function deletePost(postId,userId){
    const post=await ownershipCheck(postId,userId)
    await Comment.deleteMany({post:postId})
    await Post.findByIdAndDelete(postId)
    return post
}

export async function getMyPosts(userId){
    const post=await Post.find({author:userId}).sort({ createdAt: -1 })
    return post
}