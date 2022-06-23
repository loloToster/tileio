import { Schema, model } from "mongoose"

import { Grid } from "../types/types"

export interface DynamicCellsData {
    mininote: { text: string },
    weather: {
        lat: number,
        lon: number,
        name: string
    }
}

export interface IUser {
    name: string,
    strategyId: string,
    email: string,
    picture: string,
    grid: Grid,
    dynamicCells: Partial<DynamicCellsData>
}

const userSchema = new Schema<IUser>({
    name: String,
    strategyId: String,
    email: String,
    picture: String,
    grid: {
        col: { type: Number, default: 10 },
        row: { type: Number, default: 5 },
        cells: [{
            w: Number,
            h: Number,
            x: Number,
            y: Number,
            content: {
                type: { type: String },
                iconUrl: String,
                bgColor: String,
                link: String,
                src: String
            }
        }]
    },
    dynamicCells: {
        mininote: {
            text: String
        },
        weather: {
            lat: Number,
            lon: Number,
            name: String
        }
    }
})

export default model<IUser>("user", userSchema)
