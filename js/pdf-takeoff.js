/**
 * Interactive PDF Drawing Takeoff Workspace Module for MECALC
 * Language: English 100% (Rule §2)
 */

window.PdfTakeoff = {
    pdfDoc: null,
    pageNum: 1,
    pageRendering: false,
    pageNumPending: null,
    canvas: null,
    ctx: null,
    container: null,
    
    // Calibration and measurements state
    scaleRatio: null, // pixels per meter
    currentTool: 'hand', // 'hand', 'calibrate', 'line', 'area'
    points: [], // current drawing points [{x, y}, ...]
    drawings: [], // history of completed drawings [{type, points, value, color}]
    
    // Zoom and Pan state
    zoomLevel: 1.5,
    isDragging: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
    
    // Temporary calibration points
    calibPoints: [],
    
    init: function() {
        this.canvas = document.getElementById('takeoffCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.container = document.getElementById('canvasScrollContainer');
        
        // Configure PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }
        
        this.setupEventListeners();
    },
    
    setupEventListeners: function() {
        const self = this;
        
        // Canvas mouse event listeners for drawing
        this.canvas.addEventListener('mousedown', function(e) {
            const rect = self.canvas.getBoundingClientRect();
            // Translate coordinates to match internal canvas scale
            const x = (e.clientX - rect.left) * (self.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (self.canvas.height / rect.height);
            
            if (self.currentTool === 'hand') {
                self.isDragging = true;
                self.canvas.style.cursor = 'grabbing';
                self.startX = e.pageX - self.container.offsetLeft;
                self.startY = e.pageY - self.container.offsetTop;
                self.scrollLeft = self.container.scrollLeft;
                self.scrollTop = self.container.scrollTop;
            } else if (self.currentTool === 'calibrate') {
                self.calibPoints.push({ x, y });
                if (self.calibPoints.length === 2) {
                    // Show calibration distance input box
                    document.getElementById('calibrateValGroup').style.display = 'block';
                }
                self.draw();
            } else if (self.currentTool === 'line') {
                self.points.push({ x, y });
                self.draw();
            } else if (self.currentTool === 'area') {
                self.points.push({ x, y });
                self.draw();
            }
        });
        
        this.canvas.addEventListener('mousemove', function(e) {
            if (self.currentTool === 'hand' && self.isDragging) {
                const x = e.pageX - self.container.offsetLeft;
                const y = e.pageY - self.container.offsetTop;
                const walkX = (x - self.startX) * 1.5; // Scroll speed multiplier
                const walkY = (y - self.startY) * 1.5;
                self.container.scrollLeft = self.scrollLeft - walkX;
                self.container.scrollTop = self.scrollTop - walkY;
            } else if (self.points.length > 0 && (self.currentTool === 'line' || self.currentTool === 'area')) {
                const rect = self.canvas.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left) * (self.canvas.width / rect.width);
                const mouseY = (e.clientY - rect.top) * (self.canvas.height / rect.height);
                self.drawTempLine(mouseX, mouseY);
            }
        });
        
        window.addEventListener('mouseup', function() {
            if (self.currentTool === 'hand' && self.isDragging) {
                self.isDragging = false;
                self.canvas.style.cursor = 'grab';
            }
        });
        
        // Double click to finish line or polygon area
        this.canvas.addEventListener('dblclick', function() {
            if (self.points.length > 1) {
                if (self.currentTool === 'line') {
                    const length = self.calculateLineLength(self.points);
                    self.drawings.push({
                        type: 'line',
                        points: [...self.points],
                        value: length,
                        color: '#00f2fe'
                    });
                    
                    // Populate to active field
                    self.dispatchMeasurement(length, 'length');
                } else if (self.currentTool === 'area') {
                    const area = self.calculatePolygonArea(self.points);
                    self.drawings.push({
                        type: 'area',
                        points: [...self.points],
                        value: area,
                        color: '#d500f9'
                    });
                    
                    // Populate to active field
                    self.dispatchMeasurement(area, 'area');
                }
                
                self.points = [];
                self.draw();
            }
        });
    },
    
    setTool: function(toolName) {
        this.currentTool = toolName;
        this.points = [];
        this.calibPoints = [];
        document.getElementById('calibrateValGroup').style.display = 'none';
        
        // Style cursors
        if (toolName === 'hand') {
            this.canvas.style.cursor = 'grab';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
        
        this.draw();
    },
    
    loadPDF: function(file) {
        const self = this;
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const typedarray = new Uint8Array(e.target.result);
            
            pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                self.pdfDoc = pdf;
                self.pageNum = 1;
                self.drawings = [];
                self.points = [];
                self.calibPoints = [];
                self.scaleRatio = null;
                document.getElementById('currentScaleText').innerText = 'Chưa calibrate';
                document.getElementById('currentScaleText').className = 'text-bold text-gray';
                
                self.renderPage(self.pageNum);
            }).catch(err => {
                console.error("Error loading PDF: ", err);
                alert("Không thể đọc file PDF này. Vui lòng kiểm tra lại file của bạn.");
            });
        };
        
        reader.readAsArrayBuffer(file);
    },
    
    renderPage: function(num) {
        const self = this;
        this.pageRendering = true;
        
        // Using promise to fetch the page
        this.pdfDoc.getPage(num).then(function(page) {
            const viewport = page.getViewport({ scale: self.zoomLevel });
            self.canvas.width = viewport.width;
            self.canvas.height = viewport.height;
            
            // Render PDF page into canvas context
            const renderContext = {
                canvasContext: self.ctx,
                viewport: viewport
            };
            const renderTask = page.render(renderContext);
            
            // Wait for rendering to finish
            renderTask.promise.then(function() {
                self.pageRendering = false;
                if (self.pageNumPending !== null) {
                    self.renderPage(self.pageNumPending);
                    self.pageNumPending = null;
                }
                
                // Draw existing markings on top of the page
                self.draw();
            });
        });
    },
    
    draw: function() {
        const self = this;
        if (!this.pdfDoc) return;
        
        // We redraw the PDF page first (by rendering, but we can't render every mousemove due to heavy CPU load)
        // For drawing overlay, we only redraw overlay markings. If we clear, we lose the PDF background.
        // So we render the page first, then draw shapes.
        // To prevent lag, we store the rendered page as background image or draw elements on canvas.
        
        // Draw finished drawings
        this.drawings.forEach(d => {
            self.drawShape(d.points, d.type, d.color, d.value);
        });
        
        // Draw active drawing in progress
        if (this.points.length > 0) {
            self.drawShape(this.points, this.currentTool, '#00f2fe', null, false);
        }
        
        // Draw calibration points
        if (this.calibPoints.length > 0) {
            self.calibPoints.forEach((pt, index) => {
                self.ctx.beginPath();
                self.ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
                self.ctx.fillStyle = '#ff9100';
                self.ctx.fill();
                self.ctx.lineWidth = 2;
                self.ctx.strokeStyle = '#ffffff';
                self.ctx.stroke();
                
                // Label
                self.ctx.fillStyle = '#ffffff';
                self.ctx.font = 'bold 12px sans-serif';
                self.ctx.fillText(`Điểm ${index + 1}`, pt.x + 10, pt.y - 10);
            });
            
            if (self.calibPoints.length === 2) {
                self.ctx.beginPath();
                self.ctx.moveTo(self.calibPoints[0].x, self.calibPoints[0].y);
                self.ctx.lineTo(self.calibPoints[1].x, self.calibPoints[1].y);
                self.ctx.lineWidth = 3;
                self.ctx.strokeStyle = '#ff9100';
                self.ctx.stroke();
            }
        }
    },
    
    drawShape: function(pts, type, color, value, isClosed = true) {
        if (pts.length === 0) return;
        
        this.ctx.beginPath();
        this.ctx.moveTo(pts[0].x, pts[0].y);
        
        for (let i = 1; i < pts.length; i++) {
            this.ctx.lineTo(pts[i].x, pts[i].y);
        }
        
        if (type === 'area' && isClosed) {
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(213, 0, 249, 0.15)';
            this.ctx.fill();
        }
        
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
        
        // Draw small circles on vertices
        pts.forEach(pt => {
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
            this.ctx.strokeStyle = color;
            this.ctx.stroke();
        });
        
        // Draw measurements value text label
        if (value !== null && value !== undefined) {
            const midPt = pts[Math.floor(pts.length / 2)];
            this.ctx.fillStyle = '#0d0e15';
            this.ctx.font = 'bold 13px sans-serif';
            
            const txt = type === 'area' ? `${value.toFixed(2)} m²` : `${value.toFixed(2)} m`;
            const textWidth = this.ctx.measureText(txt).width;
            
            // Text background card
            this.ctx.fillStyle = 'rgba(13, 14, 21, 0.85)';
            this.ctx.fillRect(midPt.x - (textWidth/2) - 6, midPt.y - 12, textWidth + 12, 22);
            this.ctx.strokeStyle = color;
            this.ctx.strokeRect(midPt.x - (textWidth/2) - 6, midPt.y - 12, textWidth + 12, 22);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(txt, midPt.x - (textWidth/2), midPt.y + 4);
        }
    },
    
    drawTempLine: function(mouseX, mouseY) {
        // Redraw page first to clear previous temp lines
        this.renderPage(this.pageNum);
        
        const self = this;
        setTimeout(() => {
            self.draw(); // Draw established elements
            
            // Draw line to current mouse coordinates
            self.ctx.beginPath();
            const lastPt = self.points[self.points.length - 1];
            self.ctx.moveTo(lastPt.x, lastPt.y);
            self.ctx.lineTo(mouseX, mouseY);
            self.ctx.lineWidth = 2;
            self.ctx.strokeStyle = self.currentTool === 'area' ? '#d500f9' : '#00f2fe';
            self.ctx.setLineDash([6, 4]); // dashed guide
            self.ctx.stroke();
            self.ctx.setLineDash([]); // reset line dash
        }, 30);
    },
    
    saveCalibration: function(realDistance) {
        if (this.calibPoints.length !== 2) return;
        
        const dx = this.calibPoints[1].x - this.calibPoints[0].x;
        const dy = this.calibPoints[1].y - this.calibPoints[0].y;
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);
        
        this.scaleRatio = pixelDistance / parseFloat(realDistance);
        
        document.getElementById('currentScaleText').innerText = `${this.scaleRatio.toFixed(1)} px/m`;
        document.getElementById('currentScaleText').className = 'text-bold text-success';
        
        // Hide config group and clear calib markers
        this.calibPoints = [];
        document.getElementById('calibrateValGroup').style.display = 'none';
        this.setTool('hand');
        
        alert("Đã lưu tỷ lệ xích bản vẽ thành công! Bây giờ bạn có thể đo chiều dài hoặc diện tích.");
    },
    
    calculateLineLength: function(pts) {
        if (!this.scaleRatio) {
            alert("Vui lòng thực hiện Cân chỉnh (Calibrate) bản vẽ trước khi tiến hành đo đạc!");
            return 0;
        }
        
        let pixelLength = 0;
        for (let j = 0; j < pts.length - 1; j++) {
            const dx = pts[j+1].x - pts[j].x;
            const dy = pts[j+1].y - pts[j].y;
            pixelLength += Math.sqrt(dx * dx + dy * dy);
        }
        
        return pixelLength / this.scaleRatio;
    },
    
    calculatePolygonArea: function(pts) {
        if (!this.scaleRatio) {
            alert("Vui lòng thực hiện Cân chỉnh (Calibrate) bản vẽ trước khi tiến hành đo đạc!");
            return 0;
        }
        
        // Shoelace Formula
        let area = 0;
        let j = pts.length - 1;
        for (let i = 0; i < pts.length; i++) {
            area += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
            j = i;
        }
        
        const pixelArea = Math.abs(area / 2.0);
        return pixelArea / (this.scaleRatio * this.scaleRatio);
    },
    
    dispatchMeasurement: function(val, type) {
        // Broadcast custom event so app.js can catch it and populate active inputs
        const event = new CustomEvent('takeoff-complete', {
            detail: { value: val, type: type }
        });
        window.dispatchEvent(event);
    },
    
    clearDrawings: function() {
        this.drawings = [];
        this.points = [];
        this.calibPoints = [];
        this.draw();
    }
};
