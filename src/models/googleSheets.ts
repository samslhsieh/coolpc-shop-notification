import path from 'path'
import moment from 'moment'
import { google, sheets_v4 } from 'googleapis'

export class GoogleSheets {
    private sheets: sheets_v4.Sheets

    constructor(options: { keyPath: string }) {
        const { keyPath } = options

        const keys = require(path.resolve(keyPath))

        const client = new google.auth.JWT(
            keys.client_email,
            undefined,
            keys.private_key,
            [
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/documents',
                // 'https://www.googleapis.com/auth/spreadsheets',
            ]
        )

        client.authorize((error, tokens) => {
            if (error) {
                console.log(error)
                return
            } else {
                console.log(`${moment().toISOString()} google spreadsheets connected…`)
            }
        })

        this.sheets = google.sheets({ version: 'v4', auth: client })
    }

    async create(options: { fileName?: string }) {
        const { fileName } = options
        const resp = await this.sheets.spreadsheets.create({
            requestBody: {
                // request body parameters
                // {
                //   "dataSourceSchedules": [],
                //   "dataSources": [],
                //   "developerMetadata": [],
                //   "namedRanges": [],
                properties: { title: fileName },
                //   "sheets": [],
                //   "spreadsheetId": "my_spreadsheetId",
                //   "spreadsheetUrl": "my_spreadsheetUrl"
                // }
            },
        })
        return { sheetsId: resp.data.spreadsheetId, data: resp.data }
    }

    async append(sheetsId: string, values: any[][]) {
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: sheetsId,
            range: 'Sheet1',
            valueInputOption: 'RAW',
            requestBody: { values },
        })
    }

    async getData(spreadsheetId: string, range: string = 'Sheet1!A1') {
        return (await this.sheets.spreadsheets.values.get({
            spreadsheetId,
            range
        })).data;
    }

    async update(spreadsheetId: string, range: string = 'Sheet1!A1', values: any = [[1]]) {
        return (await this.sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            requestBody: {
                values
            },
        })).data;
    }
}
