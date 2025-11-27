import { Inngest } from "inngest";
import User from "../models/user.js";
import sendEmail from "../configs/nodeMailer.js";
import Connection from "../models/Connection.js";
import Story from "../models/story.js";
import Message from "../models/message.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "amorzinho" });

const syncUserCreation = inngest.createFunction(
    { id: "sync-user-from-clerk" },
    { event: "clerk/user.created" },
    async ({ event }) => {
        // Function logic goes here
        const { id, first_name, last_name, email_addresses, image_url } = event.data;
        let username = email_addresses[0].email_address.split('@')[0];

        const user = await User.findOne({ username });
        if (user) {
            username = username + Math.floor(Math.random() * 10000);
        }

        const userData = new User({
            _id: id,
            email: email_addresses[0].email_address,
            full_name: first_name + " " + last_name,
            profile_picture: image_url,
            username: username
        });
        await User.create(userData);
    }
)

const syncUserUpdation = inngest.createFunction(
    { id: "update-user-from-clerk" },
    { event: "clerk/user.update" },
    async ({ event }) => {
        // Function logic goes here
        const { id, first_name, last_name, email_addresses, image_url } = event.data

        const updatedUserData = {

            email: email_addresses[0].email_address,
            full_name: first_name + " " + last_name,
            profile_picture: image_url,
        };
        await User.findByIdAndUpdate(id, updatedUserData);
    }
)

const syncUserDeletion = inngest.createFunction(
    { id: "delete-user-with-clerk" },
    { event: "clerk/user.deleted" },
    async ({ event }) => {
        // Function logic goes here
        const { id } = event.data;


        await User.findByIdAndDelete(id);
    }
)

const sendNewConnectionRequestReminder = inngest.createFunction(
    { id: "send-connection-request-reminder" },
    { event: "app/connection-request" },
    async ({ event, step }) => {
        // Function logic goes here
        const { connectionId } = event.data;

        await step.run('send-connection-request-mail', async () => {
            const connection = await Connection.findById(connectionId).populate(connectionId).populate('from_user_id to_user_id');
            const subject = "You have a new connection request";
            const text = `<p>Hi ${connection.to_user_id.full_name},</p>
            <p>You have a new connection request from ${connection.from_user_id.full_name}.</p>
            <p>Please log in to your account to accept or decline the request.</p>
            <p>Best regards,<br/>Amorzinho Team</p>`;

            await sendEmail({
                to: connection.to_user_id.email,
                subject,
                text
            })
        });

        const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await step.sleepUntil("wait-for-24-hours", in24Hours);
        await step.run('send-connection-request-reminder', async () => {
            const connection = await Connection.findById(connectionId).populate('from_user_id to_user_id');
            if (connection.status === 'accepted') {
                return { message: "Connection request already accepted" };
            }

            const subject = "You have a new connection request";
            const text = `<p>Hi ${connection.to_user_id.full_name},</p>
            <p>You have a new connection request from ${connection.from_user_id.full_name}.</p>
            <p>Please log in to your account to accept or decline the request.</p>
            <p>Best regards,<br/>Amorzinho Team</p>`;

            await sendEmail({
                to: connection.to_user_id.email,
                subject,
                text
            })

            return { message: "Reminder email sent successfully" };

        })
    }
)

const deleteStory = inngest.createFunction(
    { id: "story-delete" },
    { event: "app/story.delete" },
    async ({ event, step }) => {
        const { storyId } = event.data;
        const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await step.sleepUntil("wait-for-24-hours", in24Hours);
        await step.run('delete-story', async () => {
            await Story.findByIdAndDelete(storyId);
            return { message: "Story deleted successfully" };
        })
    }
)

const sendNotificationOfUnseenMessages = inngest.createFunction(
    { id: "send-unseen-message-notification" },
    { cron: "TZ=America/New_York 0 9 * * *" }, // Everyday 9 AM

    async ({ step }) => {
        const messages = await Message.find({ seen: false }).populate('to_user_id');
        const unseenCount = {}

        messages.map(message => {
            unseenCount[message.to_user_id._id] = (unseenCount[message.to_user_id._id] || 0) + 1;
        })

        for (const userId in unseenCount) {
            const user = await User.findById(userId);

            const subject = `You have ${unseenCount[userId]} unread message${unseenCount[userId] > 1 ? 's' : ''} on Amorzinho`;
            const text = `<p>Hi ${user.full_name},</p>
            <p>You have ${unseenCount[userId]} unread message${unseenCount[userId] > 1 ? 's' : ''} waiting for you on Amorzinho.</p>
            <p>Don't keep your connections waiting - log in now to catch up on your conversations!</p>
            <p>Best regards,<br/>The Amorzinho Team</p>`;

            await sendEmail({
                to: user.email,
                subject,
                text
            })
        }

        return { message: "Notification sent" }
    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion,
    sendNewConnectionRequestReminder,
    deleteStory,
    sendNotificationOfUnseenMessages
];