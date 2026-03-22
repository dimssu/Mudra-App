import { User, IUser } from '../models/User';
import { ValidationError, NotFoundError } from '../utils/errors';
import { RedisCache } from '../utils/redis-cache';

export default class UserService {
  static async getAllUsers(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const query: any = { isDeleted: { $ne: true } };
    
    // Add search functionality if search parameter is provided
    if (search) {
      query.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query, { password: 0 })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(query);
    
    return {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getUserById(userId: string) {
    // Try to get from cache first
    const cachedUser = await RedisCache.get<IUser>(`user:${userId}`);
    if (cachedUser && !cachedUser.isDeleted) {
      return cachedUser;
    }

    const user = await User.findOne({ _id: userId, isDeleted: { $ne: true } }, { password: 0 });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Cache the user data
    await RedisCache.set(`user:${userId}`, user);
    
    return user;
  }

  static async updateUser(userId: string, updateData: Partial<IUser>, isAdmin: boolean = false) {
    // Find the user first
    const user = await User.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Handle sensitive fields based on admin status
    let safeUpdateData: Partial<IUser> = {};
    
    if (isAdmin) {
      // Admins can update role and email
      const { password, authMethod, ...adminSafeData } = updateData;
      safeUpdateData = adminSafeData;
    } else {
      // Regular users cannot update role, email, or auth method
      const { password, authMethod, role, email, ...regularSafeData } = updateData;
      safeUpdateData = regularSafeData;
    }

    // Check if userName is being updated and if it's already taken
    if (safeUpdateData.userName) {
      const existingUser = await User.findOne({ 
        userName: safeUpdateData.userName,
        _id: { $ne: userId },
        isDeleted: { $ne: true }
      });
      
      if (existingUser) {
        throw new ValidationError('Username already taken');
      }
    }

    // Check if email is being updated and if it's already taken
    if (safeUpdateData.email) {
      const existingUser = await User.findOne({ 
        email: safeUpdateData.email,
        _id: { $ne: userId },
        isDeleted: { $ne: true }
      });
      
      if (existingUser) {
        throw new ValidationError('Email already taken');
      }
    }

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: safeUpdateData },
      { new: true, runValidators: true, select: '-password' }
    );

    // Update cache
    if (updatedUser) {
      await RedisCache.set(`user:${userId}`, updatedUser);
    }

    return updatedUser;
  }

  static async deleteUser(userId: string) {
    const user = await User.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Soft delete by setting isDeleted to true
    const deletedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { isDeleted: true } },
      { new: true }
    );
    
    // Update cache
    if (deletedUser) {
      await RedisCache.set(`user:${userId}`, deletedUser);
    }

    return { success: true, message: 'User deleted successfully' };
  }

  // New method to permanently delete a user (for admin purposes)
  static async permanentlyDeleteUser(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await User.findByIdAndDelete(userId);
    
    // Remove from cache
    await RedisCache.del(`user:${userId}`);

    return { success: true, message: 'User permanently deleted' };
  }
} 