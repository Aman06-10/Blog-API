import express from "express"
import { validatePostData ,validatePostId, validateUpdatePostData} from "../validators/postValidator.js"
import { protect,optionalAuth } from "../middlewares/authMiddleware.js"
import { create ,deleteById,getAll,getById, getMine, updateById} from "../controllers/postController.js"
import { validatePagination } from "../validators/paginationValidator.js"
import { validateCommentData, validateCommentId } from "../validators/commentValidator.js"
import { addComment,listComment } from "../controllers/commentController.js"
const posts=express.Router()

posts.post('/',protect,validatePostData,create)
posts.get('/',getAll)
posts.get('/mine',protect,getMine)
posts.get('/:id',validatePostId,optionalAuth,getById)
posts.patch("/:id",protect,validatePostId,validateUpdatePostData,updateById)
posts.delete("/:id",protect,validatePostId,deleteById)
posts.post('/:id/comments', protect, validatePostId, validateCommentData, addComment)
posts.get('/:id/comments', validatePostId,validatePagination, optionalAuth, listComment)
export default posts