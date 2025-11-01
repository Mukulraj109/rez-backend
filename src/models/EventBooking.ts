import mongoose, { Document, Schema, Types } from 'mongoose';

// Event Booking Interface
export interface IEventBooking extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  slotId?: string; // For events with time slots
  bookingDate: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
  paymentId?: Types.ObjectId;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  attendeeInfo: {
    name: string;
    email: string;
    phone?: string;
    age?: number;
    specialRequirements?: string;
  };
  bookingReference: string; // Unique booking reference
  qrCode?: string; // QR code for event entry
  checkInTime?: Date;
  checkOutTime?: Date;
  notes?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Event Booking Schema
const EventBookingSchema = new Schema<IEventBooking>({
  eventId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Event', 
    required: true 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  slotId: { type: String },
  bookingDate: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'refunded'],
    default: 'pending'
  },
  paymentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Payment' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: '₹' 
  },
  attendeeInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    age: { type: Number },
    specialRequirements: { type: String }
  },
  bookingReference: { 
    type: String, 
    required: true, 
    unique: true 
  },
  qrCode: { type: String },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  notes: { type: String },
  refundAmount: { type: Number },
  refundReason: { type: String },
  refundedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
EventBookingSchema.index({ eventId: 1, userId: 1 });
EventBookingSchema.index({ userId: 1, status: 1 });
EventBookingSchema.index({ bookingReference: 1 });
EventBookingSchema.index({ status: 1, bookingDate: 1 });
EventBookingSchema.index({ paymentStatus: 1 });

// Pre-save middleware to generate booking reference
EventBookingSchema.pre('save', function(next) {
  if (!this.bookingReference) {
    // Generate unique booking reference: EVT + timestamp + random string
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.bookingReference = `EVT${timestamp}${random}`;
  }
  next();
});

// Static methods
EventBookingSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).populate('eventId');
};

EventBookingSchema.statics.findByEvent = function(eventId: string) {
  return this.find({ eventId }).populate('userId');
};

EventBookingSchema.statics.findByStatus = function(status: string) {
  return this.find({ status }).populate('eventId userId');
};

// Instance methods
EventBookingSchema.methods.confirm = function() {
  this.status = 'confirmed';
  this.paymentStatus = 'completed';
  return this.save();
};

EventBookingSchema.methods.cancel = function(reason?: string) {
  this.status = 'cancelled';
  this.notes = reason || 'Booking cancelled';
  return this.save();
};

EventBookingSchema.methods.checkIn = function() {
  this.checkInTime = new Date();
  this.status = 'completed';
  return this.save();
};

EventBookingSchema.methods.checkOut = function() {
  this.checkOutTime = new Date();
  return this.save();
};

// Create and export the model
const EventBooking = mongoose.model<IEventBooking>('EventBooking', EventBookingSchema);

export default EventBooking;
