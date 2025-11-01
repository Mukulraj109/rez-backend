import { Document, Types } from 'mongoose';
export interface IOutlet extends Document {
    store: Types.ObjectId;
    name: string;
    address: string;
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    phone: string;
    email?: string;
    openingHours: {
        day: string;
        open: string;
        close: string;
        isClosed: boolean;
    }[];
    isActive: boolean;
    offers: Types.ObjectId[];
    metadata: {
        manager?: string;
        capacity?: number;
    };
    createdAt: Date;
    updatedAt: Date;
}
declare const Outlet: any;
export default Outlet;
