(function(){
    const fileInput = document.getElementById('fileInput');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 对外暴露全局对象
    window.ImageConverter = {
        onConvertComplete: null,
        openImageSelector: function(){
            fileInput.click();
        }
    };

    fileInput.addEventListener('change', function(e){
        const file = e.target.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = function(event){
            const img = new Image();
            img.onload = function(){
                const size = window.CURRENT_GRID_SIZE || 50;
                canvas.width = size;
                canvas.height = size;
                ctx.clearRect(0,0,size,size);
                ctx.drawImage(img, 0, 0, size, size);

                const imageData = ctx.getImageData(0,0,size,size);
                const data = imageData.data;
                const colorList = window.MARD_COLOR_LIST;
                const resultMatrix = [];

                for(let y = 0; y < size; y++){
                    resultMatrix[y] = [];
                    for(let x = 0; x < size; x++){
                        const idx = (y * size + x) * 4;
                        const r = data[idx];
                        const g = data[idx+1];
                        const b = data[idx+2];

                        // 就近匹配色库颜色
                        let minDis = Infinity;
                        let targetColor = {r:255,g:255,b:255};
                        colorList.forEach(c=>{
                            const dis = Math.pow(r-c.r,2) + Math.pow(g-c.g,2) + Math.pow(b-c.b,2);
                            if(dis < minDis){
                                minDis = dis;
                                targetColor = c;
                            }
                        });
                        resultMatrix[y][x] = targetColor;
                    }
                }

                // 回调主逻辑
                if(window.ImageConverter.onConvertComplete){
                    window.ImageConverter.onConvertComplete(resultMatrix);
                }

                // 重置文件输入
                fileInput.value = '';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 加载/隐藏loading（修复引号）
    function showLoading(flag){
        const loading = document.getElementById('loading');
        if(loading){
            loading.style.display = flag ? 'block' : 'none';
        }
    }
})();
