import mongoose from "mongoose"

const likeSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        targetType: {
            type: String,
            enum: ["Post", "Comment"],
            required: true
        },
        target: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "targetType",
            required: true
        }
    },
    { timestamps: { createdAt: true, updatedAt: false } }
)

likeSchema.index({ user: 1, targetType: 1, target: 1 }, { unique: true })
likeSchema.index({ targetType: 1, target: 1 })

const Like = mongoose.model("Like", likeSchema)
export default Like