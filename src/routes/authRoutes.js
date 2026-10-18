import express from "express"
import { register,login,logout,getMe } from "../controllers/authController.js"
import { protect } from "../middlewares/authMiddleware.js"
const auth=express.Router()

auth.post('/login',login)
auth.post('/register',register)
auth.post('/logout',logout)
auth.get('/me',protect,getMe)

export default auth;