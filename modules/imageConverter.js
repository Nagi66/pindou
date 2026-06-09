(function(){
    // 模块私有变量
    const mask = document.getElementById('mask');
    const loadingTip = document.getElementById('loadingTip');
    const previewCanvas = document.getElementById('previewCanvas');
    const cropBox = document.getElementById('cropBox');
    const confirmCrop = document.getElementById('confirmCrop');
    const cancelCrop = document.getElementById('cancelCrop');
    const fileInput = document.getElementById('fileInput');

    let originImg = null;
    let cropBoxDrag = false;
    let dragStartX = 0, dragStartY = 0;

    // ===================== 工具函数：RGB ↔ HSV 转换 =====================
    function rgbToHsv(r,g,b){
        r /= 255; g /= 255; b /= 255;
        let max = Math.max(r,g,b), min = Math.min(r,g,b);
        let h=0, s=0, v=max;
        let d = max - min;
        if(d !== 0) s = d / max;
        if(max === r) h = ((g - b) / d) % 6;
        else if(max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        if(h < 0) h += 360;
        return {h,s,v};
    }

    // 计算RGB色差（欧氏距离）
    function getColorDist(c1,c2){
        let dr = c1.r - c2.r;
        let dg = c1.g - c2.g;
        let db = c1.b - c2.b;
        return Math.sqrt(dr*dr + dg*dg + db*db);
    }

    // ===================== 1. 文件选择 & 图片加载 =====================
    function openFileSelect(){
        fileInput.value = '';
        fileInput.click();
    }

    function loadImage(file){
        if(!file.type.startsWith('image/')){
            alert('请选择图片文件');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e){
            const img = new Image();
            img.onload = function(){
                originImg = img;
                showCropModal();
                drawPreview();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ===================== 2. 正方形裁剪弹窗 & 拖拽 =====================
    function showCropModal(){
        mask.style.display = 'flex';
    }
    function hideCropModal(){
        mask.style.display = 'none';
    }

    // 绘制预览图
    function drawPreview(){
        const ctx = previewCanvas.getContext('2d');
        const w = previewCanvas.width = previewCanvas.offsetWidth;
        const h = previewCanvas.height = previewCanvas.offsetHeight;
        ctx.clearRect(0,0,w,h);
        ctx.drawImage(originImg,0,0,w,h);
    }

    // 裁剪框拖拽
    cropBox.addEventListener('mousedown',e=>{
        cropBoxDrag = true;
        dragStartX = e.clientX - cropBox.offsetLeft;
        dragStartY = e.clientY - cropBox.offsetTop;
    });
    document.addEventListener('mousemove',e=>{
        if(!cropBoxDrag) return;
        let l = e.clientX - dragStartX;
        let t = e.clientY - dragStartY;
        const parentW = previewCanvas.offsetWidth;
        const boxW = cropBox.offsetWidth;
        l = Math.max(0, Math.min(l, parentW - boxW));
        t = Math.max(0, Math.min(t, parentW - boxW));
        cropBox.style.left = l + 'px';
        cropBox.style.top = t + 'px';
    });
    document.addEventListener('mouseup',()=> cropBoxDrag = false);

    // 取消裁剪
    cancelCrop.addEventListener('click', hideCropModal);

    // ===================== 3. 执行裁剪 + 保形缩放（最近邻插值） =====================
    function getCropImageData(){
        const ctx = previewCanvas.getContext('2d');
        const boxL = parseInt(cropBox.style.left);
        const boxT = parseInt(cropBox.style.top);
        const boxS = cropBox.offsetWidth;
        // 截取正方形选区
        return ctx.getImageData(boxL, boxT, boxS, boxS);
    }

    // 最近邻插值缩放
    function scaleNearest(imgData, targetSize){
        const srcW = imgData.width;
        const srcH = imgData.height;
        const dstW = targetSize;
        const dstH = targetSize;
        const dstData = new ImageData(dstW, dstH);
        const srcPix = imgData.data;
        const dstPix = dstData.data;

        for(let y=0; y<dstH; y++){
            for(let x=0; x<dstW; x++){
                const srcX = Math.floor(x * srcW / dstW);
                const srcY = Math.floor(y * srcH / dstH);
                const srcIdx = (srcY * srcW + srcX) * 4;
                const dstIdx = (y * dstW + x) * 4;
                dstPix[dstIdx] = srcPix[srcIdx];
                dstPix[dstIdx+1] = srcPix[srcIdx+1];
                dstPix[dstIdx+2] = srcPix[dstIdx+2];
                dstPix[dstIdx+3] = srcPix[srcIdx+3];
            }
        }
        return dstData;
    }

    // 简单形态学：单像素空洞填充 + 基础降噪
    function repairPixel(imgData, size){
        const w = size, h = size;
        const data = [...imgData.data];
        const getIdx = (x,y) => (y*w + x)*4;

        for(let y=1; y<h-1; y++){
            for(let x=1; x<w-1; x++){
                const idx = getIdx(x,y);
                // 4邻域
                const up = getIdx(x,y-1);
                const down = getIdx(x,y+1);
                const left = getIdx(x-1,y);
                const right = getIdx(x+1,y);
                // 被同色包围的单白点填充（简易补洞）
                if(data[idx] === 255 && data[up] === 0 && data[down] === 0 && data[left] === 0 && data[right] === 0){
                    data[idx] = 0;
                    data[idx+1] = 0;
                    data[idx+2] = 0;
                }
            }
        }
        imgData.data.set(data);
        return imgData;
    }

    // ===================== 4. 匹配漫漫色库 =====================
    function matchMardColor(imgData){
        const colorList = window.MARD_COLOR_LIST;
        const w = imgData.width;
        const h = imgData.height;
        const data = imgData.data;
        const result = [];

        for(let y=0; y<h; y++){
            result[y] = [];
            for(let x=0; x<w; x++){
                const idx = (y*w + x)*4;
                const r = data[idx];
                const g = data[idx+1];
                const b = data[idx+2];
                const nowColor = {r,g,b};
                // 找色差最小色
                let minDist = Infinity;
                let bestColor = colorList[0];
                colorList.forEach(c=>{
                    const d = getColorDist(nowColor, c);
                    if(d < minDist){
                        minDist = d;
                        bestColor = c;
                    }
                });
                result[y][x] = {r:bestColor.r, g:bestColor.g, b:bestColor.b};
            }
        }
        return result;
    }

    // ===================== 5. HSV聚类 + 简易特征保护 =====================
    function colorCluster(matrix){
        const size = matrix.length;
        // 统计颜色出现频次
        const colorCount = new Map();
        const colorPos = new Map();
        for(let y=0; y<size; y++){
            for(let x=0; x<size; x++){
                const c = matrix[y][x];
                const key = `${c.r},${c.g},${c.b}`;
                colorCount.set(key, (colorCount.get(key)||0)+1);
                if(!colorPos.has(key)) colorPos.set(key, []);
                colorPos.get(key).push({x,y});
            }
        }

        // 聚类阈值
        const H_THRESH = 15;
        const V_THRESH = 0.15;
        const grouped = [];
        const used = new Set();

        // 贪心聚类
        colorCount.forEach((cnt, key)=>{
            if(used.has(key)) return;
            const [r,g,b] = key.split(',').map(Number);
            const hsv = rgbToHsv(r,g,b);
            const group = [key];

            colorCount.forEach((_, k2)=>{
                if(used.has(k2) || k2 === key) return;
                const [r2,g2,b2] = k2.split(',').map(Number);
                const hsv2 = rgbToHsv(r2,g2,b2);
                if(Math.abs(hsv.h - hsv2.h) < H_THRESH && Math.abs(hsv.v - hsv2.v) < V_THRESH){
                    group.push(k2);
                    used.add(k2);
                }
            });
            grouped.push(group);
            used.add(key);
        });

        // 每组保留频次最高主色
        const mainColorMap = new Map();
        grouped.forEach(g=>{
            let maxCnt = 0;
            let mainKey = g[0];
            g.forEach(k=>{
                if(colorCount.get(k) > maxCnt){
                    maxCnt = colorCount.get(k);
                    mainKey = k;
                }
            });
            g.forEach(k=> mainColorMap.set(k, mainKey));
        });

        // 重绘矩阵 + 特征保护：像素<=5 保留原色
        const finalMatrix = JSON.parse(JSON.stringify(matrix));
        for(let y=0; y<size; y++){
            for(let x=0; x<size; x++){
                const c = matrix[y][x];
                const key = `${c.r},${c.g},${c.b}`;
                const cnt = colorCount.get(key);
                // 像素数<=5 作为特征色，不合并
                if(cnt <= 5) continue;

                const mainKey = mainColorMap.get(key);
                const [mr,mg,mb] = mainKey.split(',').map(Number);
                finalMatrix[y][x] = {r:mr, g:mg, b:mb};
            }
        }
        return finalMatrix;
    }

    // ===================== 主流程：裁剪确认后执行全链路 =====================
    confirmCrop.addEventListener('click', function(){
        hideCropModal();
        loadingTip.style.display = 'block';
        const targetSize = window.CURRENT_GRID_SIZE;

        // 1. 获取裁剪图像
        const cropImgData = getCropImageData();
        // 2. 最近邻缩放
        const scaleData = scaleNearest(cropImgData, targetSize);
        // 3. 轮廓/空洞修复
        const repairData = repairPixel(scaleData, targetSize);
        // 4. 匹配漫漫色库
        let colorMatrix = matchMardColor(repairData);
        // 5. HSV聚类精简 + 特征保护
        colorMatrix = colorCluster(colorMatrix);

        // 回调传给主页面
        if(typeof ImageConverter.onConvertComplete === 'function'){
            ImageConverter.onConvertComplete(colorMatrix);
        }
        loadingTip.style.display = 'none';
    });

    // ===================== 对外公开接口 =====================
    window.ImageConverter = {
        onConvertComplete: null,
        openImageSelector: openFileSelect
    };

    // 文件选择监听
    fileInput.addEventListener('change', e=>{
        const file = e.target.files[0];
        if(file) loadImage(file);
    });
})();
