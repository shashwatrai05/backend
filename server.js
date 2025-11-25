import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/db';
import { inngest, functions } from "./src/inngest"

const app = express();

await connectDB();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.use("/api/inngest", serve({ client: inngest, functions }));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})