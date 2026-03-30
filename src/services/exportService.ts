import ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
import { Response } from 'express';
import { LoggerService } from '../utils/logger';

export class ExportService {
  static async exportToExcel(data: any[], filename: string, res: Response) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');

      if (data.length === 0) {
        res.status(400).json({ message: 'No data to export' });
        return;
      }

      // Headers from first row
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Data rows
      data.forEach((item) => {
        worksheet.addRow(Object.values(item));
      });

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();

      LoggerService.info(`Excel export: ${data.length} rows`);
    } catch (error) {
      LoggerService.error('Excel export failed', error as Error);
      res.status(500).json({ message: 'Export failed' });
    }
  }

  static exportToCSV(data: any[], filename: string, res: Response) {
    try {
      if (data.length === 0) {
        res.status(400).json({ message: 'No data to export' });
        return;
      }

      const parser = new Parser();
      const csv = parser.parse(data);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
      res.send(csv);

      LoggerService.info(`CSV export: ${data.length} rows`);
    } catch (error) {
      LoggerService.error('CSV export failed', error as Error);
      res.status(500).json({ message: 'Export failed' });
    }
  }
}
