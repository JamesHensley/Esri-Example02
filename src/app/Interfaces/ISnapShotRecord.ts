export interface ISnapShotRecord {
    "timestamp": number;
    "coord": Array<number>;
    "alt": number;
    "gs": number;
    "type": string;
    "isolated": boolean;
    "latitude"?: number;
    "longitude"?: number;
    "flightNum"?: string;
}