import { registerUser,loginUser } from "../services/authService.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

export async function register(req, res) {
    const { user, token } = await registerUser(req.body)
    res.status(201)
        .cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: env.JWT_EXPIRES_IN
        })
        .json({ success: true, message: "Registered successfully", data: user })
}

export async function login(req,res) {
    const {user,token}=await loginUser(req.body)
    res.status(200)
       .cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: env.JWT_EXPIRES_IN
        })
        .json({success:true, message:"Logged in successfully",data:user})
}

export function logout(req, res) {
        res.status(200)
            .clearCookie("token", {
                httpOnly: true,
                secure: false,
                sameSite: "lax"
            })
            .json({ success: true, message: "Logged Out Successfully" })
}

export function getMe(req,res){
    res.status(200).json({success:true , data:req.user})
}