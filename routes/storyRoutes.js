import express from "express";
import { addUserStory, getStories } from "../controllers/storyController.js";
import { upload } from "../configs/multer.js";
import { protect } from "../middlewares/auth.js";

const storyRouter = express.Router();

storyRouter.post('/create', upload.single('media'), protect, addUserStory);
storyRouter.get('/feed', protect, getStories);

export default storyRouter;