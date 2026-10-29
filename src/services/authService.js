import jwt from "jsonwebtoken"
import { env } from "../config/env.js"
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/userModel.js"
export function generateToken(data) {
   return jwt.sign({ id: data._id}, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })
}

export async function registerUser(data){
    const username=data.username.trim()
    const email=data.email.trim().toLowerCase()
    const password=data.password
    const istrue=await User.findOne({ $or: [{email}, {username}]})
    if(istrue){
        throw new ApiError(409,"User or Email already exists")
    }
    const user=await User.create({ username, email, password })
    const token=generateToken(user)
    user.password = undefined
    return {user,token}
}

export async function loginUser(data){
    const email=data.email.trim().toLowerCase()
    const password=data.password
    const user=await User.findOne({email}).select("+password")
    if (!user || !(await user.comparePassword(password))) {
        throw new ApiError(401, "Invalid Email Or Password")
    }
    const token=generateToken(user)
    user.password = undefined
    return {user,token}
}

export function verifyToken(token) {
   return jwt.verify(token, env.JWT_SECRET)
}