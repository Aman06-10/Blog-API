import express from "express"
import { validatePostData ,validatePostId} from "../middlewares/postMiddleware.js"
import { protect,optionalAuth } from "../middlewares/authMiddleware.js"
import { create ,getAll,getById} from "../controllers/postController.js"
const posts=express.Router()

posts.post('/',protect,validatePostData,create)
posts.get('/',getAll)
posts.get('/:id',validatePostId,optionalAuth,getById)

export default posts