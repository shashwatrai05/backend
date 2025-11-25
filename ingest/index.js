import { Inngest } from "inngest";
import User from "../models/user.js";

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


// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion
];