import express from "express"
import { validatePostData ,validatePostId, validateUpdatePostData} from "../validators/postValidator.js"
import { protect,optionalAuth } from "../middlewares/authMiddleware.js"
import { create ,deleteById,getAll,getById, getMine, updateById} from "../controllers/postController.js"
const posts=express.Router()

posts.post('/',protect,validatePostData,create)
posts.get('/',getAll)
posts.get('/mine',protect,getMine)
posts.get('/:id',validatePostId,optionalAuth,getById)
posts.patch("/:id",protect,validatePostId,validateUpdatePostData,updateById)
posts.delete("/:id",protect,validatePostId,deleteById)

export default posts