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

export async function updatePost(postId,userId,data){
    const post= await Post.findOne({_id:postId})
    if(!post){
        throw new ApiError(404, "Post Not Found")
    }
    if((userId.toString()!==post.author.toString())){
        if(post.status==="published"){
            throw new ApiError(403, "You cannot update this Post")
        }
        else{
            throw new ApiError(404, "Post Not Found")
        }
    }
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