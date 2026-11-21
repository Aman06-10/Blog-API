import express from "express"
import { protect } from "../middlewares/authMiddleware.js"
import { authorize } from "../middlewares/authorize.js"
import { validateCommentId,validateCommentData } from "../validators/commentValidator.js"
import { deleteComment, updateComment } from "../controllers/commentController.js"
import { addLike,removeLike } from "../controllers/likeController.js"
const comments=express.Router()

comments.patch('/:id', protect, authorize("comment:update"), validateCommentId, validateCommentData, updateComment)
comments.delete('/:id',protect,validateCommentId,deleteComment)
comments.post('/:id/like',protect,validateCommentId,addLike)
comments.delete('/:id', protect, authorize("comment:delete"), validateCommentId, deleteComment)

export default comments