import User from "../models/user.js";
import fs from 'fs';
import imagekit from "../configs/imageKit.js";
import path from 'path';
import Connection from "../models/Connection.js";
import Post from "../models/Post.js";
import { inngest } from "../ingest/index.js";

// Get User Data
export const getUserData = async (req, res) => {
    try {
        const { userId } = await req.auth();
        console.log('UserID from auth:', userId); // Debug log

        if (!userId) {
            return res.status(401).json({ message: "No user ID found in authentication" });
        }

        const user = await User.findById(userId);
        console.log('User found:', user ? 'Yes' : 'No'); // Debug log

        if (!user) {
            return res.status(404).json({ message: `User not found with ID: ${userId}` });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Error in getUserData:', error);
        res.status(500).json({ message: error.message });
    }
}

// Update User Data
export const updateUserData = async (req, res) => {
    try {
        const { userId } = await req.auth();
        let { username, bio, location, full_name } = req.body;
        const tempUser = await User.findById(userId);
        !username && (username = tempUser.username);

        if (username !== tempUser.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                username = tempUser.username;
            }
        }

        const updatedData = {
            username,
            bio,
            location,
            full_name
        }

        const profile = req.files.profile && req.files.profile[0];
        const cover = req.files.cover && req.files.cover[0];

        if (profile) {
            try {
                const response = await imagekit.files.upload({
                    file: fs.createReadStream(profile.path),
                    fileName: profile.originalname,
                });

                const url = imagekit.helper.buildSrc({
                    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
                    src: response.filePath,
                    transformation: [
                        {
                            quality: 'auto',
                            format: 'webp',
                            width: 512
                        }
                    ]
                });
                updatedData.profile_picture = url;

                // Clean up uploaded file
                fs.unlinkSync(profile.path);
            } catch (uploadError) {
                console.error('Profile upload error:', uploadError);
                throw new Error(`Profile upload failed: ${uploadError.message}`);
            }
        }

        if (cover) {
            try {
                const response = await imagekit.files.upload({
                    file: fs.createReadStream(cover.path),
                    fileName: cover.originalname,
                });

                const url = imagekit.helper.buildSrc({
                    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
                    src: response.filePath,
                    transformation: [
                        {
                            quality: 'auto',
                            format: 'webp',
                            width: 1280
                        }
                    ]
                });
                updatedData.cover_photo = url;

                // Clean up uploaded file
                fs.unlinkSync(cover.path);
            } catch (uploadError) {
                console.error('Cover upload error:', uploadError);
                throw new Error(`Cover upload failed: ${uploadError.message}`);
            }
        }

        const user = await User.findByIdAndUpdate(userId, updatedData, { new: true });

        res.status(200).json({ user, message: "User updated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Find User
export const discoverUser = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { input } = req.body;

        const allUsers = await User.find(
            {
                $or: [
                    { username: new RegExp(input, 'i') },
                    { full_name: new RegExp(input, 'i') },
                    { email: new RegExp(input, 'i') },
                    { location: new RegExp(input, 'i') }
                ]
            }
        )

        const filteredUsers = allUsers.filter(user => user._id !== userId);
        res.status(200).json({ users: filteredUsers, message: "Users fetched successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Follow User
export const followUser = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { followId } = req.body;

        const user = await User.findById(userId);

        if (user.following.includes(followId)) {
            return res.status(400).json({ message: "You are already following this user" });
        }

        user.following.push(followId);
        await user.save();

        const toUser = await User.findById(followId);
        toUser.followers.push(userId);
        await toUser.save();

        return res.status(200).json({ message: "User followed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Unfollow User
export const unFollowUser = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { followId } = req.body;

        const user = await User.findById(userId);

        user.following = user.following.filter(user => user !== followId);
        await user.save();

        const toUser = await User.findById(followId);
        toUser.followers = toUser.followers.filter(user => user !== userId);
        await toUser.save();

        return res.status(200).json({ message: "User unfollowed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Send connection request
export const sendConnectionRequest = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { connectId } = req.body;

        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const connectionRequests = await Connection.find({ from_user_id: userId, createdAt: { $gte: last24Hours } });
        if (connectionRequests.length >= 20) {
            return res.status(429).json({ message: "Connection request limit reached. Please try again later." });
        }

        const existingConnection = await Connection.findOne({
            $or: [
                { from_user_id: userId, to_user_id: connectId },
                { from_user_id: connectId, to_user_id: userId }
            ]
        })

        if (!existingConnection) {
            const newConnection = await Connection.create({
                from_user_id: userId,
                to_user_id: connectId,
            });

            await inngest.send({
                name: "app/connection-request",
                data: {
                    connectionId: newConnection._id
                }
            })
            return res.status(200).json({ message: "Connection request sent successfully" });
        } else if (existingConnection && existingConnection.status === 'accepted') {
            return res.status(400).json({ message: "You are already connected with this user" });
        }

        return res.status(400).json({ message: "Connection request Pending" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Get user connections
export const getUserConnections = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const user = await User.findById(userId).populate('connections followers following');

        const connections = user.connections
        const followers = user.followers
        const following = user.following

        const pendingConnections = (await Connection.find({ to_user_id: userId, status: 'pending' }).populate('from_user_id')).map(conn => conn.from_user_id);
        const connectionRequests = await Connection.find({ from_user_id: userId, createdAt: { $gte: last24Hours } });


        res.status(200).json({ connections, followers, following, pendingConnections });


    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Accept connection request
export const acceptConnectionRequest = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { connectId } = req.body;

        const connection = await Connection.findOne({ from_user_id: connectId, to_user_id: userId });
        if (!connection) {
            return res.status(404).json({ message: "Connection request not found" });
        }

        const user = await User.findById(userId);
        user.connections.push(connectId);
        await user.save();

        const toUser = await User.findById(connectId);
        toUser.connections.push(userId);
        await toUser.save();

        connection.status = 'accepted';
        await connection.save();
        return res.status(200).json({ message: "Connection request accepted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

//Get User Profiles
export const getUserProfiles = async (req, res) => {
    try {
        const { profileId } = req.body;
        const profile = await User.findById(profileId)
        if (!profile) {
            return res.status(404).json({ message: "User profile not found" });
        }

        const posts = await Post.find({ userId: profileId }).populate('user');

        res.status(200).json({ profile, posts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}