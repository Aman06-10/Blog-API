import mongoose from "mongoose"
import { User } from "../models/userModel.js"
import Post from "../models/postModel.js"
import Comment from "../models/commentModel.js"
import Like from "../models/likeModel.js"
import { ApiError } from "../utils/ApiError.js"
import { ROLES } from "../validators/adminValidator.js"

export async function getUsers(role, page, limit) {
    const filter = role ? { role } : {}
    const skip = (page - 1) * limit
    const [users, usersCount] = await Promise.all([
        User.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
        User.countDocuments(filter),
    ])
    return { users, usersCount }
}

export async function updateUserRole(targetId, actorId, role) {
    if (new mongoose.Types.ObjectId(targetId).equals(actorId)) {
        throw new ApiError(400, "you cannot change your own role")
    }
    const user = await User.findByIdAndUpdate(
        targetId,
        { role },
        { returnDocument: "after", runValidators: true }
    )
    if (!user) {
        throw new ApiError(404, "user not found")
    }
    return user
}

function toCounts(rows, keys) {
    const counts = Object.fromEntries(keys.map((key) => [key, 0]))
    for (const row of rows) counts[row._id] = row.count
    return counts
}

export async function getStats() {
    const [usersByRole, postsByStatus, commentsCount, likesCount] = await Promise.all([
        User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
        Post.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Comment.countDocuments(),
        Like.countDocuments(),
    ])
    const byRole = toCounts(usersByRole, ROLES)
    const byStatus = toCounts(postsByStatus, ["draft", "published", "archived"])
    const sum = (counts) => Object.values(counts).reduce((a, b) => a + b, 0)
    return {
        users: { total: sum(byRole), byRole },
        posts: { total: sum(byStatus), byStatus },
        comments: commentsCount,
        likes: likesCount,
    }
}