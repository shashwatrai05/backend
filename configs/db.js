import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => console.log('MongoDB connected successfully'))
        await mongoose.connect(`${process.env.MONGO_URL}`);

    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
};

export default connectDB;