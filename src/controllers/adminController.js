import { getUsers, updateUserRole } from "../services/adminService.js"

export async function listUsers(req, res) {
    const { page, limit } = req.pagination
    const { users, usersCount } = await getUsers(req.query.role, page, limit)
    const totalPages = Math.ceil(usersCount / limit)
    res.status(200).json({
        success: true,
        message: "users fetched successfully",
        data: { users, usersCount, page, totalPages },
    })
}

export async function changeRole(req, res) {
    const user = await updateUserRole(req.params.id, req.user._id, req.body.role)
    res.status(200).json({ success: true, message: "user role updated successfully", data: user })
}
