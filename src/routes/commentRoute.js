import express from "express"
import { protect } from "../middlewares/authMiddleware.js"
import { validateCommentId,validateCommentData } from "../validators/commentValidator.js"
import { deleteComment, updateComment } from "../controllers/commentController.js"
const comments=express.Router()

comments.patch('/:id',protect,validateCommentId,validateCommentData,updateComment)
comments.delete('/:id',protect,validateCommentId,deleteComment)

export default comments