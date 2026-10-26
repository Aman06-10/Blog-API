import express from "express"
import { protect } from "../middlewares/authMiddleware.js"
import { validateCommentId,validateCommentData } from "../validators/commentValidator.js"
import { updateComment } from "../controllers/commentController.js"
const comments=express.Router()

comments.patch('/:id',protect,validateCommentId,validateCommentData,updateComment)


export default comments