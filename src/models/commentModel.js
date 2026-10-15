import mongoose from "mongoose"

const commentSchema=new mongoose.Schema(
    {
        content:{
            type:String,
            minlength:1,
            maxlength:500,
            trim:true,
            required:true
        },
        post:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Post",
            required:true
        },
        author:{
            type:mongoose.Schema.Types.ObjectId,
            required:true,
            ref:"User"
        }
    },
    {
        timestamps:true
    }
)

export const Comment=mongoose.model('Comment',commentSchema)