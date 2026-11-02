import { likePost,unlikePost,likeComment,unlikeComment } from "../services/likeService.js"

export async function like(req,res) {
    const {liked,likesCount}=await likePost(req.params.id,req.user.id)
    res.status(200).json({success:true,message:"post liked successfully",data:{liked,likesCount}})
}

export async function unlike(req,res) {
    const {liked,likesCount}=await unlikePost(req.params.id,req.user.id)
    res.status(200).json({success:true,message:"post unliked successfully",data:{liked,likesCount}})
}

export async function addLike(req,res){
    const {liked,likesCount}=await likeComment(req.params.id,req.user.id)
    res.status(200).json({success:true,message:"comment liked successfully",data:{liked,likesCount}})
}

export async function removeLike(req,res) {
    const {liked,likesCount}=await unlikeComment(req.params.id,req.user.id)
    res.status(200).json({success:true,message:"comment unliked successfully",data:{liked,likesCount}})
}