// import { Component, OnInit } from '@angular/core';
// import { BrowserMultiFormatReader } from '@zxing/library';

// @Component({
//   selector: 'app-scanner',
//   templateUrl: './scanner.page.html',
//   styleUrls: ['./scanner.page.scss'],
// })
// export class ScannerPage implements OnInit {
//   private codeReader = new BrowserMultiFormatReader();
//   public scanning: boolean = false;

//   constructor() {}

//   ngOnInit() {
//     this.startScanning();
//   }

//   startScanning() {
//     this.scanning = true;

//     // Get the video element to display the camera feed
//     const videoElement: HTMLVideoElement = document.getElementById('video') as HTMLVideoElement;

//     // Start video stream
//     navigator.mediaDevices.getUserMedia({
//       video: { facingMode: 'environment' } // Use the back camera
//     })
//     .then((stream) => {
//       videoElement.srcObject = stream;
//       videoElement.play();

//       // Continuously scan for QR codes
//       this.scanQRCode(videoElement);
//     })
//     .catch((err) => {
//       console.error('Error accessing camera: ', err);
//       this.scanning = false;
//     });
//   }

//   // scanQRCode(videoElement: HTMLVideoElement) {
//   //   const canvasElement = document.createElement('canvas');
//   //   const canvasCtx = canvasElement.getContext('2d');

//   //   const drawFrame = () => {
//   //     if (!this.scanning) return;

//   //     // Set canvas size equal to video size
//   //     canvasElement.height = videoElement.videoHeight;
//   //     canvasElement.width = videoElement.videoWidth;

//   //     // Draw the current frame from the video to the canvas
//   //     canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

//   //     // Decode the QR code from the canvas
//   //     this.codeReader.decodeFromCanvas(canvasElement)
//   //       .then((result: { text: any; }) => {
//   //         console.log('QR Code Data:', result.text);
//   //         // Stop scanning once a QR code is detected
//   //         this.stopScanning();
//   //       })
//   //       .catch((err: any) => {
//   //         // Ignore errors (e.g., if no QR code is found)
//   //       });

//   //     // Request the next animation frame
//   //     requestAnimationFrame(drawFrame);
//   //   };

//   //   drawFrame();
//   // }
//   scanQRCode(videoElement: HTMLVideoElement) {
//     const resultElement = document.getElementById('result') as HTMLElement;
  
//     // Use the decodeFromVideoDevice method for real-time scanning
//     this.codeReader.decodeFromVideoDevice(undefined, videoElement, (result, err) => {
//       if (result) {
//         console.log('QR Code Data:', result.text);
//         // Optionally display the result
//         resultElement.innerText = `QR Code Data: ${result.text}`;
//         // Stop scanning once a QR code is detected
//         this.stopScanning();
//       }
  
//       if (err) {
//         console.error('Error scanning QR code:', err);
//       }
//     });
//   }
  

//   stopScanning() {
//     this.scanning = false;
//     const videoElement: HTMLVideoElement = document.getElementById('video') as HTMLVideoElement;
//     const stream = videoElement.srcObject as MediaStream;
//     const tracks = stream.getTracks();

//     // Stop all video tracks to turn off the camera
//     tracks.forEach(track => track.stop());
//   }
// }


import { Component, OnInit } from '@angular/core';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.page.html',
  styleUrls: ['./scanner.page.scss'],
})
export class ScannerPage implements OnInit {
  private codeReader = new BrowserMultiFormatReader();
  public scanning: boolean = false;

  constructor() {}

  ngOnInit() {
    // this.startScanning();
  }


  
  startScanning() {
    this.scanning = true;

    // Get the video element to display the camera feed
    const videoElement: HTMLVideoElement = document.getElementById('video') as HTMLVideoElement;

    // Start video stream
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' } // Use the back camera
    })
    .then((stream) => {
      videoElement.srcObject = stream;
      videoElement.play();

      // Continuously scan for QR codes
      this.scanQRCode(videoElement);
    })
    .catch((err) => {
      console.error('Error accessing camera: ', err);
      this.scanning = false;
    });
  }

  scanQRCode(videoElement: HTMLVideoElement) {
    const resultElement = document.getElementById('result') as HTMLElement;

    // Pass null to use the default camera
    this.codeReader.decodeFromVideoDevice(null, videoElement, (result, err) => {
      if (result) {
        // Use getText() to access the decoded text
        console.log('QR Code Data:', result.getText());
        alert(result.getText());
        // Optionally display the result
        resultElement.innerText = `QR Code Data: ${result.getText()}`;
        // Stop scanning once a QR code is detected
        this.stopScanning();
      }

      if (err && !(err instanceof NotFoundException)) {
        console.error('Error scanning QR code:', err);
      }
    });
  }

  stopScanning() {
    this.scanning = false;
    const videoElement: HTMLVideoElement = document.getElementById('video') as HTMLVideoElement;
    const stream = videoElement.srcObject as MediaStream;
    const tracks = stream.getTracks();

    // Stop all video tracks to turn off the camera
    tracks.forEach(track => track.stop());
  }
}
