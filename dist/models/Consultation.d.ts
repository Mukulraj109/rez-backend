import mongoose, { Document, Types } from 'mongoose';
export interface IConsultation extends Document {
    _id: Types.ObjectId;
    consultationNumber: string;
    storeId: Types.ObjectId;
    userId: Types.ObjectId;
    consultationType: string;
    consultationDate: Date;
    consultationTime: string;
    duration: number;
    patientName: string;
    patientAge: number;
    patientPhone: string;
    patientEmail?: string;
    reasonForConsultation: string;
    medicalHistory?: string;
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    doctorName?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    updateStatus(newStatus: string): Promise<IConsultation>;
    getFormattedDateTime(): string;
}
declare const Consultation: mongoose.Model<IConsultation, {}, {}, {}, mongoose.Document<unknown, {}, IConsultation, {}, {}> & IConsultation & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Consultation;
