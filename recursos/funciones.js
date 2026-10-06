
        let html5QrCode = null;
        let isScanning = false;
        let camerasList = [];
        let currentCameraIndex = 0;
        let currentGenType = 'text';
        let currentHistoryFilter = 'all';
        let recentResultText = '';
        let generatedQrInstance = null;

        const STORAGE_KEY = 'qr_master_pwa_history_v1';
        const THEME_KEY = 'qr_master_pwa_theme';

        document.addEventListener("DOMContentLoaded", () => {
            initTheme();
            renderHistory();
        });

        function initTheme() {
            const saved = localStorage.getItem(THEME_KEY);
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (saved === 'dark' || (!saved && prefersDark)) {
                document.documentElement.classList.add('dark');
                updateThemeIcon(true);
            } else {
                document.documentElement.classList.remove('dark');
                updateThemeIcon(false);
            }
        }

        function toggleTheme() {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
            updateThemeIcon(isDark);
        }

        function updateThemeIcon(isDark) {
            const icon = document.getElementById('themeIcon');
            if(icon) {
                icon.className = isDark ? 'fa-solid fa-sun text-amber-400 text-sm' : 'fa-solid fa-moon text-slate-700 text-sm';
            }
        }

        function showToast(message, icon = 'fa-circle-info') {
            const toast = document.getElementById('androidToast');
            const msg = document.getElementById('toastMessage');
            const ico = document.getElementById('toastIcon');
            if(!toast) return;

            msg.textContent = message;
            ico.className = `fa-solid ${icon} text-m3-darkPrimary dark:text-m3-primary`;

            toast.classList.remove('opacity-0', 'pointer-events-none');
            toast.classList.add('opacity-100');

            setTimeout(() => {
                toast.classList.remove('opacity-100');
                toast.classList.add('opacity-0', 'pointer-events-none');
            }, 2500);
        }

        function switchTab(tabName) {
            if(tabName !== 'Scan' && isScanning) {
                stopScanner();
            }

            ['Scan', 'Generate', 'History'].forEach(t => {
                const section = document.getElementById(`tab${t}`);
                const btn = document.getElementById(`nav-${t}`);
                if(section) section.classList.add('hidden');
                if(btn) {
                    const pill = btn.querySelector('.nav-pill');
                    const txt = btn.querySelector('span');
                    pill.className = 'nav-pill w-12 h-8 rounded-full flex items-center justify-center text-m3-onSurfaceVariant dark:text-m3-darkOnSurfaceVariant transition-all duration-200';
                    txt.className = 'text-[11px] font-medium mt-1 text-m3-onSurfaceVariant dark:text-m3-darkOnSurfaceVariant';
                }
            });

            const activeSec = document.getElementById(`tab${tabName}`);
            const activeBtn = document.getElementById(`nav-${tabName}`);
            if(activeSec) activeSec.classList.remove('hidden');
            if(activeBtn) {
                const pill = activeBtn.querySelector('.nav-pill');
                const txt = activeBtn.querySelector('span');
                pill.className = 'nav-pill w-12 h-8 rounded-full flex items-center justify-center bg-m3-primaryContainer text-m3-onPrimaryContainer dark:bg-m3-darkPrimaryContainer dark:text-m3-darkOnDarkPrimaryContainer transition-all duration-200';
                txt.className = 'text-[11px] font-semibold mt-1 text-m3-onSurface dark:text-m3-darkOnSurface';
            }

            if(tabName === 'History') renderHistory();
        }

        async function startScanner() {
            try {
                if(!html5QrCode) {
                    html5QrCode = new Html5Qrcode("qr-reader");
                }
                camerasList = await Html5Qrcode.getCameras();
                if(!camerasList || camerasList.length === 0) {
                    showToast("No se detectó cámara", "fa-triangle-exclamation");
                    return;
                }

                currentCameraIndex = camerasList.findIndex(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('trasera'));
                if(currentCameraIndex === -1) currentCameraIndex = 0;

                const selectedCamId = camerasList[currentCameraIndex].id;

                document.getElementById('scannerPlaceholder').classList.add('hidden');
                document.getElementById('startScanBtn').classList.add('hidden');
                document.getElementById('stopScanBtn').classList.remove('hidden');
                if(camerasList.length > 1) {
                    document.getElementById('cameraControls').classList.remove('hidden');
                }

                await html5QrCode.start(
                    selectedCamId,
                    { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
                    onScanSuccess,
                    () => {}
                );

                isScanning = true;
                showToast("Cámara iniciada", "fa-camera");
            } catch (err) {
                console.error(err);
                showToast("Error de acceso a cámara", "fa-triangle-exclamation");
            }
        }

        async function stopScanner() {
            if(html5QrCode && isScanning) {
                await html5QrCode.stop();
                isScanning = false;
                document.getElementById('scannerPlaceholder').classList.remove('hidden');
                document.getElementById('startScanBtn').classList.remove('hidden');
                document.getElementById('stopScanBtn').classList.add('hidden');
                document.getElementById('cameraControls').classList.add('hidden');
            }
        }

        async function switchCamera() {
            if(camerasList.length < 2) return;
            currentCameraIndex = (currentCameraIndex + 1) % camerasList.length;
            await stopScanner();
            startScanner();
        }

        function onScanSuccess(decodedText) {
            if(navigator.vibrate) navigator.vibrate(100);
            recentResultText = decodedText;
            saveToHistory(decodedText);
            displayRecentResult(decodedText);
            showToast("¡QR Detectado!", "fa-circle-check");
        }

        function scanFromFile(event) {
            const file = event.target.files[0];
            if(!file) return;
            if(!html5QrCode) html5QrCode = new Html5Qrcode("qr-reader");

            html5QrCode.scanFile(file, true)
                .then(text => {
                    recentResultText = text;
                    saveToHistory(text);
                    displayRecentResult(text);
                    showToast("QR leído desde imagen", "fa-image");
                })
                .catch(() => {
                    showToast("No se halló código QR válido", "fa-circle-xmark");
                });
        }

        function displayRecentResult(text) {
            const card = document.getElementById('recentResultCard');
            const textEl = document.getElementById('recentText');
            const actionBtn = document.getElementById('recentActionBtn');
            const badge = document.getElementById('recentCategoryBadge');

            const category = detectCategory(text);
            textEl.textContent = text;
            badge.textContent = category.toUpperCase();

            if(category === 'url') actionBtn.classList.remove('hidden');
            else actionBtn.classList.add('hidden');

            card.classList.remove('hidden');
        }

        function copyRecentText() {
            if(!recentResultText) return;
            navigator.clipboard.writeText(recentResultText).then(() => {
                showToast("Texto copiado", "fa-copy");
            });
        }

        function openRecentLink() {
            if(!recentResultText) return;
            let url = recentResultText;
            if(!/^https?:\/\//i.test(url)) url = 'http://' + url;
            window.open(url, '_blank');
        }

        function setGenType(type) {
            currentGenType = type;
            ['text', 'wifi', 'contact'].forEach(t => {
                const btn = document.getElementById(`genChip-${t}`);
                if(btn) {
                    if(t === type) {
                        btn.className = 'gen-chip px-3.5 py-1.5 rounded-full font-medium bg-m3-primary text-m3-onPrimary dark:bg-m3-darkPrimary dark:text-m3-darkOnPrimary whitespace-nowrap m3-ripple';
                    } else {
                        btn.className = 'gen-chip px-3.5 py-1.5 rounded-full font-medium bg-m3-surfaceVariant text-m3-onSurfaceVariant dark:bg-m3-darkSurfaceVariant dark:text-m3-darkOnSurfaceVariant whitespace-nowrap m3-ripple';
                    }
                }
            });

            const container = document.getElementById('genFormContainer');
            if(type === 'text') {
                container.innerHTML = `
                    <div class="space-y-1">
                        <label class="text-[11px] font-medium text-m3-onSurfaceVariant dark:text-m3-darkOnSurfaceVariant px-1">Texto o Enlace Web</label>
                        <textarea id="genInputText" rows="3" placeholder="https://mi-sitio.com o nota..." class="w-full p-3 bg-m3-surface dark:bg-m3-darkSurface border border-m3-outline/40 rounded-2xl text-xs outline-none focus:border-m3-primary focus:border-2 transition resize-none"></textarea>
                    </div>
                `;
            } else if(type === 'wifi') {
                container.innerHTML = `
                    <div class="space-y-2">
                        <div>
                            <label class="text-[11px] font-medium text-m3-onSurfaceVariant dark:text-m3-darkOnSurfaceVariant px-1">Nombre de Red (SSID)</label>
                            <input type="text" id="wifiSsid" placeholder="MiRedWiFi" class="w-full p-2.5 bg-m3-surface dark:bg-m3-darkSurface border border-m3-outline/40 rounded-xl text-xs outline-none focus:border-m3-primary focus:border-2">
                        </div>
                        <div>
                            <label class="text-[11px] font-medium text-m3-onSurfaceVariant dark:text-m3-darkOnSurfaceVariant px-1">Contraseña</label>
                            <input type="text" id="wifiPass" placeholder="Clave123" class="w-full p-2.5 bg-m3-surface dark:bg-m3-darkSurface border border-m3-outline/40 rounded-xl text-xs outline-none focus:border-m3-primary focus:border-2">
                        </div>
                    </div>
                `;
            } else if(type === 'contact') {
                container.innerHTML = `
                    <div class="space-y-2">
                        <div>
                            <label class="text-[11px] font-medium text-m3-onSurfaceVariant dark:text-m3-darkOnSurfaceVariant px-1">Nombre Completo</label>
                            <input type="text" id="contactName" placeholder="Juan Pérez" class="w-full p-2.5 bg-m3-surface dark:bg-m3-darkSurface border border-m3-outline/40 rounded-xl text-xs outline-none focus:border-m3-primary focus:border-2">
                        </div>
                        <div>
                            <label class="text-[11px] font-medium text-m3-onSurfaceVariant dark:text-m3-darkOnSurfaceVariant px-1">Teléfono</label>
                            <input type="tel" id="contactPhone" placeholder="+34600000000" class="w-full p-2.5 bg-m3-surface dark:bg-m3-darkSurface border border-m3-outline/40 rounded-xl text-xs outline-none focus:border-m3-primary focus:border-2">
                        </div>
                    </div>
                `;
            }
        }

        function generateQRCode() {
            let finalString = '';
            if(currentGenType === 'text') {
                const val = document.getElementById('genInputText').value.trim();
                if(!val) { showToast("Ingresa texto o URL", "fa-triangle-exclamation"); return; }
                finalString = val;
            } else if(currentGenType === 'wifi') {
                const ssid = document.getElementById('wifiSsid').value.trim();
                const pass = document.getElementById('wifiPass').value.trim();
                if(!ssid) { showToast("Ingresa el SSID de la red", "fa-triangle-exclamation"); return; }
                finalString = `WIFI:S:${ssid};T:WPA;P:${pass};;`;
            } else if(currentGenType === 'contact') {
                const name = document.getElementById('contactName').value.trim();
                const phone = document.getElementById('contactPhone').value.trim();
                if(!name) { showToast("Ingresa el nombre del contacto", "fa-triangle-exclamation"); return; }
                finalString = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL:${phone}\nEND:VCARD`;
            }

            const qrContainer = document.getElementById('qrcode');
            qrContainer.innerHTML = '';
            generatedQrInstance = new QRCode(qrContainer, {
                text: finalString,
                width: 180,
                height: 180,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            document.getElementById('generatedCard').classList.remove('hidden');
            saveToHistory(finalString);
            showToast("Código QR generado con éxito", "fa-qrcode");
        }

        function downloadQRCode() {
            const img = document.querySelector('#qrcode img');
            if(!img) return;
            const a = document.createElement('a');
            a.download = 'qr_master_code.png';
            a.href = img.src;
            a.click();
            showToast("Descargando imagen...", "fa-download");
        }

        function shareQRCode() {
            const img = document.querySelector('#qrcode img');
            if(!img) return;
            if(navigator.share) {
                fetch(img.src)
                    .then(res => res.blob())
                    .then(blob => {
                        const file = new File([blob], 'qrcode.png', { type: 'image/png' });
                        navigator.share({ title: 'QR Master', files: [file] }).catch(() => {});
                    });
            } else {
                showToast("Compartir no soportado en este navegador", "fa-triangle-exclamation");
            }
        }

        function detectCategory(content) {
            if(/^https?:\/\//i.test(content) || content.includes('.')) return 'url';
            if(content.startsWith('WIFI:')) return 'wifi';
            return 'text';
        }

        function getHistory() {
            try {
                return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            } catch(e) {
                return [];
            }
        }

        function saveToHistory(content) {
            let history = getHistory();
            if(history.length > 0 && history[0].content === content) return;

            const newItem = {
                id: Date.now(),
                content: content,
                category: detectCategory(content),
                timestamp: new Date().toLocaleString()
            };
            history.unshift(newItem);
            if(history.length > 100) history.pop();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        }

        function deleteHistoryItem(id) {
            let history = getHistory().filter(i => i.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
            renderHistory();
            showToast("Registro eliminado", "fa-trash-can");
        }

        function clearHistory() {
            localStorage.removeItem(STORAGE_KEY);
            renderHistory();
            showToast("Historial borrado", "fa-trash-can");
        }

        function filterHistory(cat) {
            currentHistoryFilter = cat;
            ['all', 'url', 'wifi', 'text'].forEach(t => {
                const btn = document.getElementById(`histChip-${t}`);
                if(btn) {
                    if(t === cat) {
                        btn.className = 'hist-chip px-3.5 py-1.5 rounded-full font-medium bg-m3-primary text-m3-onPrimary dark:bg-m3-darkPrimary dark:text-m3-darkOnPrimary whitespace-nowrap m3-ripple';
                    } else {
                        btn.className = 'hist-chip px-3.5 py-1.5 rounded-full font-medium bg-m3-surfaceVariant text-m3-onSurfaceVariant dark:bg-m3-darkSurfaceVariant dark:text-m3-darkOnSurfaceVariant whitespace-nowrap m3-ripple';
                    }
                }
            });
            renderHistory();
        }

        function renderHistory() {
            const listEl = document.getElementById('historyList');
            const emptyEl = document.getElementById('emptyHistoryState');
            const searchInput = document.getElementById('historySearch');
            if(!listEl) return;

            let history = getHistory();
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

            if(currentHistoryFilter !== 'all') {
                history = history.filter(i => i.category === currentHistoryFilter);
            }
            if(searchTerm) {
                history = history.filter(i => i.content.toLowerCase().includes(searchTerm));
            }

            listEl.innerHTML = '';
            if(history.length === 0) {
                emptyEl.classList.remove('hidden');
                return;
            } else {
                emptyEl.classList.add('hidden');
            }

            history.forEach(item => {
                const card = document.createElement('div');
                card.className = 'p-3.5 bg-m3-surface dark:bg-m3-darkSurface rounded-3xl border border-m3-outline/20 flex flex-col space-y-2 shadow-sm';
                
                let icon = 'fa-align-left';
                if(item.category === 'url') icon = 'fa-link';
                if(item.category === 'wifi') icon = 'fa-wifi';

                card.innerHTML = `
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-m3-primaryContainer text-m3-onPrimaryContainer dark:bg-m3-darkPrimaryContainer dark:text-m3-darkOnDarkPrimaryContainer flex items-center gap-1">
                            <i class="fa-solid ${icon}"></i> ${item.category}
                        </span>
                        <span class="text-[10px] text-m3-onSurfaceVariant">${item.timestamp}</span>
                    </div>
                    <p class="text-xs font-mono break-all line-clamp-3">${escapeHtml(item.content)}</p>
                    <div class="flex justify-end gap-1.5 pt-1">
                        <button onclick="copyText('${escapeJs(item.content)}')" class="w-8 h-8 rounded-full bg-m3-surfaceVariant text-m3-onSurfaceVariant flex items-center justify-center text-xs m3-ripple" title="Copiar">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                        ${item.category === 'url' ? `
                            <button onclick="openUrl('${escapeJs(item.content)}')" class="w-8 h-8 rounded-full bg-m3-primaryContainer text-m3-onPrimaryContainer dark:bg-m3-darkPrimaryContainer dark:text-m3-darkOnDarkPrimaryContainer flex items-center justify-center text-xs m3-ripple" title="Abrir">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </button>
                        ` : ''}
                        <button onclick="deleteHistoryItem(${item.id})" class="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs m3-ripple" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
                listEl.appendChild(card);
            });
        }

        function exportHistoryJSON() {
            const data = getHistory();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qr_history_${Date.now()}.json`;
            a.click();
            showToast("Historial exportado en JSON", "fa-download");
        }

        function exportHistoryCSV() {
            const data = getHistory();
            if(data.length === 0) { showToast("Sin datos para exportar", "fa-triangle-exclamation"); return; }
            let csv = "ID,Fecha,Categoria,Contenido\n";
            data.forEach(i => {
                csv += `"${i.id}","${i.timestamp}","${i.category}","${i.content.replace(/"/g, '""')}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qr_history_${Date.now()}.csv`;
            a.click();
            showToast("Historial exportado en CSV", "fa-file-csv");
        }

        function importHistoryJSON(e) {
            const file = e.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    if(Array.isArray(parsed)) {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                        renderHistory();
                        showToast("Historial importado con éxito", "fa-upload");
                    } else {
                        showToast("Archivo JSON no válido", "fa-circle-xmark");
                    }
                } catch(err) {
                    showToast("Error procesando archivo", "fa-circle-xmark");
                }
            };
            reader.readAsText(file);
        }

        function copyText(txt) {
            navigator.clipboard.writeText(txt).then(() => showToast("Copiado al portapapeles", "fa-copy"));
        }

        function openUrl(url) {
            let target = url;
            if(!/^https?:\/\//i.test(target)) target = 'http://' + target;
            window.open(target, '_blank');
        }

        function escapeHtml(str) {
            return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        }

        function escapeJs(str) {
            return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        }
