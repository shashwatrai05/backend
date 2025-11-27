import fs, { stat } from "fs"
import imagekit from "../configs/imageKit.js";
import { format } from "path";
import Message from "../models/message.js";
const connections = {};

export const sseController = (req, res) => {
    const { userId } = req.params
    console.log('New Client Connected:', userId)

    // Set SSE Headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')

    // Add client's response object to connections object
    connections[userId] = res

    // Send an initian event to the client
    res.write('log: Connected to SSE stream\n\n')

    // Handle client disconnection
    req.on('clonse', () => {
        delete connections[userId]
        console.log('Client disconnected')
    })
}

// Send Message
export const sendMessage = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { to_user_id, text } = req.body;
        const image = req.file;

        let media_url = '';
        let message_type = image ? 'image' : 'text';

        if (message_type === 'image') {
            const fileBuffer = fs.readFileSync(image.path);
            const response = await imagekit.files.upload({
                file: fileBuffer,
                fileName: image.originalname
            });

            media_url = imagekit.files.url({
                path: response.filePath,
                transformation: [
                    { quality: 'auto' },
                    { format: 'webp' },
                    { width: '1280' }
                ]
            })
        }

        const message = await Message.create({
            from_user_id: userId,
            to_user_id,
            text,
            message_type,
            media_url
        })

        res.status(200).json({ message })

        const messageWithUserData = await Message.findById(message._id).populate('from_user_id');

        if (connections[to_user_id]) {
            connections[to_user_id].write(`data: ${JSON.stringify(messageWithUserData)}\n\n`)
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Get Chat Messages
export const getChatMessages = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { to_user_id } = req.body;

        const messages = await Message.find({
            $or: [
                { from_user_id: userId, to_user_id },
                { from_user_id: to_user_id, to_user_id: userId }
            ]
        }).sort({ created_at: -1 })
        await Message.updateMany({ from_user_id: to_user_id, to_user_id: userId }, { seen: true })

        res.status(200).json({ messages });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const getUserRecentMessages = async (req, res) => {
    try {
        const { userId } = req.auth();
        const messages = await Message.find({ to_user_id: userId }).populate('from_user_id to_user_id').sort({ created_at: -1 })

        res.status(200).json({ messages });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}