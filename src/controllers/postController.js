import { createPost, getPosts,getPostById,updatePost, deletePost} from "../services/postService.js"

export async function create(req,res){
    const newPost=await createPost(req.body,req.user.id)
    res.status(201).json({success:true,message:"Post added successfully",data:newPost})
}

export async function getAll(req,res){
    const totalPosts=await getPosts()
    res.status(200).json({success:true, message:"Posts fetched successfully",data:totalPosts})
}

export async function getById(req,res){
    const post=await getPostById(req.params.id,req.user?.id)
    res.status(200).json({success:true, message:"Post fetched successfully", data:post})
}

export async function updateById(req,res){
    const updatedPost=await updatePost(req.params.id,req.user.id,req.body)
    res.status(200).json({success:true, message:"Post updated successfully", data:updatedPost})
}

export async function deleteById(req,res){
    const deletedPost=await deletePost(req.params.id,req.user.id)
    res.status(200).json({success:true, message:"Post deleted successfully", data:deletedPost})
}