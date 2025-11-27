import fs from 'fs';
import Story from '../models/story.js';
import { inngest } from "../ingest/index.js";

export const addUserStory = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { content, media_type, background_color } = req.body;
        const media = req.file;
        let media_url = ''

        if (media_type === 'image' || media_type === 'video') {
            const fileBuffer = fs.readFileSync(media.path);
            const response = await imagekit.files.upload({
                file: fileBuffer,
                fileName: media.originalname,
                folder: "stories"
            });
            media_url = response.url;
        }

        // Create Story
        const story = await Story.create({
            user: userId,
            content,
            media_url,
            media_type,
            background_color
        });

        await inngest.send({
            name: "app/story.delete",
            data: {
                storyId: story._id
            }
        })
        res.status(201).json(story);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Get Stories
export const getStories = async (req, res) => {
    try {
        const { userId } = req.auth();
        const user = await User.findById(userId);

        const userIds = [userId, ...user.connections, ...user.following];
        const stories = await Story.find({ user: { $in: userIds } }).populate('user').sort({ createdAt: -1 });
        res.status(200).json({ stories });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}