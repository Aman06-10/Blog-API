const userPermissions = [
    "post:update:own",
    "post:delete:own",
    "comment:update:own",
    "comment:delete:own",
]

export const permissions = {
    user: userPermissions,
    moderator: [...userPermissions, "comment:delete:any"],
    admin: [...userPermissions,"post:delete:any","user:read:any","comment:delete:any","user:update-role:any"],
}