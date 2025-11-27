import fs from "fs";
import imagekit from "../configs/imageKit.js";
import Post from "../models/Post.js";
import User from "../models/user.js";

// Add Post
export const addPost = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { content, post_type } = req.body;
        const images = req.files;

        let image_urls = []

        if (images.length) {
            image_urls = await Promise.all(
                images.map(async (image) => {
                    const response = await imagekit.files.upload({
                        file: fs.createReadStream(image.path),
                        fileName: image.originalname,
                        folder: "posts"
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
                    return url;
                })
            );
        }

        await Post.create({
            user: userId,
            content,
            image_urls,
            post_type,
        })

        res.status(201).json({ message: "Post created successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Get Feed Posts
export const getFeedPosts = async (req, res) => {
    try {
        const { userId } = req.auth();
        const user = await User.findById(userId);

        const userIds = [userId, ...user.connections, ...user.following];
        const posts = await Post.find({ user: { $in: userIds } }).populate('user').sort({ createdAt: -1 });
        res.status(200).json({ posts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


// Like post
export const likePost = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { postId } = req.body;

        const post = await Post.findById(postId);

        if (post.likes_count.includes(userId)) {
            post.likes_count = post.likes_count.filter(id => id !== userId);
            await post.save();
            return res.status(200).json({ message: "Post unliked successfully" });
        } else {
            post.likes_count.push(userId);
            await post.save();
            return res.status(200).json({ message: "Post liked successfully" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}