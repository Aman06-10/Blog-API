import { likePost,unlikePost } from "../services/likeService.js"

export async function like(req,res) {
    const {liked,likesCount}=await likePost(req.params.id,req.user.id)
    res.status(200).json({success:true,message:"post liked successfully",data:{liked,likesCount}})
}
export async function unlike(req,res) {
    const {liked,likesCount}=await unlikePost(req.params.id,req.user.id)
    res.status(200).json({success:true,message:"post unliked successfully",data:{liked,likesCount}})
}