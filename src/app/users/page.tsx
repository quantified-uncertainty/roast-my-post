import { auth } from "@/lib/auth";
import { UserModel } from "@/models/User";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await auth();
  const currentUserId = session?.user?.id;

  const users = await UserModel.getAllUsers();

  // Add isCurrentUser flag to each user
  const usersWithAuth = users.map((user) => ({
    ...user,
    isCurrentUser: user.id === currentUserId,
  }));

  return (
    <div className="space-y-8">
      <UsersClient users={usersWithAuth} />
    </div>
  );
}
