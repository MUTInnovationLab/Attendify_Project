import { Injectable } from '@angular/core';


@Injectable({
  providedIn: 'root'
})
export class QrScannerService {
  constructor() {}





  private filterData(data: any) {
    // Perform any data filtering or transformation here
    // For example, parse JSON data from the QR code
    try {
      return JSON.parse(data.text);
    } catch (e) {
      console.error('Error parsing QR code data', e);
      return null;
    }
  }
}
