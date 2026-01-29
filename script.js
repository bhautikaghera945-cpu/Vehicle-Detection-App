document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const imageInput = document.getElementById('imageInput');
    const selectImageBtn = document.getElementById('selectImageBtn');
    const uploadArea = document.getElementById('uploadArea');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    const clearImageBtn = document.getElementById('clearImageBtn');
    const detectBtn = document.getElementById('detectBtn');
    const confidenceThreshold = document.getElementById('confidenceThreshold');
    const overlapThreshold = document.getElementById('overlapThreshold');
    const confidenceValue = document.getElementById('confidenceValue');
    const overlapValue = document.getElementById('overlapValue');
    const apiKeyInput = document.getElementById('apiKey');
    const toggleApiKey = document.getElementById('toggleApiKey');
    const resultsPlaceholder = document.getElementById('resultsPlaceholder');
    const resultsContent = document.getElementById('resultsContent');
    const totalVehicles = document.getElementById('totalVehicles');
    const avgConfidence = document.getElementById('avgConfidence');
    const processingTime = document.getElementById('processingTime');
    const processedImage = document.getElementById('processedImage');
    const processingLoader = document.getElementById('processingLoader');
    const vehicleBreakdown = document.getElementById('vehicleBreakdown');
    const imageSizeInfo = document.getElementById('imageSizeInfo');
    const fileSizeWarning = document.getElementById('fileSizeWarning');

    // API Configuration
    const API_URL = 'https://serverless.roboflow.com/vehical-detection-and-counts/workflows/detect-count-and-visualize-2';

    // State
    let currentImageFile = null;
    let currentImageUrl = '';
    let currentDetections = [];
    let zoomState = {
        scale: 1,
        translateX: 0,
        translateY: 0,
        isDragging: false,
        startX: 0,
        startY: 0
    };

    // Event Listeners
    selectImageBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageSelect);
    clearImageBtn.addEventListener('click', clearImage);
    detectBtn.addEventListener('click', detectVehicles);
    confidenceThreshold.addEventListener('input', updateConfidenceValue);
    overlapThreshold.addEventListener('input', updateOverlapValue);
    toggleApiKey.addEventListener('click', toggleApiKeyVisibility);

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        uploadArea.classList.add('drag-over');
    }

    function unhighlight() {
        uploadArea.classList.remove('drag-over');
    }

    uploadArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleImageFile(files[0]);
        }
    }

    // Functions
    function handleImageSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    }

    function handleImageFile(file) {
        currentImageFile = file;
        
        // Show warning for large files
        if (file.size > 10 * 1024 * 1024) { // 10MB
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            fileSizeWarning.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Large file (${sizeMB}MB) - Processing may take longer`;
            fileSizeWarning.classList.add('show');
        } else {
            fileSizeWarning.classList.remove('show');
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            currentImageUrl = e.target.result;
            previewImage.src = currentImageUrl;
            imagePreview.style.display = 'block';
            uploadArea.style.display = 'none';
        };
        
        reader.readAsDataURL(file);
    }

    function clearImage() {
        currentImageFile = null;
        currentImageUrl = '';
        currentDetections = [];
        imageInput.value = '';
        previewImage.src = '';
        imagePreview.style.display = 'none';
        uploadArea.style.display = 'block';
        resultsContent.style.display = 'none';
        resultsPlaceholder.style.display = 'block';
        fileSizeWarning.classList.remove('show');
    }

    function updateConfidenceValue() {
        confidenceValue.textContent = confidenceThreshold.value;
    }

    function updateOverlapValue() {
        overlapValue.textContent = overlapThreshold.value;
    }

    function toggleApiKeyVisibility() {
        const type = apiKeyInput.getAttribute('type');
        apiKeyInput.setAttribute('type', type === 'password' ? 'text' : 'password');
        toggleApiKey.innerHTML = type === 'password' ? 
            '<i class="fas fa-eye-slash"></i>' : 
            '<i class="fas fa-eye"></i>';
    }

    async function detectVehicles() {
        if (!currentImageFile) {
            alert('Please select an image first');
            return;
        }

        // Show processing loader
        processingLoader.style.display = 'flex';
        resultsPlaceholder.style.display = 'none';
        resultsContent.style.display = 'block';
        
        // Reset previous results
        totalVehicles.textContent = '0';
        avgConfidence.textContent = '0%';
        processingTime.textContent = '0s';
        processedImage.src = '';
        vehicleBreakdown.innerHTML = '';
        imageSizeInfo.textContent = '';
        currentDetections = [];
        zoomState = { scale: 1, translateX: 0, translateY: 0, isDragging: false, startX: 0, startY: 0 };

        try {
            const startTime = Date.now();
            
            // Convert image to base64
            const base64Image = await fileToBase64(currentImageFile);
            
            // Prepare request body
            const requestBody = {
                api_key: apiKeyInput.value.trim(),
                inputs: {
                    image: {
                        type: "base64",
                        value: base64Image.split(',')[1]
                    }
                }
            };

            // Make API request
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const result = await response.json();
            const endTime = Date.now();
            const processingDuration = ((endTime - startTime) / 1000).toFixed(2);

            // Display results
            displayResults(result, processingDuration, base64Image);

        } catch (error) {
            console.error('Detection error:', error);
            alert(`Error detecting vehicles: ${error.message}`);
        } finally {
            // Hide loader
            processingLoader.style.display = 'none';
        }
    }

    function displayResults(result, processingDuration, originalImage) {
        // Update statistics
        processingTime.textContent = `${processingDuration}s`;
        
        // Check if the result has outputs array
        if (result.outputs && Array.isArray(result.outputs) && result.outputs.length > 0) {
            const data = result.outputs[0];
            
            // Display total count
            totalVehicles.textContent = data.count_objects || '0';
            
            // Display processed image with bounding boxes
            if (data.output_image && data.output_image.value) {
                processedImage.src = `data:image/jpeg;base64,${data.output_image.value}`;
                
                // When image loads, set up zoom and display size
                processedImage.onload = function() {
                    enhanceImageDisplay();
                    
                    // Update image size info
                    if (data.predictions && data.predictions.image) {
                        imageSizeInfo.textContent = 
                            `${data.predictions.image.width} × ${data.predictions.image.height}px`;
                    } else {
                        imageSizeInfo.textContent = 
                            `${this.naturalWidth} × ${this.naturalHeight}px`;
                    }
                };
            } else {
                processedImage.src = originalImage;
                processedImage.onload = function() {
                    enhanceImageDisplay();
                    imageSizeInfo.textContent = `${this.naturalWidth} × ${this.naturalHeight}px`;
                };
            }
            
            // Store detections for detailed view
            if (data.predictions && data.predictions.predictions && Array.isArray(data.predictions.predictions)) {
                currentDetections = data.predictions.predictions;
                
                // Calculate average confidence
                if (currentDetections.length > 0) {
                    const avgConf = currentDetections.reduce((sum, pred) => sum + (pred.confidence || 0), 0) / currentDetections.length;
                    avgConfidence.textContent = `${(avgConf * 100).toFixed(1)}%`;
                }
                
                // Group vehicles by class
                const vehicleCounts = {};
                currentDetections.forEach(pred => {
                    const className = pred.class || 'Unknown';
                    vehicleCounts[className] = (vehicleCounts[className] || 0) + 1;
                });
                
                // Display vehicle breakdown
                displayVehicleBreakdown(vehicleCounts);
                
            } else {
                avgConfidence.textContent = 'N/A';
                vehicleBreakdown.innerHTML = '<p class="no-vehicles">No detailed prediction data available</p>';
            }
        } else if (Array.isArray(result) && result.length > 0) {
            // Handle alternative response format
            const data = result[0];
            totalVehicles.textContent = data.count_objects || '0';
            
            if (data.output_image && data.output_image.value) {
                processedImage.src = `data:image/jpeg;base64,${data.output_image.value}`;
                processedImage.onload = function() {
                    enhanceImageDisplay();
                    imageSizeInfo.textContent = `${this.naturalWidth} × ${this.naturalHeight}px`;
                };
            } else {
                processedImage.src = originalImage;
                processedImage.onload = function() {
                    enhanceImageDisplay();
                    imageSizeInfo.textContent = `${this.naturalWidth} × ${this.naturalHeight}px`;
                };
            }
            
            if (data.predictions && data.predictions.predictions) {
                currentDetections = data.predictions.predictions;
                const avgConf = currentDetections.reduce((sum, pred) => sum + (pred.confidence || 0), 0) / currentDetections.length;
                avgConfidence.textContent = `${(avgConf * 100).toFixed(1)}%`;
            }
        } else {
            // Fallback to original image
            processedImage.src = originalImage;
            processedImage.onload = function() {
                enhanceImageDisplay();
                imageSizeInfo.textContent = `${this.naturalWidth} × ${this.naturalHeight}px`;
            };
            avgConfidence.textContent = 'N/A';
            vehicleBreakdown.innerHTML = '<p class="no-vehicles">No detailed prediction data available</p>';
        }
    }

    function enhanceImageDisplay() {
        const imgContainer = document.querySelector('.image-wrapper');
        const img = processedImage;
        
        // Clear existing controls
        const existingControls = imgContainer.querySelectorAll('.zoom-controls, .zoom-level, .reset-zoom-btn, .fullscreen-btn, .zoom-btn');
        existingControls.forEach(control => control.remove());
        
        // Reset image styles
        img.style.transform = '';
        img.style.transformOrigin = '';
        img.style.cursor = 'default';
        imgContainer.classList.remove('zoomed', 'fullscreen');
        
        // Create zoom controls container
        const zoomControls = document.createElement('div');
        zoomControls.className = 'zoom-controls';
        
        // Zoom out button
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.className = 'zoom-btn';
        zoomOutBtn.innerHTML = '<i class="fas fa-search-minus"></i>';
        zoomOutBtn.title = 'Zoom Out';
        zoomOutBtn.onclick = () => zoomImage(0.8);
        
        // Zoom in button
        const zoomInBtn = document.createElement('button');
        zoomInBtn.className = 'zoom-btn';
        zoomInBtn.innerHTML = '<i class="fas fa-search-plus"></i>';
        zoomInBtn.title = 'Zoom In';
        zoomInBtn.onclick = () => zoomImage(1.2);
        
        // Zoom level display
        const zoomLevel = document.createElement('div');
        zoomLevel.className = 'zoom-level';
        zoomLevel.id = 'zoomLevel';
        zoomLevel.textContent = '100%';
        
        // Reset button
        const resetBtn = document.createElement('button');
        resetBtn.className = 'reset-zoom-btn';
        resetBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Reset View';
        resetBtn.onclick = resetImageZoom;
        
        // Fullscreen button
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.className = 'fullscreen-btn';
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
        fullscreenBtn.onclick = toggleFullscreen;
        
        // Add all controls
        zoomControls.appendChild(zoomOutBtn);
        zoomControls.appendChild(zoomInBtn);
        imgContainer.appendChild(zoomControls);
        imgContainer.appendChild(zoomLevel);
        imgContainer.appendChild(resetBtn);
        imgContainer.appendChild(fullscreenBtn);
        
        // Mouse wheel zoom
        img.onwheel = function(e) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1.2 : 0.8;
            zoomImage(delta);
        };
        
        // Mouse events for panning
        img.onmousedown = function(e) {
            if (zoomState.scale > 1) {
                zoomState.isDragging = true;
                zoomState.startX = e.clientX - zoomState.translateX;
                zoomState.startY = e.clientY - zoomState.translateY;
                img.style.cursor = 'grabbing';
            }
        };
        
        window.addEventListener('mousemove', function(e) {
            if (!zoomState.isDragging) return;
            e.preventDefault();
            zoomState.translateX = e.clientX - zoomState.startX;
            zoomState.translateY = e.clientY - zoomState.startY;
            updateImageTransform();
        });
        
        window.addEventListener('mouseup', function() {
            zoomState.isDragging = false;
            img.style.cursor = zoomState.scale > 1 ? 'grab' : 'default';
        });
        
        // Touch events for mobile
        let initialDistance = null;
        
        img.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                initialDistance = getTouchDistance(e.touches[0], e.touches[1]);
            }
        }, { passive: true });
        
        img.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
                const delta = currentDistance / initialDistance;
                zoomImage(delta);
                initialDistance = currentDistance;
            }
        }, { passive: false });
        
        // Fullscreen change listener
        document.addEventListener('fullscreenchange', function() {
            if (!document.fullscreenElement) {
                imgContainer.classList.remove('fullscreen');
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
            }
        });
        
        // Update zoom level display
        updateImageTransform();
    }

    function zoomImage(factor) {
        zoomState.scale *= factor;
        zoomState.scale = Math.min(Math.max(0.5, zoomState.scale), 5);
        updateImageTransform();
    }

    function updateImageTransform() {
        const img = processedImage;
        const zoomLevel = document.getElementById('zoomLevel');
        const imgContainer = document.querySelector('.image-wrapper');
        
        img.style.transform = `scale(${zoomState.scale}) translate(${zoomState.translateX}px, ${zoomState.translateY}px)`;
        img.style.transformOrigin = '0 0';
        
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(zoomState.scale * 100)}%`;
        }
        
        img.style.cursor = zoomState.scale > 1 ? 'grab' : 'default';
        
        if (zoomState.scale > 1) {
            imgContainer.classList.add('zoomed');
        } else {
            imgContainer.classList.remove('zoomed');
        }
    }

    function resetImageZoom() {
        zoomState.scale = 1;
        zoomState.translateX = 0;
        zoomState.translateY = 0;
        updateImageTransform();
        
        const imgContainer = document.querySelector('.image-wrapper');
        imgContainer.classList.remove('zoomed');
        imgContainer.classList.remove('fullscreen');
        document.exitFullscreen?.();
        
        const fullscreenBtn = document.querySelector('.fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
        }
    }

    function toggleFullscreen() {
        const imgContainer = document.querySelector('.image-wrapper');
        const fullscreenBtn = document.querySelector('.fullscreen-btn');
        
        if (!document.fullscreenElement) {
            imgContainer.classList.add('fullscreen');
            imgContainer.requestFullscreen?.().catch(err => {
                console.log(`Fullscreen error: ${err.message}`);
            });
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Exit Fullscreen';
            }
        } else {
            document.exitFullscreen?.();
            imgContainer.classList.remove('fullscreen');
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
            }
        }
    }

    function getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function displayVehicleBreakdown(vehicleCounts) {
        vehicleBreakdown.innerHTML = '';
        
        // Add header with toggle for details
        const header = document.createElement('div');
        header.className = 'breakdown-header';
        header.innerHTML = `
            <div class="breakdown-title">
                <i class="fas fa-list"></i>
                <span>Detected Vehicles (${Object.values(vehicleCounts).reduce((a, b) => a + b, 0)})</span>
            </div>
            <button class="btn-details-toggle" id="toggleDetailsBtn">
                <i class="fas fa-chevron-down"></i> Show Details
            </button>
        `;
        vehicleBreakdown.appendChild(header);
        
        // Add summary cards
        const summaryContainer = document.createElement('div');
        summaryContainer.className = 'breakdown-summary';
        summaryContainer.id = 'breakdownSummary';
        
        Object.entries(vehicleCounts).forEach(([className, count]) => {
            const item = document.createElement('div');
            item.className = 'breakdown-item';
            item.innerHTML = `
                <div class="vehicle-class">
                    <i class="fas ${getVehicleIcon(className)}"></i>
                    <span>${className.charAt(0).toUpperCase() + className.slice(1)}</span>
                </div>
                <div class="vehicle-count">${count}</div>
            `;
            summaryContainer.appendChild(item);
        });
        vehicleBreakdown.appendChild(summaryContainer);
        
        // Add detailed predictions container (hidden by default)
        if (currentDetections.length > 0) {
            const detailsContainer = document.createElement('div');
            detailsContainer.className = 'detection-details';
            detailsContainer.id = 'detectionDetails';
            detailsContainer.style.display = 'none';
            
            const detailsHeader = document.createElement('h5');
            detailsHeader.innerHTML = '<i class="fas fa-search"></i> Individual Detections';
            detailsContainer.appendChild(detailsHeader);
            
            // Sort detections by confidence (highest first)
            const sortedDetections = [...currentDetections].sort((a, b) => b.confidence - a.confidence);
            
            sortedDetections.forEach((detection, index) => {
                const detailItem = document.createElement('div');
                detailItem.className = 'detection-item';
                detailItem.innerHTML = `
                    <div class="detection-item-header">
                        <div class="detection-class">
                            <i class="fas ${getVehicleIcon(detection.class)}"></i>
                            <span>${detection.class.charAt(0).toUpperCase() + detection.class.slice(1)} #${index + 1}</span>
                        </div>
                        <div class="detection-confidence ${getConfidenceClass(detection.confidence)}">
                            ${(detection.confidence * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div class="detection-coordinates">
                        <div class="coordinate-item">
                            <span class="coordinate-label">Position:</span>
                            <span class="coordinate-value">(${detection.x.toFixed(0)}, ${detection.y.toFixed(0)})</span>
                        </div>
                        <div class="coordinate-item">
                            <span class="coordinate-label">Size:</span>
                            <span class="coordinate-value">${detection.width}×${detection.height}</span>
                        </div>
                        <div class="coordinate-item">
                            <span class="coordinate-label">Confidence:</span>
                            <span class="coordinate-value">${(detection.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div class="coordinate-item">
                            <span class="coordinate-label">ID:</span>
                            <span class="coordinate-value">${detection.detection_id.substring(0, 8)}...</span>
                        </div>
                    </div>
                `;
                detailsContainer.appendChild(detailItem);
            });
            
            vehicleBreakdown.appendChild(detailsContainer);
            
            // Add event listener for toggle button
            const toggleBtn = document.getElementById('toggleDetailsBtn');
            toggleBtn.addEventListener('click', function() {
                const details = document.getElementById('detectionDetails');
                const isVisible = details.style.display !== 'none';
                
                if (isVisible) {
                    details.style.display = 'none';
                    this.innerHTML = '<i class="fas fa-chevron-down"></i> Show Details';
                } else {
                    details.style.display = 'block';
                    this.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Details';
                }
            });
        }
    }

    function getVehicleIcon(className) {
        const icons = {
            'car': 'fa-car',
            'truck': 'fa-truck',
            'bus': 'fa-bus',
            'motorcycle': 'fa-motorcycle',
            'bicycle': 'fa-bicycle',
            'van': 'fa-shuttle-van',
            'train': 'fa-train',
            'boat': 'fa-ship',
            'person': 'fa-user',
            'unknown': 'fa-question-circle'
        };
        return icons[className.toLowerCase()] || 'fa-car';
    }

    function getConfidenceClass(confidence) {
        if (confidence >= 0.8) return 'confidence-high';
        if (confidence >= 0.5) return 'confidence-medium';
        return 'confidence-low';
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Initialize values
    updateConfidenceValue();
    updateOverlapValue();
});