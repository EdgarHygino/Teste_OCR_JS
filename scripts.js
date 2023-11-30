const video = document.getElementById("video-input");
const canvas = document.getElementById("canvas-output");

// const ctx = canvas.getContext("2d");

// // Defina a propriedade willReadFrequently como true
// ctx.imageSmoothingEnabled = true;
// ctx.imageSmoothingQuality = "high";
// ctx.willReadFrequently = true;

(async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });

  let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  let cap = new cv.VideoCapture(video);

  if (!stream) {
    src.delete();
    dst.delete();
    return;
  }

  video.srcObject = stream;
  video.play();

  const FPS = 30;
  function processVideo() {
    let begin = Date.now();
    cap.read(src);

    // start processing.
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    let resized = new cv.Mat();
    cv.resize(gray, resized, new cv.Size(800, 600));

    let thresh = new cv.Mat();
    cv.threshold(resized, thresh, 127, 255, cv.THRESH_BINARY);

    let edges = new cv.Mat();
    cv.Canny(gray, edges, 50, 200);


    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    

    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_LIST,//pode alterar para cv.RETR_LIST
      cv.CHAIN_APPROX_SIMPLE
    );
    
    let licensePlate;

    for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        const aspectRatio = rect.width / rect.height;
        if (aspectRatio > 2 && aspectRatio < 5) { //checking aspect ratio to locate license plate
            licensePlate = rect;
            break;
        }
    }

    console.log(licensePlate);

    if (licensePlate) {
      // Crie uma cópia da região da placa
      let plateRegion = new cv.Mat();
      src.roi = licensePlate;  // Defina a região de interesse (ROI) no frame original
      let teste = cv.cvtColor(src, plateRegion, cv.COLOR_RGBA2GRAY);  // Copie a região para a nova Mat
      src.roi = new cv.Rect();  // Limpe a ROI
  
      // Converta a Mat para um canvas
      const canvas = document.createElement('canvas');
      cv.imshow(canvas, plateRegion);
      
      // Converta o conteúdo do canvas para base64
      const base64Data = canvas.toDataURL("image/png").replace(/^data:image\/(png|jpg);base64,/, "");
  
      // Crie uma imagem a partir do base64 e exiba ou salve conforme necessário
      const img = new Image();
      img.src = 'data:image/png;base64,' + base64Data;
  
      // Exemplo de exibição no corpo do documento
      document.body.appendChild(img);
  
      // Use o Tesseract para realizar a leitura OCR na imagem recortada
      const { createWorker } = Tesseract;

      (async () => {
        const worker = await createWorker('eng');
        const ret = await worker.recognize(img);
        console.log(ret.data.text);
        const { data: { text } } = await worker.recognize('data:image/png;base64,' + base64Data);
          console.log("OCR Result:", text);
  
          await worker.terminate();
      })();
  
      plateRegion.delete();  // Libere a memória da Mat após o uso
  }
    cv.imshow("canvas-output", gray);

    // schedule the next one.
    let delay = 1000 / FPS - (Date.now() - begin);
    setTimeout(processVideo, delay);
  }

  setTimeout(processVideo, 0);


})();