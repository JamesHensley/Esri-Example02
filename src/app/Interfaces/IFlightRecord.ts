import { ISnapShotRecord } from './ISnapShotRecord';

export interface IFlightRecord {
    ident: string;
    track: Array<ISnapShotRecord>;
}
