// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI);

// Seat Schema
const seatSchema = new mongoose.Schema({
  seatId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['available', 'selected', 'booked'], default: 'available' },
  bookedBy: { type: String },
  bookingTime: { type: Date },
  paymentStatus: { type: String, enum: ['pending', 'completed'], default: 'pending' }
});

const Seat = mongoose.model('Seat', seatSchema);

// Initialize seats if they don't exist
async function initializeSeats() {
  const rowLabels = ['0', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
  for (let i = 0; i < 21; i++) {
    for (let j = 0; j < 17; j++) {
      const seatId = `${rowLabels[i]}${j + 1}`;
      await Seat.findOneAndUpdate(
        { seatId },
        { status: 'available' },
        { upsert: true }
      );
    }
  }
}

// Routes
app.get('/api/seats', async (req, res) => {
  try {
    const seats = await Seat.find();
    res.json(seats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/seats/book', async (req, res) => {
  try {
    const { seats, userId } = req.body;
    
    // Check if seats are available
    const seatStatus = await Seat.find({ 
      seatId: { $in: seats },
      status: 'booked'
    });
    
    if (seatStatus.length > 0) {
      return res.status(400).json({ 
        message: 'One or more seats are already booked' 
      });
    }

    // Update seats to selected status
    await Seat.updateMany(
      { seatId: { $in: seats } },
      { 
        status: 'selected',
        bookedBy: userId,
        bookingTime: new Date()
      }
    );

    res.json({ message: 'Seats selected successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/seats/confirm', async (req, res) => {
  try {
    const { seats, userId, paymentStatus } = req.body;
    
    await Seat.updateMany(
      { 
        seatId: { $in: seats },
        bookedBy: userId
      },
      { 
        status: 'booked',
        paymentStatus
      }
    );

    res.json({ message: 'Booking confirmed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeSeats();
});