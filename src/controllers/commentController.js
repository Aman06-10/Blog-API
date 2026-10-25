import { createComment, getComments } from "../services/commentService.js";

export async function addComment(req,res){
    const newComment=await createComment(req.params.id,req.user.id,req.body)
    res.status(201).json({success:true,message:"comment created successfully",data:newComment})
}

export async function listComment(req,res){
    const {comments,commentsCount,page,limit}=await getComments(req.params.id,req.user?.id,req.pagination.page,req.pagination.limit)
    const totalPages=(Math.ceil(commentsCount / limit))
    res.status(200).json({success:true,message:"comments fetched successfully",data: { comments, commentsCount, page, totalPages }})
}