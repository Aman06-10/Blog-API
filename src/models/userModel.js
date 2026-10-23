import mongoose from "mongoose";
import bcrypt from "bcrypt"

const userSchema=new mongoose.Schema({
    username:{
        type:String,
        unique:true,
        required:true,
        minlength:3,
        maxlength:50,
        trim:true
    },
    email:{
        type:String,
        unique:true,
        required:true,
        trim:true,
        lowercase:true,
        maxlength:254
    },
    password:{
        type:String,
        required:true,
        minlength:6,
        maxlength:128,
        select:false
    },
    role:{
        type:String,
        enum:['user','admin'],
        default:'user'
    }
},{
    timestamps:true
})

userSchema.pre("save",async function(){
    if(!this.isModified("password")){
        return;
    }
    this.password=await bcrypt.hash(this.password,10);
})

userSchema.methods.comparePassword=async function(GivenPassword) {
    let res=await bcrypt.compare(GivenPassword,this.password)
    return res;
}

export const User = mongoose.model("User", userSchema);
