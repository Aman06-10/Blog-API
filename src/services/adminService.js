import mongoose from "mongoose"
import { User } from "../models/userModel.js"
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
