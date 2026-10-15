import mongoose from "mongoose"
import { env } from "./env.js";
export async function db() {
    try{
        const db=await mongoose.connect(env.MONGODB_URL)
        console.log("Database Connected")
    } 
    catch (error){
        console.log(error)
        process.exit(1)
    }
}