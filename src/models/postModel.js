import mongoose from "mongoose"

const postSchema=new mongoose.Schema({
    title:{
        type:String,
        required:true,
        trim: true,
        minlength: 3,
        maxlength: 150
    },
    content:{
        type:String,
        required:true,
        trim:true,
        minlength:10
    },  
    tags:{
        type:[String],
        default:[]
    },
    status:{
        type:String,
        enum:['draft','published','archived'],
        default:"draft"
    },
    author:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    }
},
{
    timestamps:true
})

postSchema.index({ title: "text", content: "text" });
export const Post = mongoose.model("Post", postSchema);